import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecipePhoto = {
  id: string;
  uri: string;
};

export type Recipe = {
  id: string;
  name: string;
  rating: string;
  category?: string;
  ingredients: string;
  instructions: string;
  notes: string;
  createdAt: string;

  // v0.10 multiple-photo model
  photos?: RecipePhoto[];
  mainPhotoId?: string;

  // Legacy v0.9 single-photo field
  photoUri?: string;

  favorite?: boolean;
};

export type EditableRecipeFields = {
  name: string;
  rating: string;
  category?: string;
  ingredients: string;
  instructions: string;
  notes: string;
  photos: RecipePhoto[];
  mainPhotoId?: string;
};

const RECIPES_KEY = 'personal-cookbook-recipes';

/**
 * Returns all photos belonging to a recipe.
 *
 * Existing v0.9 recipes only have photoUri. We convert that
 * old photo into the new photo structure when reading it so
 * existing recipes continue to work without a separate migration.
 */
export function getRecipePhotos(recipe: Recipe): RecipePhoto[] {
  if (recipe.photos && recipe.photos.length > 0) {
    return recipe.photos;
  }

  if (recipe.photoUri) {
    return [
      {
        id: `legacy-${recipe.id}`,
        uri: recipe.photoUri,
      },
    ];
  }

  return [];
}

/**
 * Returns the URI of the photo that should represent the recipe.
 *
 * If no main photo has been explicitly selected, the first photo
 * automatically becomes the main photo.
 */
export function getMainPhotoUri(
  recipe: Recipe
): string | undefined {
  const photos = getRecipePhotos(recipe);

  if (photos.length === 0) {
    return undefined;
  }

  if (recipe.mainPhotoId) {
    const mainPhoto = photos.find(
      (photo) => photo.id === recipe.mainPhotoId
    );

    if (mainPhoto) {
      return mainPhoto.uri;
    }
  }

  return photos[0].uri;
}

export async function getRecipes(): Promise<Recipe[]> {
  const storedRecipes = await AsyncStorage.getItem(RECIPES_KEY);

  if (!storedRecipes) {
    return [];
  }

  return JSON.parse(storedRecipes) as Recipe[];
}

export async function saveRecipe(
  recipe: Recipe
): Promise<void> {
  const existingRecipes = await getRecipes();

  const updatedRecipes = [
    recipe,
    ...existingRecipes,
  ];

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(updatedRecipes)
  );
}

export async function updateRecipe(
  updatedRecipe: Recipe
): Promise<void> {
  const recipes = await getRecipes();

  const updatedRecipes = recipes.map((recipe) =>
    recipe.id === updatedRecipe.id
      ? {
          ...recipe,
          ...updatedRecipe,

          // These values should never be accidentally
          // replaced during a general update.
          id: recipe.id,
          createdAt:
            recipe.createdAt ||
            updatedRecipe.createdAt,
        }
      : recipe
  );

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(updatedRecipes)
  );
}

/**
 * Updates only fields controlled by the recipe edit screen.
 *
 * favorite, createdAt, id and future unrelated fields remain
 * untouched.
 */
export async function updateRecipeFields(
  id: string,
  fields: EditableRecipeFields
): Promise<void> {
  const recipes = await getRecipes();

  const updatedRecipes = recipes.map((recipe) => {
    if (recipe.id !== id) {
      return recipe;
    }

    const validMainPhotoId = fields.photos.some(
      (photo) => photo.id === fields.mainPhotoId
    )
      ? fields.mainPhotoId
      : fields.photos[0]?.id;

    const mainPhoto = fields.photos.find(
      (photo) => photo.id === validMainPhotoId
    );

    return {
      ...recipe,
      name: fields.name,
      rating: fields.rating,
      category: fields.category,
      ingredients: fields.ingredients,
      instructions: fields.instructions,
      notes: fields.notes,
      photos: fields.photos,
      mainPhotoId: validMainPhotoId,

      // Keep the legacy field synchronized for now.
      photoUri: mainPhoto?.uri,
    };
  });

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(updatedRecipes)
  );
}

export async function getRecipeById(
  id: string
): Promise<Recipe | null> {
  const recipes = await getRecipes();

  return (
    recipes.find(
      (recipe) => recipe.id === id
    ) ?? null
  );
}

export async function deleteRecipe(
  id: string
): Promise<void> {
  const recipes = await getRecipes();

  const remainingRecipes = recipes.filter(
    (recipe) => recipe.id !== id
  );

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(remainingRecipes)
  );
}

/**
 * Replaces the complete Recipe Box.
 *
 * This is intentionally separate from saveRecipe/updateRecipe.
 * It is used by backup restoration so a validated backup can
 * atomically replace the stored recipe collection.
 */
export async function replaceRecipes(
  recipes: Recipe[]
): Promise<void> {
  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(recipes)
  );
}