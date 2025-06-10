import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { colors, spacing, typography, borderRadius } from '../../themes';

type TabType = 'locations' | 'activities';

export default function FavoritesScreen() {
  const { colors: themeColors } = useTheme();
  const { favorites, favoriteActivities, toggleFavorite, toggleActivityFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<TabType>('locations');

  const getLocationImage = (item: any) => {
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    return null;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleRemoveLocationFavorite = async (item: any) => {
    await toggleFavorite(item);
  };

  const handleRemoveActivityFavorite = async (item: any) => {
    await toggleActivityFavorite(item);
  };

  const renderLocationItem = ({ item }: { item: any }) => {
    const imageSource = getLocationImage(item);
    
    return (
      <View style={[styles.favoriteCard, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity 
          style={styles.favoriteContent}
          onPress={() => router.push(`/location/${item.id}`)}
        >
          <View style={styles.imageContainer}>
            {imageSource ? (
              <Image
                source={{ uri: imageSource }}
                style={styles.favoriteImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: themeColors.card }]}>
                <Ionicons name="image-outline" size={24} color={themeColors.textSecondary} />
              </View>
            )}
          </View>
          <View style={styles.favoriteInfo}>
            <Text style={[styles.favoriteName, { color: themeColors.text }]}>
              {item.name}
            </Text>
            <View style={styles.favoriteAddress}>
              <Ionicons name="location-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>
                {item.address}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveLocationFavorite(item)}
        >
          <Ionicons 
            name="heart" 
            size={24} 
            color={themeColors.error} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderActivityItem = ({ item }: { item: any }) => {
    return (
      <View style={[styles.favoriteCard, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity 
          style={styles.favoriteContent}
          onPress={() => router.push(`/activity/${item.id}`)}
        >
          <View style={styles.activityIconContainer}>
            <Ionicons name="calendar-outline" size={32} color={themeColors.primary} />
          </View>
          <View style={styles.favoriteInfo}>
            <View style={styles.activityTitleRow}>
              <Text style={[styles.favoriteName, { color: themeColors.text, flex: 1 }]}>
                {item.title}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
                <Text style={styles.difficultyText}>
                  {item.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.activityDescription, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.activityDetails}>
              <View style={styles.activityDetailItem}>
                <Ionicons name="calendar-outline" size={14} color={themeColors.primary} />
                <Text style={[styles.activityDetailText, { color: themeColors.textSecondary }]}>
                  {formatDate(item.startDate)}
                </Text>
              </View>
              <View style={styles.activityDetailItem}>
                <Ionicons name="cash-outline" size={14} color={themeColors.primary} />
                <Text style={[styles.activityDetailText, { color: themeColors.textSecondary }]}>
                  ${item.estimatedCost}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveActivityFavorite(item)}
        >
          <Ionicons 
            name="heart" 
            size={24} 
            color={themeColors.error} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = (type: TabType) => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={type === 'locations' ? "location-outline" : "calendar-outline"} 
        size={64} 
        color={themeColors.textSecondary} 
      />
      <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
        No favorite {type} yet
      </Text>
      <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
        Start exploring and save your favorite {type}
      </Text>
    </View>
  );

  const currentData = activeTab === 'locations' ? favorites : favoriteActivities;
  const renderItem = activeTab === 'locations' ? renderLocationItem : renderActivityItem;

  return (
    <MainLayout title="Favorites">
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: themeColors.surface }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'locations' && { backgroundColor: themeColors.primary }
            ]}
            onPress={() => setActiveTab('locations')}
          >
            <Ionicons 
              name="location-outline" 
              size={20} 
              color={activeTab === 'locations' ? '#FFFFFF' : themeColors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'locations' ? '#FFFFFF' : themeColors.textSecondary }
            ]}>
              Locations ({favorites.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'activities' && { backgroundColor: themeColors.primary }
            ]}
            onPress={() => setActiveTab('activities')}
          >
            <Ionicons 
              name="calendar-outline" 
              size={20} 
              color={activeTab === 'activities' ? '#FFFFFF' : themeColors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'activities' ? '#FFFFFF' : themeColors.textSecondary }
            ]}>
              Activities ({favoriteActivities.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {currentData.length === 0 ? (
          renderEmptyState(activeTab)
        ) : (
          <FlatList
            data={currentData}
            renderItem={renderItem}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  tabText: {
    ...typography.body,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  favoriteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  favoriteImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  favoriteAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressText: {
    ...typography.caption,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  difficultyText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  activityDescription: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  activityDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityDetailText: {
    ...typography.caption,
    fontSize: 12,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.1)',
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