import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface Activity {
  id: string;
  title: string;
  description: string;
  ageGroup: string;
  difficulty: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  estimatedDuration: number;
  currentParticipants: number;
  locations: string[];
  tags: string[];
  isActive: boolean;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FavoritesContextType {
  favorites: Location[];
  favoriteActivities: Activity[];
  toggleFavorite: (location: Location) => Promise<void>;
  toggleActivityFavorite: (activity: Activity) => Promise<void>;
  isFavorite: (locationId: string) => boolean;
  isActivityFavorite: (activityId: string) => boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = '@meshwar_favorites';
const ACTIVITY_FAVORITES_STORAGE_KEY = '@meshwar_activity_favorites';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [favoriteActivities, setFavoriteActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const [storedFavorites, storedActivityFavorites] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_STORAGE_KEY),
        AsyncStorage.getItem(ACTIVITY_FAVORITES_STORAGE_KEY)
      ]);
      
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
      
      if (storedActivityFavorites) {
        setFavoriteActivities(JSON.parse(storedActivityFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: Location[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const saveActivityFavorites = async (newFavorites: Activity[]) => {
    try {
      await AsyncStorage.setItem(ACTIVITY_FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavoriteActivities(newFavorites);
    } catch (error) {
      console.error('Error saving activity favorites:', error);
    }
  };

  const toggleFavorite = async (location: Location) => {
    const isFav = favorites.some(fav => fav.id === location.id);
    let newFavorites: Location[];

    if (isFav) {
      newFavorites = favorites.filter(fav => fav.id !== location.id);
    } else {
      newFavorites = [...favorites, location];
    }

    await saveFavorites(newFavorites);
  };

  const toggleActivityFavorite = async (activity: Activity) => {
    const isFav = favoriteActivities.some(fav => fav.id === activity.id);
    let newFavorites: Activity[];

    if (isFav) {
      newFavorites = favoriteActivities.filter(fav => fav.id !== activity.id);
    } else {
      newFavorites = [...favoriteActivities, activity];
    }

    await saveActivityFavorites(newFavorites);
  };

  const isFavorite = (locationId: string) => {
    return favorites.some(fav => fav.id === locationId);
  };

  const isActivityFavorite = (activityId: string) => {
    return favoriteActivities.some(fav => fav.id === activityId);
  };

  const value = {
    favorites,
    favoriteActivities,
    toggleFavorite,
    toggleActivityFavorite,
    isFavorite,
    isActivityFavorite,
    loading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 