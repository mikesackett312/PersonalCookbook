import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RecipeScreen() {
  const { id, name, rating, ingredients, instructions, notes } = useLocalSearchParams<{
    id?: string
    name?: string;
    rating?: string;
    ingredients?: string;
    instructions?: string;
    notes?: string;
  }>();

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
        id,
        name,
        rating,
        ingredients,
        instructions,
        notes,
      },
    })
  }
>
  <Text style={styles.editButton}>Edit</Text>
</TouchableOpacity>
    </View>

      <Text style={styles.eyebrow}>RECIPE</Text>
      <Text style={styles.title}>{name || 'Untitled Recipe'}</Text>

      <Text style={styles.rating}>
        {rating ? '★'.repeat(Number(rating)) : 'Not rated'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.bodyText}>
          {ingredients || 'No ingredients added.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.bodyText}>
          {instructions || 'No instructions added.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.bodyText}>
          {notes || 'No notes added.'}
        </Text>
      </View>
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

editButton: {
  fontSize: 17,
  fontWeight: '700',
  color: '#7A3E2F',
},
  
  backButton: {
    fontSize: 17,
    fontWeight: '700',
    color: '#7A3E2F',
    marginBottom: 24,
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
  rating: {
    fontSize: 20,
    color: '#A96C25',
    marginBottom: 28,
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
});