import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { colors, spacing, typography, borderRadius } from '../../themes';
import { router } from 'expo-router';

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

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const { colors: themeColors } = useTheme();
  const { toggleActivityFavorite, isActivityFavorite } = useFavorites();

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredActivities(activities);
    } else {
      const filtered = activities.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredActivities(filtered);
    }
  }, [searchQuery, activities]);

  const fetchActivities = async () => {
    try {
      const q = query(
        collection(db, 'activities'),
        where('isActive', '==', true),
        where('isExpired', '==', false)
      );
      const querySnapshot = await getDocs(q);
      const activitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
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
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) {
      return '0m';
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      if (remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
      } else {
        return `${hours}h`;
      }
    }
    return `${remainingMinutes}m`;
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

  const handleFavoritePress = async (item: Activity) => {
    await toggleActivityFavorite(item);
  };

  const renderActivityItem = ({ item }: { item: Activity }) => {
    const isItemFavorite = isActivityFavorite(item.id);
    
    return (
      <View style={[styles.activityCard, { backgroundColor: themeColors.surface }]}>
        {/* Main Content Area */}
        <TouchableOpacity 
          style={styles.activityContent}
          onPress={() => router.push(`/activity/${item.id}`)}
        >
          {/* Header with Title and Difficulty Badge */}
          <View style={styles.activityHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.activityTitle, { color: themeColors.text }]}>
                {item.title}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
                <Text style={styles.difficultyText}>
                  {item.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={[styles.activityDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.activityDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="hourglass-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                Duration: {formatDuration(item.estimatedDuration)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                Cost: ${item.estimatedCost}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                Participants: {item.currentParticipants}
              </Text>
            </View>
          </View>
          
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: themeColors.card }]}>
                  <Text style={[styles.tagText, { color: themeColors.primary }]}>
                    {tag.trim()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
        
        {/* Action Buttons Container */}
        <View style={styles.actionsContainer}>
          {/* Favorites Button */}
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleFavoritePress(item)}
          >
            <Ionicons 
              name={isItemFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isItemFavorite ? themeColors.error : themeColors.textSecondary} 
            />
          </TouchableOpacity>
          
          {/* Chevron Arrow */}
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </View>
        </View>
      </View>
    );
  };

  const SortButton = () => (
    <TouchableOpacity style={[styles.sortButton, { backgroundColor: themeColors.primary }]}>
      <Ionicons name="options-outline" size={20} color={colors.text} />
      <Text style={[styles.sortText, { color: colors.text }]}>Sort</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <MainLayout title="Activities">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading activities...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Activities">
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, { backgroundColor: colors.searchBg }]}>
            <Ionicons name="search" size={20} color={colors.searchText} />
            <TextInput
              style={[styles.searchText, { color: colors.searchText }]}
              placeholder="Search activities"
              placeholderTextColor={colors.searchText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <SortButton />
        </View>

        {filteredActivities.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No activities found
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'Add some activities in the admin panel'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredActivities}
            renderItem={renderActivityItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchText: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  sortText: {
    ...typography.body,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activityContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  activityHeader: {
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  activityTitle: {
    ...typography.h3,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  activityDescription: {
    ...typography.body,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  activityDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.sm,
    minHeight: 80,
  },
  favoriteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  chevronContainer: {
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
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.h3,
    textAlign: 'center',
  },
  emptySubText: {
    ...typography.body,
    textAlign: 'center',
  },
}); 