import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../themes';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

interface Booking {
  id: string;
  activityId: string;
  userId: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  activity?: Activity;
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

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors: themeColors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchBookings();
      }
    }, [user])
  );

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      // Fetch user's bookings
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];

      // Fetch activity details for each booking
      const bookingsWithActivities = await Promise.all(
        bookingsData.map(async (booking) => {
          try {
            const activityDoc = await getDoc(doc(db, 'activities', booking.activityId));
            if (activityDoc.exists()) {
              return {
                ...booking,
                activity: { id: activityDoc.id, ...activityDoc.data() } as Activity
              };
            }
            return booking;
          } catch (error) {
            console.error('Error fetching activity:', error);
            return booking;
          }
        })
      );

      // Sort by creation date (newest first)
      bookingsWithActivities.sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setBookings(bookingsWithActivities);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleBookingPress = (bookingId: string) => {
    router.push(`/booking/${bookingId}`);
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
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return themeColors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const activity = item.activity;
    
    return (
      <View style={[styles.bookingCard, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity style={styles.bookingContent}>
          {/* Header with Status */}
          <View style={styles.bookingHeader}>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={16} 
                color={getStatusColor(item.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.bookingDate, { color: themeColors.textSecondary }]}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>

          {/* Activity Information */}
          {activity ? (
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: themeColors.text }]}>
                {activity.title}
              </Text>
              <Text style={[styles.activityDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
                {activity.description}
              </Text>
              
              <View style={styles.activityDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={themeColors.primary} />
                  <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                    {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={themeColors.primary} />
                  <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                    {activity.startTime} - {activity.endTime}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={14} color={themeColors.primary} />
                  <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                    ${activity.estimatedCost}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: themeColors.textSecondary }]}>
                Activity not found
              </Text>
              <Text style={[styles.activityDescription, { color: themeColors.textSecondary }]}>
                The activity for this booking may have been removed.
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            onPress={() => handleBookingPress(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <MainLayout title="My Bookings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading your bookings...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="My Bookings">
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No bookings yet
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
              Start exploring activities and make your first booking
            </Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            renderItem={renderBookingItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[themeColors.primary]}
                tintColor={themeColors.primary}
              />
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            )}
          />
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  bookingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: 'bold',
    fontSize: 12,
  },
  bookingDate: {
    ...typography.caption,
    fontSize: 11,
  },
  activityInfo: {
    gap: spacing.xs,
  },
  activityTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  activityDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  activityDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    fontSize: 12,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  separator: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.h2,
    textAlign: 'center',
  },
  emptySubText: {
    ...typography.body,
    textAlign: 'center',
  },
}); 