import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { colors, spacing, typography, borderRadius } from '../themes';

interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  categoryId: string;
  isActive: boolean;
  description?: string;
  icon?: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  locations: string[];
  isActive: boolean;
  isExpired: boolean;
}

interface MapProps {
  style?: any;
  showActivities?: boolean;
  showLocations?: boolean;
  selectedLocationId?: string;
  activityId?: string;
}

// Lebanon coordinates (center of the country)
const LEBANON_COORDINATES = {
  latitude: 33.8547,
  longitude: 35.8623,
  latitudeDelta: 1.5,
  longitudeDelta: 1.5,
};

export default function Map({ 
  style, 
  showActivities = true, 
  showLocations = true, 
  selectedLocationId,
  activityId 
}: MapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityRoutes, setActivityRoutes] = useState<any[]>([]);
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    fetchMapData();
  }, [activityId]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      
      if (activityId) {
        // SPECIFIC ACTIVITY MODE - show only this activity's locations
        const activityDoc = await getDoc(doc(db, 'activities', activityId));
        if (activityDoc.exists()) {
          const activityData = { id: activityDoc.id, ...activityDoc.data() } as Activity;
          setActivities([activityData]);
          
          // Fetch only the locations for this activity
          if (activityData.locations && activityData.locations.length > 0) {
            const activityLocations: Location[] = [];
            for (const locationId of activityData.locations) {
              try {
                const locationDoc = await getDoc(doc(db, 'locations', locationId));
                if (locationDoc.exists()) {
                  activityLocations.push({ id: locationDoc.id, ...locationDoc.data() } as Location);
                }
              } catch (locError) {
                console.warn(`Failed to fetch location ${locationId}:`, locError);
              }
            }
            setLocations(activityLocations);
            
            // Process routes for this specific activity
            const routes = await processActivityRoutes([activityData], activityLocations);
            setActivityRoutes(routes);
          }
        }
      } else {
        // GENERAL MODE - show all locations and activities
        let currentLocations: Location[] = [];
        
        // Fetch locations
        if (showLocations) {
          const locationsQuery = query(
            collection(db, 'locations'),
            where('isActive', '==', true)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          currentLocations = locationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Location[];
          setLocations(currentLocations);
        }

        // Fetch activities
        if (showActivities) {
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

          // Process activity routes for multi-location activities
          const routes = await processActivityRoutes(
            activitiesData, 
            currentLocations.length > 0 ? currentLocations : await getLocationsForActivities(activitiesData)
          );
          setActivityRoutes(routes);
        }
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationsForActivities = async (activities: Activity[]): Promise<Location[]> => {
    const locationIds = new Set<string>();
    activities.forEach(activity => {
      activity.locations?.forEach(locationId => locationIds.add(locationId));
    });

    const locations: Location[] = [];
    for (const locationId of locationIds) {
      try {
        const locationDoc = await getDoc(doc(db, 'locations', locationId));
        if (locationDoc.exists()) {
          locations.push({
            id: locationDoc.id,
            ...locationDoc.data()
          } as Location);
        }
      } catch (error) {
        console.error(`Error fetching location ${locationId}:`, error);
      }
    }
    return locations;
  };

  const processActivityRoutes = async (activities: Activity[], allLocations: Location[]) => {
    const routes: any[] = [];
    
    for (const activity of activities) {
      if (activity.locations && activity.locations.length > 1) {
        const routeCoordinates: any[] = [];
        
        for (const locationId of activity.locations) {
          const location = allLocations.find(loc => loc.id === locationId);
          if (location && location.coordinates) {
            routeCoordinates.push({
              latitude: location.coordinates.lat,
              longitude: location.coordinates.lng
            });
          }
        }
        
        if (routeCoordinates.length > 1) {
          routes.push({
            id: activity.id,
            title: activity.title,
            coordinates: routeCoordinates,
            color: '#FF6B35' // Orange color for activities
          });
        }
      }
    }
    
    return routes;
  };

  // Find activities that include a specific location
  const getActivitiesAtLocation = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && activity.locations.includes(locationId)
    );
  };

  // Check if location has single-location activities (no routes)
  const getSingleLocationActivities = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && 
      activity.locations.length === 1 && 
      activity.locations.includes(locationId)
    );
  };

  const handleMarkerPress = (location: Location) => {
    const activitiesAtLocation = getActivitiesAtLocation(location.id);
    const singleLocationActivities = getSingleLocationActivities(location.id);
    
    let message = `📍 ${location.name}\n📮 ${location.address}`;
    
    if (activitiesAtLocation.length > 0) {
      message += `\n\n🎯 Activities at this location:`;
      activitiesAtLocation.forEach((activity, index) => {
        const isSingleLocation = activity.locations.length === 1;
        const activityType = isSingleLocation ? '📍' : '🚀';
        message += `\n${activityType} ${activity.title}`;
      });
    }

    Alert.alert(
      'Location Details',
      message,
      [
        { text: 'Close', style: 'cancel' },
        ...(activitiesAtLocation.length > 0 ? [
          { 
            text: 'View Activities', 
            onPress: () => {
              // Navigate to activities or show more details
              console.log('Navigate to activities:', activitiesAtLocation);
            }
          }
        ] : [])
      ]
    );
  };

  const Legend = () => (
    <View style={[styles.legend, { backgroundColor: themeColors.surface }]}>
      {showLocations && (
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Places</Text>
        </View>
      )}
      
      {showActivities && (
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#FF9800' }]} />
          <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Activities</Text>
        </View>
      )}
    </View>
  );

  const renderLocationMarkers = useMemo(() => {
    return locations.map((location) => {
      const activitiesAtLocation = getActivitiesAtLocation(location.id);
      const singleLocationActivities = getSingleLocationActivities(location.id);
      const hasActivities = activitiesAtLocation.length > 0;
      
      // Determine marker color based on activities
      let markerColor = '#4CAF50'; // Default green
      if (singleLocationActivities.length > 0) {
        markerColor = '#FF9800'; // Orange if has single-location activities
      }
      
      return (
        <Marker
          key={location.id}
          coordinate={{
            latitude: location.coordinates.lat,
            longitude: location.coordinates.lng
          }}
          onPress={() => handleMarkerPress(location)}
        >
          <View style={[
            styles.customMarker, 
            { backgroundColor: markerColor },
            selectedLocationId === location.id && styles.selectedMarker
          ]}>
            <Ionicons 
              name={hasActivities ? "location" : "location"} 
              size={20} 
              color="white" 
            />
            {singleLocationActivities.length > 0 && (
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>{singleLocationActivities.length}</Text>
              </View>
            )}
          </View>
          
          <Callout style={styles.callout}>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{location.name}</Text>
              <Text style={styles.calloutAddress}>{location.address}</Text>
              
              {activitiesAtLocation.length > 0 && (
                <View style={styles.activitiesSection}>
                  <Text style={styles.activitiesTitle}>
                    🎯 Activities ({activitiesAtLocation.length})
                  </Text>
                  {activitiesAtLocation.slice(0, 2).map((activity, index) => (
                    <Text key={activity.id} style={styles.activityItem}>
                      {activity.locations.length === 1 ? '📍' : '🚀'} {activity.title}
                    </Text>
                  ))}
                  {activitiesAtLocation.length > 2 && (
                    <Text style={styles.moreActivities}>
                      +{activitiesAtLocation.length - 2} more...
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Callout>
        </Marker>
      );
    });
  }, [locations, activities, selectedLocationId]);

  const renderActivityRoutes = useMemo(() => {
    return activityRoutes.map((route) => (
      <Polyline
        key={route.id}
        coordinates={route.coordinates}
        strokeColor={route.color}
        strokeWidth={3}
        lineDashPattern={[5, 5]} // Dashed line for multi-location activities
      />
    ));
  }, [activityRoutes]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          Loading map...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={LEBANON_COORDINATES}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {showLocations && renderLocationMarkers}
        {showActivities && renderActivityRoutes}
      </MapView>
      
      <Legend />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: borderRadius.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
  },
  legend: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    maxWidth: 80,
  },
  legendTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  legendMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendLine: {
    width: 16,
    height: 3,
    marginRight: spacing.xs,
    borderRadius: 1.5,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#666',
  },
  customMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
    borderColor: '#FFD700', // Gold border for selected marker
    borderWidth: 3,
  },
  activityBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  activityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  callout: {
    width: 200,
  },
  calloutContainer: {
    padding: spacing.sm,
  },
  calloutTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  calloutAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  activitiesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  activitiesTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  activityItem: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  moreActivities: {
    ...typography.caption,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
}); 