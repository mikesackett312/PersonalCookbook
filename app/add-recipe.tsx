import {
  getRecipeById,
  getRecipePhotos,
  Recipe,
  RecipePhoto,
  saveRecipe as saveRecipeToStorage,
  updateRecipeFields,
} from '../services/recipeStorage';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function AddRecipeScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [name, setName] = useState('');
  const [rating, setRating] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [mainPhotoId, setMainPhotoId] = useState<
    string | undefined
  >();

  useEffect(() => {
    async function loadRecipe(recipeId: string) {
      try {
        const existingRecipe = await getRecipeById(recipeId);

        if (!existingRecipe) {
          Alert.alert(
            'Recipe not found',
            'This recipe could not be loaded.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/'),
              },
            ]
          );

          return;
        }

        setName(existingRecipe.name ?? '');
        setRating(existingRecipe.rating ?? '');
        setIngredients(existingRecipe.ingredients ?? '');
        setInstructions(existingRecipe.instructions ?? '');
        setNotes(existingRecipe.notes ?? '');
        setCategory(existingRecipe.category ?? '');

        const existingPhotos = getRecipePhotos(existingRecipe);

        setPhotos(existingPhotos);

        const validMainPhoto =
          existingRecipe.mainPhotoId &&
          existingPhotos.some(
            (photo) =>
              photo.id === existingRecipe.mainPhotoId
          )
            ? existingRecipe.mainPhotoId
            : existingPhotos[0]?.id;

        setMainPhotoId(validMainPhoto);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        Alert.alert('Load failed', message);
      }
    }

    if (typeof id === 'string') {
      loadRecipe(id);
    }
  }, [id]);

  function createPhotoId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function addPhotoUris(uris: string[]) {
    if (uris.length === 0) {
      return;
    }

    const newPhotos = uris.map((uri) => ({
      id: createPhotoId(),
      uri,
    }));

    setPhotos((currentPhotos) => [
      ...currentPhotos,
      ...newPhotos,
    ]);

    setMainPhotoId(
      (currentMainPhotoId) =>
        currentMainPhotoId ?? newPhotos[0].id
    );
  }

  async function choosePhotosFromLibrary() {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

    if (!result.canceled) {
      addPhotoUris(
        result.assets.map((asset) => asset.uri)
      );
    }
  }

  async function takePhoto() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Recipe Box needs permission to use the camera before taking a recipe photo.'
      );

      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      addPhotoUris([result.assets[0].uri]);
    }
  }

  function addPhoto() {
    Alert.alert(
      'Add Photo',
      'How would you like to add a photo?',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: choosePhotosFromLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  function removePhoto(photoId: string) {
    Alert.alert(
      'Remove Photo?',
      'This photo will be removed from the recipe.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhotos((currentPhotos) => {
              const remainingPhotos =
                currentPhotos.filter(
                  (photo) => photo.id !== photoId
                );

              setMainPhotoId(
                (currentMainPhotoId) =>
                  currentMainPhotoId === photoId
                    ? remainingPhotos[0]?.id
                    : currentMainPhotoId
              );

              return remainingPhotos;
            });
          },
        },
      ]
    );
  }

  function makeMainPhoto(photoId: string) {
    setMainPhotoId(photoId);
  }

  async function saveRecipe() {
    if (!name.trim()) {
      Alert.alert(
        'Recipe name required',
        'Please enter a name for this dish.'
      );

      return;
    }

    const resolvedMainPhotoId = photos.some(
      (photo) => photo.id === mainPhotoId
    )
      ? mainPhotoId
      : photos[0]?.id;

    const mainPhoto = photos.find(
      (photo) => photo.id === resolvedMainPhotoId
    );

    try {
      if (typeof id === 'string') {
        await updateRecipeFields(id, {
          name: name.trim(),
          rating: rating.trim(),
          category: category.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          notes: notes.trim(),
          photos,
          mainPhotoId: resolvedMainPhotoId,
        });

        Alert.alert(
          'Recipe updated',
          `${name} has been updated.`,
          [
            {
              text: 'Done',
              onPress: () => router.replace('/'),
            },
          ]
        );
      } else {
        const newRecipe: Recipe = {
          id: Date.now().toString(),
          name: name.trim(),
          rating: rating.trim(),
          category: category.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
          photos,
          mainPhotoId: resolvedMainPhotoId,
          photoUri: mainPhoto?.uri,
          favorite: false,
        };

        await saveRecipeToStorage(newRecipe);

        Alert.alert(
          'Recipe saved',
          `${name} has been added to your cookbook.`,
          [
            {
              text: 'Done',
              onPress: () => router.replace('/'),
            },
          ]
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      Alert.alert('Save failed', message);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={120}
      keyboardOpeningTime={0}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>
        {typeof id === 'string'
          ? 'EDIT DISH'
          : 'NEW DISH'}
      </Text>

      <Text style={styles.title}>
        {typeof id === 'string'
          ? 'Edit Recipe'
          : 'Add a Recipe'}
      </Text>

      <Text style={styles.label}>Photos</Text>

      <TouchableOpacity
        style={styles.photoButton}
        onPress={addPhoto}
      >
        <Text style={styles.photoButtonText}>
          ＋ Add Photo
        </Text>
      </TouchableOpacity>

      {photos.length === 0 ? (
        <Text style={styles.noPhotosText}>
          No photos added yet.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoGallery}
        >
          {photos.map((photo) => {
            const isMain = photo.id === mainPhotoId;

            return (
              <View
                key={photo.id}
                style={styles.photoCard}
              >
                <View style={styles.photoImageWrapper}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoPreview}
                  />

                  {isMain ? (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>
                        MAIN
                      </Text>
                    </View>
                  ) : null}
                </View>

                {!isMain ? (
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    onPress={() =>
                      makeMainPhoto(photo.id)
                    }
                  >
                    <Text style={styles.photoActionText}>
                      Make Main
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mainPhotoIndicator}>
                    <Text
                      style={
                        styles.mainPhotoIndicatorText
                      }
                    >
                      Main Photo
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() =>
                    removePhoto(photo.id)
                  }
                >
                  <Text style={styles.removePhotoText}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.label}>Recipe name</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Example: Cajun Shrimp Pasta"
        placeholderTextColor="#9A938C"
        style={styles.input}
      />

      <Text style={styles.label}>Category</Text>

      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Example: Chicken, Soup, Dessert"
        placeholderTextColor="#9A938C"
        style={styles.input}
      />

      <Text style={styles.label}>Rating</Text>

      <TextInput
        value={rating}
        onChangeText={setRating}
        placeholder="1–5"
        placeholderTextColor="#9A938C"
        keyboardType="number-pad"
        maxLength={1}
        style={styles.input}
      />

      <Text style={styles.label}>Ingredients</Text>

      <TextInput
        value={ingredients}
        onChangeText={setIngredients}
        placeholder={
          '1 lb shrimp\n2 cloves garlic\n1 cup cream'
        }
        placeholderTextColor="#9A938C"
        multiline
        scrollEnabled
        textAlignVertical="top"
        style={[styles.input, styles.ingredientsInput]}
      />

      <Text style={styles.label}>Instructions</Text>

      <TextInput
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Describe how you prepared the dish."
        placeholderTextColor="#9A938C"
        multiline
        scrollEnabled
        textAlignVertical="top"
        style={[styles.input, styles.instructionsInput]}
      />

      <Text style={styles.label}>
        Notes and changes for next time
      </Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Use less salt, double the sauce, cook five minutes longer..."
        placeholderTextColor="#9A938C"
        multiline
        scrollEnabled
        textAlignVertical="top"
        style={[styles.input, styles.notesInput]}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveRecipe}
      >
        <Text style={styles.saveButtonText}>
          Save Recipe
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>
          Cancel
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },

  container: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 80,
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
    marginBottom: 28,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#493F37',
    marginBottom: 8,
  },

  photoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },

  photoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7A3E2F',
  },

  noPhotosText: {
    fontSize: 14,
    color: '#7B746D',
    marginBottom: 22,
  },

  photoGallery: {
    gap: 12,
    paddingBottom: 22,
  },

  photoCard: {
    width: 150,
  },

  photoImageWrapper: {
    position: 'relative',
  },

  photoPreview: {
    width: 150,
    height: 120,
    borderRadius: 14,
  },

  mainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7A3E2F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  mainBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  photoActionButton: {
    borderWidth: 1,
    borderColor: '#D9D0C6',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  photoActionText: {
    color: '#7A3E2F',
    fontSize: 13,
    fontWeight: '700',
  },

  mainPhotoIndicator: {
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 8,
  },

  mainPhotoIndicatorText: {
    color: '#7A3E2F',
    fontSize: 13,
    fontWeight: '700',
  },

  removePhotoText: {
    color: '#B24A3A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D2A26',
    marginBottom: 20,
  },

  ingredientsInput: {
    height: 160,
  },

  instructionsInput: {
    height: 180,
  },

  notesInput: {
    height: 140,
  },

  saveButton: {
    backgroundColor: '#7A3E2F',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  cancelButtonText: {
    color: '#7A3E2F',
    fontSize: 16,
    fontWeight: '700',
  },
});