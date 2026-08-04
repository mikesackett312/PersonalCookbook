import AsyncStorage from '@react-native-async-storage/async-storage';

export type Recipe = {
  id: string;
  name: string;
  rating: string;
  ingredients: string;
  instructions: string;
  notes: string;
  createdAt: string;
};

const RECIPES_KEY = 'personal-cookbook-recipes';

export async function getRecipes(): Promise<Recipe[]> {
  const storedRecipes = await AsyncStorage.getItem(RECIPES_KEY);

  if (!storedRecipes) {
    return [];
  }

  return JSON.parse(storedRecipes) as Recipe[];
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const existingRecipes = await getRecipes();
  const updatedRecipes = [recipe, ...existingRecipes];

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(updatedRecipes)
  );
}
export async function updateRecipe(updatedRecipe: Recipe): Promise<void> {
  const recipes = await getRecipes();

  const updatedRecipes = recipes.map((recipe) =>
    recipe.id === updatedRecipe.id ? updatedRecipe : recipe
  );

  await AsyncStorage.setItem(
    RECIPES_KEY,
    JSON.stringify(updatedRecipes)
  );
}