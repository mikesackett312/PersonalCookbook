import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    deleteRecipe,
    getRecipeById,
    Recipe,
    updateRecipe,
} from '../services/recipeStorage';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    getRecipeById(id).then(setRecipe);
  }, [id]);

  function confirmDelete() {
    if (!recipe?.id) {
      return;
    }

    Alert.alert(
      'Delete Recipe?',
      `Are you sure you want to delete ${recipe.name || 'this recipe'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipe(recipe.id);
            router.replace('/');
          },
        },
      ]
    );
  }

  async function toggleFavorite() {
    if (!recipe) {
      return;
    }

    const updatedRecipe = {
      ...recipe,
      favorite: !recipe.favorite,
    };

    await updateRecipe(updatedRecipe);
    setRecipe(updatedRecipe);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topButtons}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/add-recipe',
              params: {
                id: recipe?.id,
                name: recipe?.name,
                rating: recipe?.rating,
                ingredients: recipe?.ingredients,
                instructions: recipe?.instructions,
                notes: recipe?.notes,
                photoUri: recipe?.photoUri,
                category: recipe?.category,
              },
            })
          }
          disabled={!recipe}
        >
          <Text style={styles.editButton}>Edit</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.eyebrow}>RECIPE</Text>

      <Text style={styles.title}>
        {recipe?.name || 'Untitled Recipe'}
      </Text>

      {recipe?.category ? (
        <Text style={styles.category}>{recipe.category}</Text>
      ) : null}

        <TouchableOpacity onPress={toggleFavorite}>
        <Text style={styles.favoriteButton}>
            {recipe?.favorite ? '♥ Favorite' : '♡ Add to Favorites'}
        </Text>
        </TouchableOpacity>

      <Text style={styles.rating}>
        {recipe?.rating
          ? '★'.repeat(Number(recipe.rating))
          : 'Not rated'}
      </Text>

      {recipe?.photoUri ? (
        <Image
          source={{ uri: recipe.photoUri }}
          style={styles.recipePhoto}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.bodyText}>
          {recipe?.ingredients || 'No ingredients added.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.bodyText}>
          {recipe?.instructions || 'No instructions added.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.bodyText}>
          {recipe?.notes || 'No notes added.'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
        disabled={!recipe}
      >
        <Text style={styles.deleteButtonText}>
          Delete Recipe
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F3EC',
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 50,
  },

  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    fontSize: 17,
    fontWeight: '700',
    color: '#7A3E2F',
  },

  editButton: {
    fontSize: 17,
    fontWeight: '700',
    color: '#7A3E2F',
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8A5A44',
    marginBottom: 8,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 6,
  },

  category: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A3E2F',
    marginBottom: 10,
  },

  rating: {
    fontSize: 20,
    color: '#A96C25',
    marginBottom: 28,
  },

  recipePhoto: {
    width: '100%',
    height: 260,
    borderRadius: 18,
    marginBottom: 24,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9E2D9',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 10,
  },

  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5F5851',
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#B24A3A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  deleteButtonText: {
    color: '#B24A3A',
    fontSize: 16,
    fontWeight: '700',
  },

  favoriteButton: {
  fontSize: 16,
  fontWeight: '700',
  color: '#7A3E2F',
  marginBottom: 14,
},
});