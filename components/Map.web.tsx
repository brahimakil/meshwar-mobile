import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
}

export default function Map({ style, showActivities = true, showLocations = true, selectedLocationId }: MapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    fetchMapData();
    loadLeafletMap();
  }, []);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      
      // Fetch locations
      if (showLocations) {
        const locationsQuery = query(
          collection(db, 'locations'),
          where('isActive', '==', true)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Location[];
        setLocations(locationsData);
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
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeafletMap = () => {
    if (typeof window !== 'undefined') {
      // Create script tags for Leaflet
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCSS);

      const leafletJS = document.createElement('script');
      leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletJS.onload = () => {
        setMapLoaded(true);
        initializeMap();
      };
      document.head.appendChild(leafletJS);
    }
  };

  // Find activities that include a specific location
  const getActivitiesAtLocation = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && activity.locations.includes(locationId)
    );
  };

  // Check if location has single-location activities
  const getSingleLocationActivities = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && 
      activity.locations.length === 1 && 
      activity.locations.includes(locationId)
    );
  };

  const initializeMap = () => {
    if (typeof window !== 'undefined' && (window as any).L) {
      const L = (window as any).L;
      
      // Initialize map centered on Lebanon
      const newMap = L.map('leaflet-map').setView([33.8547, 35.8623], 8);
      setMap(newMap);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(newMap);

      // Add markers for locations
      locations.forEach(location => {
        const activitiesAtLocation = getActivitiesAtLocation(location.id);
        const singleLocationActivities = getSingleLocationActivities(location.id);
        
        // Determine marker color based on activities
        let markerColor = '#4CAF50'; // Default green
        if (singleLocationActivities.length > 0) {
          markerColor = '#FF9800'; // Orange if has single-location activities
        }

        const marker = L.circleMarker([location.coordinates.lat, location.coordinates.lng], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.8,
          radius: 8
        }).addTo(newMap);
        
        // Create popup content
        let popupContent = `<div style="max-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">${location.name}</h3>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${location.address}</p>
        `;
        
        if (activitiesAtLocation.length > 0) {
          popupContent += `<div style="border-top: 1px solid #eee; padding-top: 8px;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #333; font-size: 12px;">
              🎯 Activities (${activitiesAtLocation.length}):
            </p>`;
          
          activitiesAtLocation.slice(0, 3).forEach(activity => {
            const activityIcon = activity.locations.length === 1 ? '📍' : '🚀';
            popupContent += `<p style="margin: 0 0 2px 0; color: #666; font-size: 11px;">
              ${activityIcon} ${activity.title}
            </p>`;
          });
          
          if (activitiesAtLocation.length > 3) {
            popupContent += `<p style="margin: 4px 0 0 0; color: #007cbb; font-style: italic; font-size: 11px;">
              +${activitiesAtLocation.length - 3} more...
            </p>`;
          }
          
          popupContent += '</div>';
        }
        
        popupContent += '</div>';
        
        marker.bindPopup(popupContent);
      });

      // Add activity routes for multi-location activities
      activities.forEach(async (activity) => {
        if (activity.locations && activity.locations.length > 1) {
          const routeCoordinates: any[] = [];
          
          for (const locationId of activity.locations) {
            const location = locations.find(loc => loc.id === locationId);
            if (location && location.coordinates) {
              routeCoordinates.push([location.coordinates.lat, location.coordinates.lng]);
            }
          }
          
          if (routeCoordinates.length > 1) {
            L.polyline(routeCoordinates, {
              color: '#FF6B35',
              weight: 3,
              dashArray: '5, 5'
            }).addTo(newMap).bindPopup(`<b>🚀 ${activity.title}</b><br><small>Multi-location activity</small>`);
          }
        }
      });
    }
  };

  useEffect(() => {
    if (mapLoaded && !loading && locations.length > 0) {
      // Clear existing map and reinitialize
      if (map) {
        map.remove();
      }
      initializeMap();
    }
  }, [locations, activities, mapLoaded, loading]);

  const Legend = () => (
    <View style={[styles.legend, { backgroundColor: themeColors.surface }]}>
      <Text style={[styles.legendTitle, { color: themeColors.text }]}>Map Legend</Text>
      
      {showLocations && (
        <>
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Locations</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#FF9800' }]} />
            <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>With Activities</Text>
          </View>
        </>
      )}
      
      {showActivities && (
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#FF6B35' }]} />
          <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Activity Routes</Text>
        </View>
      )}
    </View>
  );

  if (loading || !mapLoaded) {
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
      <div
        id="leaflet-map"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px'
        }}
      />
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
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  legendTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendLine: {
    width: 16,
    height: 3,
    marginRight: spacing.xs,
    borderRadius: 1.5,
  },
  legendText: {
    ...typography.caption,
    fontSize: 11,
  },
}); 