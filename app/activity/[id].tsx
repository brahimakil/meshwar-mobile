import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Button,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { colors, spacing, typography, borderRadius } from '../../themes';
import { Timestamp } from 'firebase/firestore';
import Map from '../../components/Map';

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
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);
  const [checkingBooking, setCheckingBooking] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const { colors: themeColors } = useTheme();
  const { user } = useAuth();
  const { toggleActivityFavorite, isActivityFavorite } = useFavorites();

  useEffect(() => {
    if (id) {
      fetchActivity();
    }
  }, [id]);

  useEffect(() => {
    if (user && activity) {
      checkExistingBooking();
    }
  }, [user, activity]);

  const fetchActivity = async () => {
    try {
      const activityDoc = await getDoc(doc(db, 'activities', id as string));
      if (activityDoc.exists()) {
        setActivity({ id: activityDoc.id, ...activityDoc.data() } as Activity);
      } else {
        Alert.alert('Error', 'Activity not found');
        handleGoBack();
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      Alert.alert('Error', 'Failed to load activity details');
      handleGoBack();
    } finally {
      setLoading(false);
    }
  };

  const checkExistingBooking = async () => {
    if (!user || !activity) return;
    
    setCheckingBooking(true);
    try {
      const existingBookingQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        where('activityId', '==', activity.id)
      );
      
      const existingSnapshot = await getDocs(existingBookingQuery);
      setIsAlreadyBooked(!existingSnapshot.empty);
    } catch (error) {
      console.error('Error checking existing booking:', error);
    } finally {
      setCheckingBooking(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/activities');
    }
  };

  const formatDate = (dateValue: Timestamp | string) => {
    let date: Date;
    
    if (dateValue instanceof Timestamp) {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return 'Invalid Date';
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateValue: Timestamp | string) => {
    let date: Date;
    
    if (dateValue instanceof Timestamp) {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return 'Invalid Date';
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) {
      return '0 minutes';
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      if (remainingMinutes > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      }
    }
    return `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#4CAF50';
      case 'moderate':
        return '#FF9800';
      case 'hard':
        return '#F44336';
      default:
        return themeColors.textSecondary;
    }
  };

  const handleBookActivity = async () => {
    console.log('Book Activity button pressed!');
    console.log('User:', user ? 'exists' : 'null');
    console.log('Activity:', activity ? 'exists' : 'null');
    
    if (!user || !activity) {
      Alert.alert('Error', !user ? 'You must be logged in to book activities' : 'Activity not found');
      return;
    }
    
    if (isAlreadyBooked) {
      Alert.alert('Already Booked', 'You have already booked this activity');
      return;
    }

    setBookingLoading(true);
    try {
      console.log('Creating booking document...');
      const bookingRef = doc(collection(db, 'bookings'));
      await setDoc(bookingRef, {
        activityId: activity.id,
        userId: user.uid,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('Booking created successfully!');
      setShowSuccessNotification(true);
      
      setTimeout(() => {
        setShowSuccessNotification(false);
        setIsAlreadyBooked(true);
      }, 2000);
      
    } catch (error) {
      console.error('Booking failed:', error);
      Alert.alert('Error', `Failed to book activity: ${error?.message || 'Unknown error'}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleFavoritePress = async () => {
    if (activity) {
      await toggleActivityFavorite(activity);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Activity Details" showBack onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading activity details...
          </Text>
        </View>
      </MainLayout>
    );
  }

  if (!activity) {
    return (
      <MainLayout title="Activity Details" showBack onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
            Activity not found
          </Text>
        </View>
      </MainLayout>
    );
  }

  const isFavorite = isActivityFavorite(activity.id);

  return (
    <MainLayout 
      title="Activity Details" 
      showBack 
      onBackPress={handleGoBack}
      rightComponent={
        <TouchableOpacity onPress={handleFavoritePress} style={styles.favoriteButton}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? themeColors.error : themeColors.text} 
          />
        </TouchableOpacity>
      }
    >
      <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={[styles.headerCard, { backgroundColor: themeColors.surface }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                {activity.title}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(activity.difficulty) }]}>
                <Text style={styles.difficultyText}>
                  {activity.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>
              {activity.description}
            </Text>
          </View>

          {/* MAP SECTION - ADD THIS NEW SECTION */}
          {activity.locations && activity.locations.length > 0 && (
            <View style={[styles.mapCard, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Activity Locations
              </Text>
              <Text style={[styles.mapDescription, { color: themeColors.textSecondary }]}>
                {activity.locations.length === 1 
                  ? 'This activity takes place at one location'
                  : `This activity spans ${activity.locations.length} locations`
                }
              </Text>
              <View style={styles.mapContainer}>
                <Map
                  style={styles.activityMap}
                  showActivities={true}
                  showLocations={true}
                  activityId={activity.id}
                />
              </View>
            </View>
          )}

          {/* Details Section */}
          <View style={[styles.detailsCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Activity Details
            </Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Start Date
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {formatDate(activity.startDate)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  End Date
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {formatDate(activity.endDate)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Time
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {activity.startTime} - {activity.endTime}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="hourglass-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Duration
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {formatDuration(activity.estimatedDuration)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Estimated Cost
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  ${activity.estimatedCost}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Current Participants
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {activity.currentParticipants}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Age Group
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {activity.ageGroup}
                </Text>
              </View>
            </View>
          </View>

          {/* Tags Section */}
          {activity.tags && activity.tags.length > 0 && (
            <View style={[styles.tagsCard, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Tags
              </Text>
              <View style={styles.tagsContainer}>
                {activity.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: themeColors.card }]}>
                    <Text style={[styles.tagText, { color: themeColors.primary }]}>
                      {tag.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Metadata Section */}
          <View style={[styles.metadataCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Activity Information
            </Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Status
                </Text>
                <Text style={[styles.detailValue, { color: activity.isActive ? themeColors.success : themeColors.error }]}>
                  {activity.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Expired
                </Text>
                <Text style={[styles.detailValue, { color: activity.isExpired ? themeColors.error : themeColors.success }]}>
                  {activity.isExpired ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="create-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Created
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {formatDateTime(activity.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="refresh-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Last Updated
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {formatDateTime(activity.updatedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Success Notification */}
      {showSuccessNotification && (
        <View style={[styles.successNotification, { backgroundColor: themeColors.success || '#4CAF50' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.successText}>Booked Successfully!</Text>
        </View>
      )}

      {/* Book Activity Button */}
      <View style={[styles.bookingContainer, { backgroundColor: themeColors.background }]}>
        {checkingBooking ? (
          <View style={styles.checkingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={[styles.checkingText, { color: themeColors.textSecondary }]}>
              Checking booking status...
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.bookButton, 
              { 
                backgroundColor: isAlreadyBooked 
                  ? themeColors.textSecondary 
                  : bookingLoading 
                    ? themeColors.textSecondary 
                    : themeColors.primary,
                opacity: (bookingLoading || isAlreadyBooked) ? 0.6 : 1
              }
            ]}
            onPress={handleBookActivity}
            disabled={bookingLoading || isAlreadyBooked}
            activeOpacity={0.8}
          >
            <Text style={[styles.bookButtonText, { color: '#FFFFFF' }]}>
              {bookingLoading 
                ? 'Booking...' 
                : isAlreadyBooked 
                  ? 'Already Booked' 
                  : 'Book Activity'
              }
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
  },
  favoriteButton: {
    padding: spacing.xs,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  difficultyText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  description: {
    ...typography.body,
    lineHeight: 24,
  },
  detailsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  tagsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  metadataCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailContent: {
    flex: 1,
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...typography.body,
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '500',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  checkingText: {
    ...typography.body,
    fontSize: 14,
  },
  bookingContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  bookButtonText: {
    ...typography.button,
    fontWeight: 'bold',
    fontSize: 16,
  },
  successNotification: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: spacing.sm,
  },
  successText: {
    color: '#FFFFFF',
    ...typography.button,
    fontWeight: 'bold',
  },
  mapCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  mapDescription: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  mapContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityMap: {
    height: 250,
    width: '100%',
  },
});