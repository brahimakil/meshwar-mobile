import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { colors, spacing, typography, borderRadius } from '../../themes';
import { useRouter } from 'expo-router';
import { router } from 'expo-router';
import Map from '../../components/Map';

interface Location {
  id: string;
  name: string;
  address: string;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  categoryId: string;
  isActive: boolean;
  description?: string;
  icon?: string;
}

export default function CitiesScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const { colors: themeColors } = useTheme();
  const { toggleFavorite, isFavorite } = useFavorites();
  const router = useRouter();

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);

  const fetchLocations = async () => {
    try {
      const q = query(
        collection(db, 'locations'),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const locationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback to empty array if Firebase fails
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const getLocationImage = (item: Location) => {
    // Return first image from Firebase (base64) or fallback
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    // Return placeholder if no image
    return null;
  };

  const handleFavoritePress = async (item: Location) => {
    await toggleFavorite(item);
  };

  const handleLocationPress = (item: Location) => {
    setSelectedLocationId(item.id);
    router.push(`/location/${item.id}`);
  };

  const renderLocationItem = (item: Location, index: number) => {
    const imageSource = getLocationImage(item);
    const isItemFavorite = isFavorite(item.id);
    
    return (
      <View key={item.id} style={styles.locationItemContainer}>
        <View style={[styles.locationCard, { backgroundColor: themeColors.surface }]}>
          <TouchableOpacity 
            style={styles.locationContent}
            onPress={() => handleLocationPress(item)}
          >
            <View style={styles.imageContainer}>
              {imageSource ? (
                <Image
                  source={{ uri: imageSource }}
                  style={styles.locationImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: themeColors.card }]}>
                  <Ionicons name="image-outline" size={24} color={themeColors.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationName, { color: themeColors.text }]}>
                {item.name}
              </Text>
              <View style={styles.locationAddress}>
                <Ionicons name="location-outline" size={16} color={themeColors.primary} />
                <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>
                  {item.address}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
          
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
        </View>
        
        {/* Separator - only show if not the last item */}
        {index < filteredLocations.length - 1 && (
          <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
        )}
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
      <MainLayout title="Cities">
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
    <MainLayout title="Cities">
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Container */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInput, { backgroundColor: colors.searchBg }]}>
              <Ionicons name="search" size={20} color={colors.searchText} />
              <TextInput
                style={[styles.searchText, { color: colors.searchText }]}
                placeholder="Search"
                placeholderTextColor={colors.searchText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <SortButton />
          </View>

          {/* Map Component */}
          <View style={styles.mapContainer}>
            <Map 
              style={styles.map}
              showActivities={true}
              showLocations={true}
              selectedLocationId={selectedLocationId}
            />
          </View>

          {/* Locations Section */}
          {filteredLocations.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No locations found
              </Text>
              <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
                {searchQuery ? 'Try a different search term' : 'Add some locations in the admin panel'}
              </Text>
            </View>
          ) : (
            <View style={styles.locationsContainer}>
              {filteredLocations.map((item, index) => renderLocationItem(item, index))}
            </View>
          )}
        </ScrollView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
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
  mapContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  map: {
    height: 300,
  },
  locationsContainer: {
    paddingHorizontal: spacing.md,
  },
  locationItemContainer: {
    marginVertical: spacing.xs,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    position: 'relative',
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
    marginBottom: spacing.xs,
  },
  locationAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressText: {
    ...typography.caption,
  },
  favoriteButton: {
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
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    minHeight: 200,
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