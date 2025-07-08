import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { colors, spacing, typography, borderRadius } from '../themes';
import { Ionicons } from '@expo/vector-icons';

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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { colors: themeColors } = useTheme();

  // Generate unique container ID for this map instance
  const containerId = useMemo(() => `leaflet-map-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    fetchMapData();
    loadLeafletMap();
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          console.warn('Error cleaning up map:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && !loading && locations.length > 0) {
      initializeMap();
    }
  }, [locations, activities, mapLoaded, loading]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setMapError(null);
      
      if (activityId) {
        // Fetch specific activity and its locations
        const activityDoc = await getDoc(doc(db, 'activities', activityId));
        if (activityDoc.exists()) {
          const activityData = { id: activityDoc.id, ...activityDoc.data() } as Activity;
          setActivities([activityData]);
          
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
          }
        } else {
          setMapError('Activity not found');
        }
      } else {
        // Fetch all locations and activities separately
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
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
      setMapError('Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const loadLeafletMap = () => {
    if (typeof window === 'undefined') return;
    
    // Check if Leaflet is already loaded
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }

    // Check if scripts are already being loaded
    if (document.querySelector('script[src*="leaflet.js"]')) {
      const checkInterval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkInterval);
          setMapLoaded(true);
        }
      }, 100);
      return;
    }

    try {
      // Add CSS only if not already present
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        leafletCSS.crossOrigin = '';
        document.head.appendChild(leafletCSS);
      }

      // Add JavaScript
      const leafletJS = document.createElement('script');
      leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletJS.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      leafletJS.crossOrigin = '';
      leafletJS.onload = () => {
        setMapLoaded(true);
      };
      leafletJS.onerror = () => {
        setMapError('Failed to load map library');
      };
      document.head.appendChild(leafletJS);
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      setMapError('Failed to load map library');
    }
  };

  const getActivitiesAtLocation = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && activity.locations.includes(locationId)
    );
  };

  const getSingleLocationActivities = (locationId: string): Activity[] => {
    return activities.filter(activity => 
      activity.locations && 
      activity.locations.length === 1 && 
      activity.locations.includes(locationId)
    );
  };

  const initializeMap = () => {
    if (typeof window === 'undefined' || !(window as any).L || !locations.length) {
      return;
    }

    try {
      // Clean up existing map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const L = (window as any).L;
      const container = document.getElementById(containerId);
      
      if (!container) {
        console.warn('Map container not found');
        return;
      }

      // Clear container content
      container.innerHTML = '';

      // Calculate center and zoom
      let center: [number, number] = [33.8547, 35.8623];
      let zoom = 8;
      
      if (locations.length === 1) {
        center = [locations[0].coordinates.lat, locations[0].coordinates.lng];
        zoom = 12;
      } else if (locations.length > 1) {
        const latSum = locations.reduce((sum, loc) => sum + loc.coordinates.lat, 0);
        const lngSum = locations.reduce((sum, loc) => sum + loc.coordinates.lng, 0);
        center = [latSum / locations.length, lngSum / locations.length];
        zoom = 10;
      }
      
      // Initialize map
      const newMap = L.map(containerId).setView(center, zoom);
      mapRef.current = newMap;

      // Add tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(newMap);

      // Add markers
      locations.forEach(location => {
        if (!location.coordinates || !location.coordinates.lat || !location.coordinates.lng) {
          return;
        }

        const activitiesAtLocation = getActivitiesAtLocation(location.id);
        const singleLocationActivities = getSingleLocationActivities(location.id);
        
        let markerColor = '#4CAF50';
        if (singleLocationActivities.length > 0) {
          markerColor = '#FF9800';
        }

        const marker = L.circleMarker([location.coordinates.lat, location.coordinates.lng], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.8,
          radius: 8
        }).addTo(newMap);
        
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

      // Add routes for multi-location activities
      activities.forEach(activity => {
        if (activity.locations && activity.locations.length > 1) {
          const routeCoordinates: [number, number][] = [];
          
          activity.locations.forEach(locationId => {
            const location = locations.find(loc => loc.id === locationId);
            if (location && location.coordinates) {
              routeCoordinates.push([location.coordinates.lat, location.coordinates.lng]);
            }
          });
          
          if (routeCoordinates.length > 1) {
            L.polyline(routeCoordinates, {
              color: '#FF6B35',
              weight: 3,
              dashArray: '5, 5'
            }).addTo(newMap).bindPopup(`<b>🚀 ${activity.title}</b><br><small>Multi-location activity</small>`);
          }
        }
      });

      // Fit bounds if multiple locations
      if (locations.length > 1) {
        const group = new L.featureGroup(
          locations.map(loc => 
            L.circleMarker([loc.coordinates.lat, loc.coordinates.lng])
          )
        );
        newMap.fitBounds(group.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  };

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

  if (mapError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle-outline" size={48} color={themeColors.error} />
        <Text style={[styles.errorText, { color: themeColors.error }]}>
          {mapError}
        </Text>
      </View>
    );
  }

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
        id={containerId}
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden'
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
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
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