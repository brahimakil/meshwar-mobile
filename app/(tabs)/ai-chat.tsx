import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../themes';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Location {
  id: string;
  name: string;
  description: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  categoryId: string;
  isActive: boolean;
  icon?: string;
  images?: string[];
}

interface Activity {
  id: string;
  title: string;
  description: string;
  ageGroup: string;
  difficulty: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  estimatedDuration: number;
  currentParticipants: number;
  locations: string[];
  tags: string[];
  isActive: boolean;
  isExpired: boolean;
}

interface Booking {
  id: string;
  activityId: string;
  userId: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { colors: themeColors } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user) {
      loadInitialData();
      addWelcomeMessage();
    }
  }, [user]);

  // Enhanced function to get place context from address and coordinates  
  const getEnhancedPlaceInfo = async (location: Location): Promise<{placeName: string, fullContext: string}> => {
    try {
      // Start with the address from database as primary
      const addressInfo = location.address || '';
      
      // Get additional place context from coordinates if available
      let coordinatePlaceName = '';
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data.city && data.countryName) {
          coordinatePlaceName = `${data.city}, ${data.locality ? data.locality + ', ' : ''}${data.countryName}`;
        } else if (data.locality && data.countryName) {
          coordinatePlaceName = `${data.locality}, ${data.countryName}`;
        }
      } catch (geocodingError) {
        console.log('Geocoding failed for coordinates, using address only');
      }

      // Combine address and coordinate info for comprehensive context
      let placeName = addressInfo || location.name;
      let fullContext = addressInfo;
      
      if (coordinatePlaceName && coordinatePlaceName !== addressInfo) {
        fullContext = addressInfo ? `${addressInfo} (${coordinatePlaceName})` : coordinatePlaceName;
      }

      return { 
        placeName: placeName || 'Unknown location', 
        fullContext: fullContext || 'Unknown location' 
      };
    } catch (error) {
      console.error('Error getting place info:', error);
      const fallback = location.address || location.name || 'Unknown location';
      return { placeName: fallback, fullContext: fallback };
    }
  };

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      
      // Load locations
      const locationsSnapshot = await getDocs(collection(db, 'locations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      setLocations(locationsData);
      console.log('Loaded locations:', locationsData.length);

      // ✅ UPDATED: Load only active, non-expired activities
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('isActive', '==', true),
        where('isExpired', '==', false)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activitiesData = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
      console.log('Loaded active, non-expired activities:', activitiesData.length);

      // Load user bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setUserBookings(bookingsData);
      console.log('Loaded bookings:', bookingsData.length);

      // Load user profile - no coordinate conversion needed
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        console.log('User profile loaded - Location:', userData.location);
      } else {
        console.log('User profile not found');
        setUserProfile(null);
      }

      // Enhance locations with place context from addresses
      console.log('Enhancing locations with address and place information...');
      const enhanced = await Promise.all(
        locationsData.map(async (location) => {
          console.log('Processing location:', location.name, 'Address:', location.address);
          
          const placeInfo = await getEnhancedPlaceInfo(location);
          
          return {
            ...location,
            placeName: placeInfo.placeName,
            fullPlaceContext: placeInfo.fullContext
          };
        })
      );
      
      console.log('Enhanced locations set:', enhanced.length);
      setLocations(enhanced);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: `Hello! I'm your AI assistant for exploring locations and activities. I can help you with:

🗺️ Finding locations and places based on addresses
📍 Recommending places in your area or specific locations
📅 Checking activity details and availability  
📝 Booking activities for you
📋 Checking your existing bookings
🔍 Answering questions about specific locations

Just ask me anything like:
• "What locations are available?"
• "Show me places in [area name]"  
• "What activities can I book?"
• "Find something near [location]"`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  // Simplified function to format location data with address context
  const formatLocationData = (locations: any[]) => {
    return locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      address: loc.address,
      placeName: loc.placeName || loc.address || loc.name,
      fullPlaceContext: loc.fullPlaceContext || loc.address || loc.name,
      coordinates: loc.coordinates,
      isActive: loc.isActive
    }));
  };

  const formatActivityData = (activities: Activity[]) => {
    return activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      startDate: activity.startDate instanceof Timestamp ? activity.startDate.toDate().toISOString() : activity.startDate,
      endDate: activity.endDate instanceof Timestamp ? activity.endDate.toDate().toISOString() : activity.endDate,
      startTime: activity.startTime,
      endTime: activity.endTime,
      estimatedCost: activity.estimatedCost,
      difficulty: activity.difficulty,
      ageGroup: activity.ageGroup,
      currentParticipants: activity.currentParticipants,
      locations: activity.locations,
      isActive: activity.isActive,
      isExpired: activity.isExpired,
      // ✅ ADDED: Include availability status for AI context
      availabilityStatus: activity.isActive && !activity.isExpired ? 'available' : 'unavailable'
    }));
  };

  const formatBookingData = (bookings: Booking[]) => {
    return bookings.map(booking => ({
      id: booking.id,
      activityId: booking.activityId,
      status: booking.status,
      createdAt: booking.createdAt instanceof Timestamp ? booking.createdAt.toDate().toISOString() : booking.createdAt
    }));
  };

  const createBooking = async (activityId: string) => {
    try {
      // ✅ UPDATED: Check database directly for existing bookings
      const existingBookingQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        where('activityId', '==', activityId)
      );
      
      const existingSnapshot = await getDocs(existingBookingQuery);
      if (!existingSnapshot.empty) {
        return { success: false, message: "You're already booked for this activity!" };
      }

      // Find the activity
      const activity = activities.find(a => a.id === activityId);
      if (!activity) {
        return { success: false, message: "Activity not found." };
      }

      if (!activity.isActive || activity.isExpired) {
        return { success: false, message: "This activity is no longer available for booking." };
      }

      // ✅ ADDED: Check participant limits (assuming reasonable defaults for now)
      // Note: You may want to add maxParticipants field to your Activity interface
      const maxParticipants = 50; // Default limit - should be configurable per activity
      if (activity.currentParticipants >= maxParticipants) {
        return { success: false, message: `Sorry, this activity is full! (${activity.currentParticipants}/${maxParticipants} participants)` };
      }

      // ✅ ADDED: Get current participant count from database to ensure accuracy
      const allBookingsQuery = query(
        collection(db, 'bookings'),
        where('activityId', '==', activityId),
        where('status', '==', 'confirmed')
      );
      const allBookingsSnapshot = await getDocs(allBookingsQuery);
      const currentBookingCount = allBookingsSnapshot.size;

      if (currentBookingCount >= maxParticipants) {
        return { success: false, message: `Sorry, this activity is full! (${currentBookingCount}/${maxParticipants} participants)` };
      }

      // Create booking
      const bookingRef = doc(collection(db, 'bookings'));
      await setDoc(bookingRef, {
        activityId: activityId,
        userId: user.uid,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local bookings state
      const newBooking: Booking = {
        id: bookingRef.id,
        activityId: activityId,
        userId: user.uid,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUserBookings(prev => [...prev, newBooking]);

      return { 
        success: true, 
        message: `Successfully booked "${activity.title}"! 🎉\n\nYou're participant ${currentBookingCount + 1}/${maxParticipants}. See you there!` 
      };
    } catch (error) {
      console.error('Booking failed:', error);
      return { success: false, message: "Failed to create booking. Please try again." };
    }
  };

  const callGeminiAPI = async (userMessage: string) => {
    try {
      const geminiApiKey = userProfile?.geminiApiKey;
      if (!geminiApiKey) {
        return "I need access to your Gemini API key to provide intelligent responses. Please add your API key in the 'More' tab under profile settings.";
      }

      // ✅ UPDATED: Include recent conversation context with better analysis
      const recentMessages = messages.slice(-8); // Last 8 messages for better context
      const conversationContext = recentMessages.map(msg => 
        `${msg.isUser ? 'User' : 'AI'}: ${msg.text}`
      ).join('\n');

      // ✅ ADDED: Analyze if there's an active booking discussion
      const lastAIMessage = recentMessages.filter(msg => !msg.isUser).pop()?.text || '';
      const isActiveBookingDiscussion = lastAIMessage.includes('Would you like to book') || 
                                      lastAIMessage.includes('book this activity') ||
                                      lastAIMessage.includes('confirm') ||
                                      lastAIMessage.includes('Just to confirm');

      const systemPrompt = `You are a helpful AI assistant for a location and activities booking app. You have access to the following data:

USER LOCATION: ${userProfile?.location || 'Not specified'} 
(This is where the user is located - use this as context for geographic recommendations)

AVAILABLE LOCATIONS:
${JSON.stringify(formatLocationData(locations), null, 2)}

AVAILABLE ACTIVITIES (Only active, non-expired activities):
${JSON.stringify(formatActivityData(activities), null, 2)}

USER'S CURRENT BOOKINGS:
${JSON.stringify(formatBookingData(userBookings), null, 2)}

RECENT CONVERSATION CONTEXT:
${conversationContext}

ACTIVE BOOKING DISCUSSION: ${isActiveBookingDiscussion ? 'YES - There is an active booking discussion' : 'NO - No active booking discussion'}

IMPORTANT CONTEXT:
- The user is located in: ${userProfile?.location || 'unknown location'}
- Each location includes its address and enhanced place context
- Use the address information to understand where locations are
- When the user asks for locations "near me" or "in my area", consider their location: ${userProfile?.location || 'unknown'}
- ALL ACTIVITIES shown are currently available for booking (active and not expired)
- Each activity shows currentParticipants - consider this when recommending activities

BOOKING GUIDELINES - CRITICAL RULES:
1. ONLY book an activity if there is an ACTIVE BOOKING DISCUSSION and the user explicitly confirms
2. An active booking discussion means you just asked "Would you like to book this activity?" or similar
3. If user says "yes please" to a general greeting or question, DO NOT book anything
4. If user says "yes please" after you specifically asked about booking an activity, then book it
5. Look at the RECENT CONVERSATION CONTEXT to understand what the user is responding to
6. When booking is confirmed, respond with: "BOOK_ACTIVITY:[activityId]"
7. If user uses strong language, acknowledge their frustration but still follow the booking rules
8. Only book when there's clear intent to book a specific activity that was just discussed

CONVERSATION FLOW RULES:
1. If user greets you or asks general questions, provide helpful information but don't book anything
2. If user asks about activities, show them options and ask if they want to book
3. If user confirms booking after you asked about it, then proceed with booking
4. If user says "yes" or "confirm" without an active booking discussion, ask what they want help with
5. Be helpful and conversational but don't assume booking intent from general responses

CONVERSATION GUIDELINES:
1. Use the user's location (${userProfile?.location || 'not specified'}) as context for recommendations
2. Reference location addresses when discussing places
3. Help with activity booking, details, and availability
4. Check existing bookings before suggesting new ones
5. Be helpful and conversational
6. Consider geographic context based on addresses and user location
7. Provide activity recommendations based on difficulty, cost, dates, and participant interest
8. Remember the conversation context - don't repeat information unnecessarily

Current user message: "${userMessage}"

CRITICAL: Only respond with "BOOK_ACTIVITY:[activityId]" if:
- There was an active booking discussion (you just asked about booking)
- AND the user is confirming that specific booking
- DO NOT book for general "yes" responses to greetings or general questions`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + geminiApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt
            }]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your request. Please try again.';
    } catch (error) {
      console.error('Gemini API Error:', error);
      return "I'm having trouble connecting to the AI service. Please check your API key in settings or try again later.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const response = await callGeminiAPI(userMessage.text);
      
      // Check if AI wants to book an activity
      if (response.includes('BOOK_ACTIVITY:')) {
        const activityId = response.split('BOOK_ACTIVITY:')[1].trim();
        const bookingResult = await createBooking(activityId);
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: bookingResult.message,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.isUser ? themeColors.primary : themeColors.surface,
          borderColor: themeColors.border,
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? '#FFFFFF' : themeColors.text }
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          { color: item.isUser ? '#FFFFFF80' : themeColors.textSecondary }
        ]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <MainLayout title="AI Chat">
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              AI is thinking...
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { 
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border 
        }]}>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              color: themeColors.text 
            }]}
            placeholder="Ask me about locations, activities, or bookings..."
            placeholderTextColor={themeColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: inputText.trim() ? themeColors.primary : themeColors.border,
              opacity: loading ? 0.5 : 1 
            }]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    marginVertical: spacing.xs,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 