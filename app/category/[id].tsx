import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { colors, spacing, typography, borderRadius } from '../../themes';

interface Location {
  id: string;
  name: string;
  address: string;
  description: string;
  images: string[];
  categoryId: string;
  isActive: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  icon?: string;
}

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams();
  const { colors: themeColors } = useTheme();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLocationsByCategory();
  }, [id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);

  const fetchLocationsByCategory = async () => {
    try {
      setLoading(true);
      const locationsQuery = query(
        collection(db, 'locations'),
        where('categoryId', '==', id),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(locationsQuery);
      const locationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPress = (location: Location) => {
    router.push(`/location/${location.id}`);
  };

  const handleFavoritePress = async (location: Location) => {
    await toggleFavorite(location);
  };

  const getLocationImage = (location: Location) => {
    if (location.images && location.images.length > 0) {
      return location.images[0];
    }
    return null;
  };

  const renderLocationItem = ({ item }: { item: Location }) => {
    const isItemFavorite = isFavorite(item.id);
    const imageSource = getLocationImage(item);

    return (
      <View style={[styles.locationCard, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity 
          style={styles.locationContent}
          onPress={() => handleLocationPress(item)}
        >
          <View style={styles.imageContainer}>
            {imageSource ? (
              <Image source={{ uri: imageSource }} style={styles.locationImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: themeColors.card }]}>
                <Ionicons name="location-outline" size={24} color={themeColors.textSecondary} />
              </View>
            )}
          </View>
          
          <View style={styles.locationInfo}>
            <Text style={[styles.locationName, { color: themeColors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.locationAddress, { color: themeColors.textSecondary }]}>
              {item.address}
            </Text>
            {item.description && (
              <Text style={[styles.locationDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
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
      </View>
    );
  };

  // Add this handler for the back button
  const handleBackPress = () => {
    router.back();
  };

  if (loading) {
    return (
      <MainLayout 
        title={`${name}` || 'Category'} 
        showBack 
        onBackPress={handleBackPress}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading locations...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title={`${name}` || 'Category'} 
      showBack 
      onBackPress={handleBackPress}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="search" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.searchText, { color: themeColors.text }]}
              placeholder="Search locations..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsText, { color: themeColors.textSecondary }]}>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Locations List */}
        {filteredLocations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No locations found
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'No locations in this category yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationItem}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchInput: {
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
  resultsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultsText: {
    ...typography.body,
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  locationImage: {
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
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...typography.h3,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  locationAddress: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  locationDescription: {
    ...typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  separator: {
    height: 1,
    marginVertical: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubText: {
    ...typography.body,
    textAlign: 'center',
    opacity: 0.8,
  },
});