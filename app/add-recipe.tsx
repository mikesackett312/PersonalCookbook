import {
  saveRecipe as saveRecipeToStorage,
  updateRecipe,
} from '../services/recipeStorage';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';

    export default function AddRecipeScreen() {
    const {
  id,
  name: initialName,
  rating: initialRating,
  ingredients: initialIngredients,
  instructions: initialInstructions,
  notes: initialNotes,
  photoUri: initialPhotoUri,
  category: initialCategory,
} = useLocalSearchParams<{
  id?: string;
  name?: string;
  rating?: string;
  ingredients?: string;
  instructions?: string;
  notes?: string;
  photoUri?: string;
  category?: string;
}>();

const [name, setName] = useState(initialName ?? '');
const [rating, setRating] = useState(initialRating ?? '');
const [ingredients, setIngredients] = useState(initialIngredients ?? '');
const [instructions, setInstructions] = useState(initialInstructions ?? '');
const [notes, setNotes] = useState(initialNotes ?? '');
const [photoUri, setPhotoUri] = useState(initialPhotoUri ?? '');
const [category, setCategory] = useState(initialCategory ?? '');

async function choosePhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    setPhotoUri(result.assets[0].uri);
  }
}

async function saveRecipe() {
  if (!name.trim()) {
    Alert.alert('Recipe name required', 'Please enter a name for this dish.');
    return;
  }

  try {
    const recipeToSave = {
      id: id ?? Date.now().toString(),
      name: name.trim(),
      rating: rating.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      category: category.trim(),
      photoUri,
    };

    if (id) {
      await updateRecipe(recipeToSave);
    } else {
      await saveRecipeToStorage(recipeToSave);
    }

    Alert.alert(
      id ? 'Recipe updated' : 'Recipe saved',
      id
        ? `${name} has been updated.`
        : `${name} has been added to your cookbook.`,
      [
        {
          text: 'Done',
          onPress: () => router.replace('/'),
        },
      ]
    );
  } catch {
    Alert.alert(
      'Save failed',
      'The recipe could not be saved. Please try again.'
    );
  }
}

    return (
        <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>NEW DISH</Text>
        <Text style={styles.title}>Add a Recipe</Text>
        <Text style={styles.label}>Photo</Text>

<TouchableOpacity style={styles.photoButton} onPress={choosePhoto}>
  <Text style={styles.photoButtonText}>
    {photoUri ? 'Choose a Different Photo' : 'Choose Photo'}
  </Text>
</TouchableOpacity>

{photoUri ? (
  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
) : null}

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
          placeholder={'1 lb shrimp\n2 cloves garlic\n1 cup cream'}
          placeholderTextColor="#9A938C"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.largeInput]}
        />

        <Text style={styles.label}>Instructions</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Describe how you prepared the dish."
          placeholderTextColor="#9A938C"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.largeInput]}
        />

        <Text style={styles.label}>Notes and changes for next time</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Use less salt, double the sauce, cook five minutes longer..."
          placeholderTextColor="#9A938C"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.notesInput]}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveRecipe}>
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 50,
  },
    photoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7A3E2F',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
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
  largeInput: {
    minHeight: 140,
  },
  notesInput: {
    minHeight: 105,
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