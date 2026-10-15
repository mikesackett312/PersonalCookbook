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
  return <RecipeCollection />;
}

export function RecipeCollection({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchText, setSearchText] = useState('');

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
      !favoritesOnly || recipe.favorite === true;

    return matchesSearch && matchesFavorite;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* A simple branded index card keeps the Home header light. */}
      <View style={styles.brandCard}>
        <View style={styles.brandRule} />
        <Text accessibilityRole="header" style={styles.brandTitle}>
          Recipe Box
        </Text>
        <Text style={styles.brandSubtitle}>Cook. Remember. Share.</Text>
        <View style={styles.brandBottomRule} />
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {favoritesOnly ? 'Favorites' : 'Your Recipes'}
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
              {favoritesOnly && !searchText
                ? 'No favorites yet'
                : 'No recipes found'}
            </Text>

            <Text style={styles.emptyText}>
              {favoritesOnly && !searchText
                ? 'Tap the heart on a recipe to add it to your favorites.'
                : 'Try a different search.'}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#EDF2E9',
    paddingTop: 34,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  brandCard: {
    width: '100%',
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#D5DCCE',
    borderRadius: 12,
  },

  brandRule: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#D8B4A4',
    marginBottom: 14,
  },

  brandTitle: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: '600',
    color: '#302A25',
    textAlign: 'center',
  },

  brandSubtitle: {
    fontFamily: 'Georgia',
    fontSize: 16,
    color: '#625B54',
    textAlign: 'center',
    marginTop: 6,
  },

  brandBottomRule: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#D5DFD9',
    marginTop: 14,
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
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#D5DCCE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#302A25',
    marginBottom: 12,
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

  emptyCard: {
    backgroundColor: '#FFFAF0',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D5DCCE',
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
    backgroundColor: '#FFFAF0',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D5DCCE',
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
    backgroundColor: '#DCE5D7',
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

});
