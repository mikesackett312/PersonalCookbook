import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecipePhoto = {
  id: string;
  uri: string;
};

export type RecipeSourceType =
  | 'manual'
  | 'migration'
  | 'photo'
  | 'screenshot'
  | 'voice'
  | 'import';

export type RecipeSource = {
  type: RecipeSourceType;
};

export type RecipeIngredient = {
  id: string;

  /**
   * v0.14 keeps these as strings in the editor so users can
   * enter cookbook-friendly values such as:
   *
   * 1
   * 1/2
   * 1 1/2
   * ¼
   *
   * A future layer can normalize these for scaling/math
   * without changing the entry experience.
   */
  quantity: string;

  /**
   * Standardized unit value when one is available.
   * An empty string means no unit.
   */
  unit: string;

  /**
   * The ingredient description as the user sees it.
   *
   * Examples:
   * yellow onion, diced
   * kosher salt
   * all-purpose flour
   */
  ingredient: string;

  /**
   * Original text is retained when useful, particularly
   * for migrated/imported recipes.
   */
  sourceText?: string;
};

export type RecipeStep = {
  id: string;
  text: string;
};

export type RecipeComponent = {
  id: string;

  /**
   * Empty string means this is the ordinary/default section.
   *
   * Named examples:
   * Roux
   * Sauce
   * Filling
   * Topping
   */
  name: string;

  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type Recipe = {
  id: string;
  name: string;
  rating: string;
  category?: string;

  /**
   * Legacy/plain-text fields remain during the v0.14
   * transition so older screens, search, and backups
   * continue to work safely.
   */
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

  /**
   * v0.14 structured recipe model.
   *
   * Optional during the migration period so recipes created
   * by older app versions can still be read safely.
   */
  components?: RecipeComponent[];

  /**
   * Lightweight provenance information for future import,
   * screenshot, photo, and voice workflows.
   */
  source?: RecipeSource;
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

  /**
   * The current v0.13-style editor does not supply this yet.
   * v0.14's structured editor will.
   */
  components?: RecipeComponent[];
};

const RECIPES_KEY = 'personal-cookbook-recipes';

/**
 * Create deterministic IDs while migrating legacy recipes.
 *
 * Deterministic IDs are preferable here because repeatedly
 * reading an old recipe should not generate a new set of IDs.
 */
function legacyComponentId(recipeId: string): string {
  return `${recipeId}-component-1`;
}

function legacyIngredientId(
  recipeId: string,
  index: number
): string {
  return `${recipeId}-ingredient-${index + 1}`;
}

function legacyStepId(
  recipeId: string,
  index: number
): string {
  return `${recipeId}-step-${index + 1}`;
}

/**
 * Splits legacy ingredient text conservatively.
 *
 * We intentionally do NOT try to guess quantity/unit yet.
 * Preserving the user's recipe accurately is more important
 * than pretending we understand ambiguous text.
 */
function migrateLegacyIngredients(
  recipeId: string,
  text: string
): RecipeIngredient[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => ({
    id: legacyIngredientId(recipeId, index),
    quantity: '',
    unit: '',
    ingredient: line,
    sourceText: line,
  }));
}

/**
 * Removes simple existing numbering/bullets from legacy
 * instructions when the instructions are already separated
 * into lines.
 *
 * We do NOT split prose into sentences. A paragraph remains
 * one step rather than risking a destructive migration.
 */
function cleanLegacyStepText(text: string): string {
  return text
    .replace(/^\s*\d+\s*[.)-]\s*/, '')
    .replace(/^\s*[-•]\s*/, '')
    .trim();
}

function migrateLegacySteps(
  recipeId: string,
  text: string
): RecipeStep[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanLegacyStepText(line))
    .filter((line) => line.length > 0);

  if (lines.length === 0 && text.trim()) {
    return [
      {
        id: legacyStepId(recipeId, 0),
        text: text.trim(),
      },
    ];
  }

  return lines.map((line, index) => ({
    id: legacyStepId(recipeId, index),
    text: line,
  }));
}

/**
 * Returns true when structured content already exists.
 */
export function hasStructuredRecipe(
  recipe: Recipe
): boolean {
  return Boolean(
    recipe.components &&
      recipe.components.length > 0
  );
}

/**
 * Builds a safe default component from the legacy text
 * fields.
 *
 * Existing information is preserved rather than aggressively
 * parsed.
 */
export function buildDefaultComponentFromLegacy(
  recipeId: string,
  ingredients: string,
  instructions: string
): RecipeComponent {
  return {
    id: legacyComponentId(recipeId),
    name: '',
    ingredients: migrateLegacyIngredients(
      recipeId,
      ingredients
    ),
    steps: migrateLegacySteps(
      recipeId,
      instructions
    ),
  };
}

/**
 * Ensures a Recipe has the v0.14 structured foundation.
 *
 * This does not delete or replace the legacy ingredient /
 * instruction strings.
 */
export function normalizeRecipe(
  recipe: Recipe
): Recipe {
  if (
    recipe.components &&
    recipe.components.length > 0
  ) {
    return recipe;
  }

  return {
    ...recipe,
    components: [
      buildDefaultComponentFromLegacy(
        recipe.id,
        recipe.ingredients ?? '',
        recipe.instructions ?? ''
      ),
    ],
    source:
      recipe.source ?? {
        type: 'migration',
      },
  };
}

export function normalizeRecipes(
  recipes: Recipe[]
): Recipe[] {
  return recipes.map(normalizeRecipe);
}

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

  const parsedRecipes =
    JSON.parse(storedRecipes) as Recipe[];

  /**
   * Normalize on read.
   *
   * We deliberately do not rewrite AsyncStorage here.
   * Existing data remains untouched until a recipe is
   * intentionally saved/updated or a backup is restored.
   */
  return normalizeRecipes(parsedRecipes);
}

export async function saveRecipe(
  recipe: Recipe
): Promise<void> {
  const existingRecipes = await getRecipes();

  const normalizedRecipe =
    normalizeRecipe(recipe);

  const updatedRecipes = [
    normalizedRecipe,
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

  const normalizedUpdatedRecipe =
    normalizeRecipe(updatedRecipe);

  const updatedRecipes = recipes.map((recipe) =>
    recipe.id === normalizedUpdatedRecipe.id
      ? {
          ...recipe,
          ...normalizedUpdatedRecipe,

          // These values should never be accidentally
          // replaced during a general update.
          id: recipe.id,
          createdAt:
            recipe.createdAt ||
            normalizedUpdatedRecipe.createdAt,
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

    /**
     * Until the structured v0.14 editor is installed,
     * edits still arrive as legacy strings.
     *
     * Rebuild the default structured component so the new
     * structure never becomes stale relative to the text.
     */
    const resolvedComponents =
      fields.components &&
      fields.components.length > 0
        ? fields.components
        : [
            buildDefaultComponentFromLegacy(
              id,
              fields.ingredients,
              fields.instructions
            ),
          ];

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
      components: resolvedComponents,

      source:
        recipe.source ?? {
          type: 'migration' as const,
        },

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
  const normalizedRecipes =
    normalizeRecipes(recipes);

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(normalizedRecipes)
  );
}