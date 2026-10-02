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
    getMainPhotoUri,
    getRecipeById,
    getRecipePhotos,
    Recipe,
    updateRecipe,
} from '../services/recipeStorage';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [recipe, setRecipe] =
    useState<Recipe | null>(null);

  const [selectedPhotoId, setSelectedPhotoId] =
    useState<string | undefined>();

  useEffect(() => {
    async function loadRecipe(recipeId: string) {
      const savedRecipe =
        await getRecipeById(recipeId);

      setRecipe(savedRecipe);

      if (savedRecipe) {
        const photos =
          getRecipePhotos(savedRecipe);

        const initialPhotoId =
          savedRecipe.mainPhotoId &&
          photos.some(
            (photo) =>
              photo.id === savedRecipe.mainPhotoId
          )
            ? savedRecipe.mainPhotoId
            : photos[0]?.id;

        setSelectedPhotoId(initialPhotoId);
      }
    }

    if (typeof id === 'string') {
      loadRecipe(id);
    }
  }, [id]);

  function confirmDelete() {
    if (!recipe?.id) {
      return;
    }

    Alert.alert(
      'Delete Recipe?',
      `Are you sure you want to delete ${
        recipe.name || 'this recipe'
      }?`,
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

  function editRecipe() {
    if (!recipe) {
      return;
    }

    router.push({
      pathname: '/add-recipe',
      params: {
        id: recipe.id,
      },
    });
  }

  const photos = recipe
    ? getRecipePhotos(recipe)
    : [];

  const mainPhotoUri = recipe
    ? getMainPhotoUri(recipe)
    : undefined;

  const selectedPhoto =
    photos.find(
      (photo) => photo.id === selectedPhotoId
    ) ??
    photos.find(
      (photo) => photo.uri === mainPhotoUri
    ) ??
    photos[0];

  let stepNumber = 0;
  const structuredSections = recipe?.components?.map((component) => ({
    id: component.id,
    name: component.name.trim(),
    ingredients: component.ingredients
      .map((ingredient) =>
        [ingredient.quantity, ingredient.unit, ingredient.ingredient]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(' ')
      )
      .filter(Boolean)
      .join('\n'),
    instructions: component.steps
      .map((step) => step.text.trim())
      .filter(Boolean)
      .map((text) => `${++stepNumber}. ${text}`)
      .join('\n\n'),
  }));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <View style={styles.topButtons}>
        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Text style={styles.backButton}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={editRecipe}
          disabled={!recipe}
        >
          <Text style={styles.editButton}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.eyebrow}>RECIPE</Text>

      <Text style={styles.title}>
        {recipe?.name || 'Untitled Recipe'}
      </Text>

      {recipe?.category ? (
        <Text style={styles.category}>
          {recipe.category}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={toggleFavorite}
        disabled={!recipe}
      >
        <Text style={styles.favoriteButton}>
          {recipe?.favorite
            ? '♥ Favorite'
            : '♡ Add to Favorites'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.rating}>
        {recipe?.rating
          ? '★'.repeat(Number(recipe.rating))
          : 'Not rated'}
      </Text>

      {selectedPhoto ? (
        <>
          <Image
            source={{ uri: selectedPhoto.uri }}
            style={styles.recipePhoto}
          />

          {photos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.thumbnailRow
              }
            >
              {photos.map((photo) => {
                const isSelected =
                  photo.id === selectedPhoto.id;

                const isMain =
                  photo.uri === mainPhotoUri;

                return (
                  <TouchableOpacity
                    key={photo.id}
                    style={[
                      styles.thumbnailWrapper,
                      isSelected &&
                        styles.thumbnailSelected,
                    ]}
                    onPress={() =>
                      setSelectedPhotoId(
                        photo.id
                      )
                    }
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.thumbnail}
                    />

                    {isMain ? (
                      <View
                        style={
                          styles.thumbnailMainBadge
                        }
                      >
                        <Text
                          style={
                            styles.thumbnailMainBadgeText
                          }
                        >
                          MAIN
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {structuredSections && structuredSections.length > 0 ? (
        structuredSections.map((component) => (
          <View key={component.id}>
            {component.name ? (
              <Text style={styles.componentTitle}>
                {component.name}
              </Text>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.bodyText}>
                {component.ingredients || 'No ingredients added.'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.bodyText}>
                {component.instructions || 'No instructions added.'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ingredients
            </Text>

            <Text style={styles.bodyText}>
              {recipe?.ingredients ||
                'No ingredients added.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Instructions
            </Text>

            <Text style={styles.bodyText}>
              {recipe?.instructions ||
                'No instructions added.'}
            </Text>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Notes
        </Text>

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

  favoriteButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7A3E2F',
    marginBottom: 14,
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
    marginBottom: 12,
  },

  thumbnailRow: {
    gap: 10,
    paddingBottom: 24,
  },

  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },

  thumbnailSelected: {
    borderColor: '#7A3E2F',
  },

  thumbnail: {
    width: 76,
    height: 62,
    borderRadius: 9,
  },

  thumbnailMainBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: '#7A3E2F',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  thumbnailMainBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9E2D9',
  },

  componentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7A3E2F',
    marginTop: 8,
    marginBottom: 12,
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
});
