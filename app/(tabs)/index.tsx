import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getMainPhotoUri,
  getRecipes,
  Recipe,
} from '../../services/recipeStorage';

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] =
    useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadRecipes() {
        const savedRecipes = await getRecipes();
        setRecipes(savedRecipes);
      }

      loadRecipes();
    }, [])
  );

  const favoriteCount = recipes.filter(
    (recipe) => recipe.favorite === true
  ).length;

  const filteredRecipes = recipes.filter((recipe) => {
    const search = searchText.toLowerCase().trim();

    const matchesSearch =
      !search ||
      recipe.name.toLowerCase().includes(search) ||
      recipe.ingredients.toLowerCase().includes(search) ||
      recipe.notes.toLowerCase().includes(search) ||
      recipe.category?.toLowerCase().includes(search);

    const matchesFavorite =
      !showFavoritesOnly || recipe.favorite === true;

    return matchesSearch && matchesFavorite;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Modern Heirloom brand label */}
      <View style={styles.brandLabel}>
        <View style={styles.brandLabelInner}>
          <Text style={styles.title}>Recipe Box</Text>

          <Text style={styles.tagline}>
            Cook. Remember. Share.
          </Text>
        </View>
      </View>

      {/* Collection count */}
      <View style={styles.collectionRow}>
        <Text style={styles.collectionText}>
          <Text style={styles.collectionNumber}>
            {recipes.length}
          </Text>{' '}
          {recipes.length === 1 ? 'Recipe' : 'Recipes'}
          <Text style={styles.collectionDot}>  ·  </Text>
          <Text style={styles.collectionNumber}>
            {favoriteCount}
          </Text>{' '}
          {favoriteCount === 1 ? 'Favorite' : 'Favorites'}
        </Text>
      </View>

      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search recipes..."
        placeholderTextColor="#9A938C"
        style={styles.searchInput}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            !showFavoritesOnly && styles.filterButtonActive,
          ]}
          onPress={() => setShowFavoritesOnly(false)}
        >
          <Text
            style={[
              styles.filterButtonText,
              !showFavoritesOnly &&
                styles.filterButtonTextActive,
            ]}
          >
            All Recipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            showFavoritesOnly && styles.filterButtonActive,
          ]}
          onPress={() => setShowFavoritesOnly(true)}
        >
          <Text
            style={[
              styles.filterButtonText,
              showFavoritesOnly &&
                styles.filterButtonTextActive,
            ]}
          >
            ♥ Favorites
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/add-recipe')}
      >
        <Text style={styles.primaryButtonText}>
          ＋ Add a Recipe
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>
          ▦ Meal Plan
        </Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {showFavoritesOnly ? 'Favorites' : 'Recently Added'}
        </Text>

        <Text style={styles.sectionLink}>
          {filteredRecipes.length}
        </Text>
      </View>

      {recipes.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No recipes saved yet
          </Text>

          <Text style={styles.emptyText}>
            Capture your first dish and it will appear here.
          </Text>
        </View>
      )}

      {recipes.length > 0 &&
        filteredRecipes.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {showFavoritesOnly && !searchText
                ? 'No favorites yet'
                : 'No recipes found'}
            </Text>

            <Text style={styles.emptyText}>
              {showFavoritesOnly && !searchText
                ? 'Tap the heart on a recipe to add it to your favorites.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        )}

      {filteredRecipes.map((recipe) => {
        const mainPhotoUri = getMainPhotoUri(recipe);

        return (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() =>
              router.push({
                pathname: '/recipe',
                params: {
                  id: recipe.id,
                },
              })
            }
          >
            {mainPhotoUri ? (
              <Image
                source={{ uri: mainPhotoUri }}
                style={styles.recipeImage}
              />
            ) : (
              <View style={styles.recipeImagePlaceholder}>
                <Text style={styles.recipeImageText}>
                  Dish photo
                </Text>
              </View>
            )}

            <View style={styles.recipeDetails}>
              <View style={styles.recipeTitleRow}>
                <Text style={styles.recipeName}>
                  {recipe.name}
                </Text>

                {recipe.favorite ? (
                  <Text style={styles.favoriteHeart}>♥</Text>
                ) : null}
              </View>

              {recipe.category ? (
                <Text style={styles.category}>
                  {recipe.category}
                </Text>
              ) : null}

              <Text style={styles.rating}>
                {recipe.rating
                  ? '★'.repeat(Number(recipe.rating))
                  : 'Not rated'}
              </Text>

              <Text style={styles.recipeNote}>
                Tap to view recipe
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.memoryCard}>
        <Text style={styles.memoryLabel}>
          FROM YOUR COOKING MEMORY
        </Text>

        <Text style={styles.memoryTitle}>
          Rediscover a forgotten favorite
        </Text>

        <Text style={styles.memoryText}>
          As your recipe box grows, this space will remind
          you about highly rated dishes you have not made
          recently.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F3EC',
    paddingTop: 64,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // Modern Heirloom brand label
  brandLabel: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#CDBDA9',
    padding: 5,
    marginBottom: 12,
  },

  brandLabelInner: {
    borderWidth: 1,
    borderColor: '#E3D8CA',
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  title: {
    fontFamily: 'Georgia',
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -1,
    color: '#302A25',
  },

  tagline: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.4,
    color: '#7A3E2F',
    marginTop: 7,
  },

  collectionRow: {
    alignItems: 'center',
    marginBottom: 20,
  },

  collectionText: {
    fontSize: 13,
    color: '#766D64',
  },

  collectionNumber: {
    fontWeight: '800',
    color: '#7A3E2F',
  },

  collectionDot: {
    color: '#A79C91',
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED4C7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#302A25',
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  filterButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D0C6',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },

  filterButtonActive: {
    backgroundColor: '#7A3E2F',
    borderColor: '#7A3E2F',
  },

  filterButtonText: {
    color: '#625B54',
    fontSize: 14,
    fontWeight: '700',
  },

  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  primaryButton: {
    backgroundColor: '#7A3E2F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DED4C7',
    marginBottom: 26,
  },

  secondaryButtonText: {
    color: '#493F37',
    fontSize: 15,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '600',
    color: '#302A25',
  },

  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A5A44',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9E2D9',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7B746D',
  },

  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9E2D9',
  },

  recipeImage: {
    width: 105,
    minHeight: 110,
  },

  recipeImagePlaceholder: {
    width: 105,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDD0C2',
  },

  recipeImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#765D4D',
  },

  recipeDetails: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },

  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  recipeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 5,
  },

  favoriteHeart: {
    fontSize: 18,
    color: '#7A3E2F',
  },

  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A3E2F',
    marginBottom: 4,
  },

  rating: {
    fontSize: 16,
    color: '#A96C25',
    marginBottom: 6,
  },

  recipeNote: {
    fontSize: 13,
    color: '#7B746D',
  },

  memoryCard: {
    backgroundColor: '#E7DED0',
    borderRadius: 18,
    padding: 20,
    marginTop: 12,
  },

  memoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: '#7A3E2F',
    marginBottom: 8,
  },

  memoryTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '600',
    color: '#302A25',
    marginBottom: 8,
  },

  memoryText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#625B54',
  },
});