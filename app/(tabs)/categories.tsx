import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { colors, spacing, typography, borderRadius } from '../../themes';

interface Category {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesScreen() {
  const { colors: themeColors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [searchQuery, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(categoriesQuery);
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category) => {
    router.push(`/category/${category.id}?name=${encodeURIComponent(category.name)}`);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: themeColors.surface }]}
        onPress={() => handleCategoryPress(item)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: themeColors.primary }]}>
          <Ionicons name="folder" size={32} color={themeColors.background} />
        </View>
        
        <View style={styles.categoryContent}>
          <Text style={[styles.categoryName, { color: themeColors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.categoryDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        
        <View style={styles.categoryArrow}>
          <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <MainLayout title="Categories">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading categories...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Categories">
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="search" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.searchText, { color: themeColors.text }]}
              placeholder="Search categories..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No categories found
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'Categories will appear here when added'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCategories}
            renderItem={renderCategoryItem}
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
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    ...typography.h3,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  categoryDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  categoryArrow: {
    marginLeft: spacing.sm,
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