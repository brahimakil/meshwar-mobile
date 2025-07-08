import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
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
  icon: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  categoryId: string;
  categoryName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const { colors: themeColors } = useTheme();
  const { toggleFavorite, isFavorite } = useFavorites();

  const handleGoBack = () => {
    try {
      // Check if we can go back
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to home screen if no back history
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Ultimate fallback
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    if (id) {
      fetchLocation();
    }
  }, [id]);

  const fetchLocation = async () => {
    try {
      const locationDoc = await getDoc(doc(db, 'locations', id as string));
      if (locationDoc.exists()) {
        const locationData = { id: locationDoc.id, ...locationDoc.data() } as Location;
        
        // Fetch category name if categoryId exists
        if (locationData.categoryId) {
          try {
            const categoryDoc = await getDoc(doc(db, 'categories', locationData.categoryId));
            if (categoryDoc.exists()) {
              locationData.categoryName = categoryDoc.data().name;
            }
          } catch (error) {
            console.error('Error fetching category:', error);
          }
        }
        
        setLocation(locationData);
      } else {
        Alert.alert('Error', 'Location not found');
        handleGoBack();
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Failed to load location details');
      handleGoBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFavoritePress = async () => {
    if (location) {
      await toggleFavorite(location);
    }
  };

  const openMaps = () => {
    if (location?.coordinates) {
      const { lat, lng } = location.coordinates;
      const url = `https://maps.google.com/?q=${lat},${lng}`;
      // In a real app, you'd use Linking.openURL(url)
      Alert.alert('Open Maps', `Would open: ${url}`);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <MainLayout title="Location Details" showBack onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading location details...
          </Text>
        </View>
      </MainLayout>
    );
  }

  if (!location) {
    return (
      <MainLayout title="Location Details" showBack onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
            Location not found
          </Text>
        </View>
      </MainLayout>
    );
  }

  const isLocationFavorite = isFavorite(location.id);

  return (
    <MainLayout 
      title="Location Details" 
      showBack 
      onBackPress={handleGoBack}
      rightComponent={
        <TouchableOpacity onPress={handleFavoritePress} style={styles.favoriteButton}>
          <Ionicons 
            name={isLocationFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isLocationFavorite ? themeColors.error : themeColors.text} 
          />
        </TouchableOpacity>
      }
    >
      <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.content}>
          
          {/* Header Section with Icon - NOW FIRST */}
          <View style={[styles.headerCard, { backgroundColor: themeColors.surface }]}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                {location.icon && (
                  <Image
                    source={{ uri: location.icon }}
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.title, { color: themeColors.text }]}>
                  {location.name}
                </Text>
              </View>
            </View>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>
              {location.description}
            </Text>
          </View>

          {/* Images Section - NOW SECOND */}
          {location.images && location.images.length > 0 && (
            <View style={styles.imagesSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.text, marginLeft: spacing.md, marginBottom: spacing.sm }]}>
                Gallery
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {location.images.map((image, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(image)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: image }}
                      style={styles.locationImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="expand-outline" size={24} color="white" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Location Details */}
          <View style={[styles.detailsCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Location Details
            </Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Address
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {location.address}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="navigate-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity onPress={openMaps} style={styles.mapButton}>
                <Ionicons name="map-outline" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="folder-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Category
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {location.categoryName || 'Unknown Category'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Status
                </Text>
                <Text style={[styles.detailValue, { color: location.isActive ? themeColors.success : themeColors.error }]}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          {/* Metadata Section */}
         
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={closeImageModal}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeImageModal}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </MainLayout>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  imagesSection: {
    height: 300,
  },
  imageContainer: {
    marginRight: spacing.md,
    marginLeft: spacing.md,
    position: 'relative',
  },
  locationImage: {
    width: 250, // Made smaller to fit better
    height: 200, // Made smaller to fit better
    borderRadius: borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginHorizontal: spacing.md,
  },
  titleRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    width: '100%',
  },
  iconImage: {
    width: 200, // Made smaller
    height: 200, // Made smaller
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    width: '100%',
  },
  description: {
    ...typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  detailsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginHorizontal: spacing.md,
  },
  metadataCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
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
  mapButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: spacing.sm,
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
}); 