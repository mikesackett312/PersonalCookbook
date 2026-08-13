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
  View
} from 'react-native';
import { getRecipes, Recipe } from '../../services/recipeStorage';


export default function HomeScreen() {
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
  const filteredRecipes = recipes.filter((recipe) => {
  const search = searchText.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    recipe.name.toLowerCase().includes(search) ||
    recipe.ingredients.toLowerCase().includes(search) ||
    recipe.notes.toLowerCase().includes(search)
  );
});
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>MY KITCHEN</Text>
      <Text style={styles.title}>Recipe Box</Text>
      <Text style={styles.subtitle}>
        Save the dishes you create, remember what worked, and keep your favorites close at hand.
      </Text>
      <TextInput
  value={searchText}
  onChangeText={setSearchText}
  placeholder="Search recipes..."
  placeholderTextColor="#9A938C"
  style={styles.searchInput}
/>

  <TouchableOpacity
    style={styles.primaryButton}
    onPress={() => router.push('/add-recipe')}
>
  <Text style={styles.primaryButtonText}>＋ Add a Recipe</Text>
</TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>⌕ Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>▦ Meal Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently Added</Text>
        <Text style={styles.sectionLink}>See all</Text>
      </View>

      {recipes.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No recipes saved yet</Text>
          <Text style={styles.emptyText}>
            Capture your first dish and it will appear here.
        </Text>
      </View>
      )}
      {recipes.length > 0 && filteredRecipes.length === 0 && (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyTitle}>No recipes found</Text>
    <Text style={styles.emptyText}>
      Try a different search.
    </Text>
  </View>
)}
      {filteredRecipes.map((recipe) => (
        <TouchableOpacity
  key={recipe.id}
  style={styles.recipeCard}
  onPress={() =>
    router.push({
      pathname: '/recipe',
      params: {
        id: recipe.id,
        name: recipe.name,
        rating: recipe.rating,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        notes: recipe.notes,
        photoUri: recipe.photoUri,
      },
    })
  }
>
          {recipe.photoUri ? (
  <Image source={{ uri: recipe.photoUri }} style={styles.recipeImage} />
) : (
  <View style={styles.recipeImagePlaceholder}>
    <Text style={styles.recipeImageText}>Dish photo</Text>
  </View>
)}

          <View style={styles.recipeDetails}>
            <Text style={styles.recipeName}>{recipe.name}</Text>

            {recipe.category ? (
  <Text style={styles.category}>{recipe.category}</Text>
) : null}

            <Text style={styles.rating}>
  {recipe.rating ? '★'.repeat(Number(recipe.rating)) : 'Not rated'}
</Text>
            <Text style={styles.recipeNote}>Tap to view recipe</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.memoryCard}>
        <Text style={styles.memoryLabel}>FROM YOUR COOKING MEMORY</Text>
        <Text style={styles.memoryTitle}>Rediscover a forgotten favorite</Text>
        <Text style={styles.memoryText}>
          As your cookbook grows, this space will remind you about highly rated dishes you have not
          made recently.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F3EC',
    paddingTop: 72,
    paddingHorizontal: 22,
    paddingBottom: 40,
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#67615A',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#7A3E2F',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5DED4',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A26',
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
  recipeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 5,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 8,
  },
  memoryText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#625B54',
  },
  searchInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E4DCD2',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: '#2D2A26',
  marginBottom: 18,
},
});