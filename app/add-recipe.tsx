import {
  getRecipeById,
  getRecipePhotos,
  Recipe,
  RecipeComponent,
  RecipeIngredient,
  RecipePhoto,
  RecipeStep,
  saveRecipe as saveRecipeToStorage,
  updateRecipeFields,
} from '../services/recipeStorage';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const STANDARD_UNITS = [
  '',
  'tsp',
  'Tbsp',
  'cup',
  'oz',
  'lb',
  'g',
  'kg',
  'mL',
  'L',
  'pinch',
  'dash',
  'clove',
  'can',
  'package',
  'bunch',
  'slice',
  'piece',
];

type UnitTarget = {
  componentId: string;
  ingredientId: string;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function createBlankIngredient(): RecipeIngredient {
  return {
    id: createId('ingredient'),
    quantity: '',
    unit: '',
    ingredient: '',
  };
}

function createBlankStep(): RecipeStep {
  return {
    id: createId('step'),
    text: '',
  };
}

function createBlankComponent(): RecipeComponent {
  return {
    id: createId('component'),
    name: '',
    ingredients: [createBlankIngredient()],
    steps: [createBlankStep()],
  };
}

/**
 * Earlier v0.14 testing allowed multiple instruction lines
 * to be typed into one RecipeStep.
 *
 * Split those into individual editor steps so existing test
 * recipes immediately behave correctly in this revised UI.
 */
function expandStepsForEditor(
  steps: RecipeStep[]
): RecipeStep[] {
  const expanded: RecipeStep[] = [];

  steps.forEach((step) => {
    const lines = step.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      expanded.push({
        ...step,
        text: lines[0] ?? '',
      });

      return;
    }

    lines.forEach((line, index) => {
      expanded.push({
        id:
          index === 0
            ? step.id
            : `${step.id}-${index + 1}`,
        text: line,
      });
    });
  });

  return expanded.length > 0
    ? expanded
    : [createBlankStep()];
}

function formatIngredientLine(
  ingredient: RecipeIngredient
): string {
  return [
    ingredient.quantity.trim(),
    ingredient.unit.trim(),
    ingredient.ingredient.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function componentsToLegacyIngredients(
  components: RecipeComponent[]
): string {
  const sections: string[] = [];

  components.forEach((component) => {
    const lines = component.ingredients
      .map(formatIngredientLine)
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    const sectionLines: string[] = [];

    if (component.name.trim()) {
      sectionLines.push(component.name.trim());
    }

    sectionLines.push(...lines);

    sections.push(sectionLines.join('\n'));
  });

  return sections.join('\n\n');
}

function componentsToLegacyInstructions(
  components: RecipeComponent[]
): string {
  const sections: string[] = [];
  let stepNumber = 1;

  components.forEach((component) => {
    const validSteps = component.steps.filter(
      (step) => step.text.trim().length > 0
    );

    if (validSteps.length === 0) {
      return;
    }

    const sectionLines: string[] = [];

    if (component.name.trim()) {
      sectionLines.push(component.name.trim());
    }

    validSteps.forEach((step) => {
      sectionLines.push(
        `${stepNumber}. ${step.text.trim()}`
      );

      stepNumber += 1;
    });

    sections.push(sectionLines.join('\n'));
  });

  return sections.join('\n\n');
}

function cleanComponentsForSave(
  components: RecipeComponent[]
): RecipeComponent[] {
  return components.map((component) => ({
    ...component,

    name: component.name.trim(),

    ingredients: component.ingredients
      .map((ingredient) => ({
        ...ingredient,
        quantity: ingredient.quantity.trim(),
        unit: ingredient.unit.trim(),
        ingredient: ingredient.ingredient.trim(),
      }))
      .filter(
        (ingredient) =>
          ingredient.quantity ||
          ingredient.unit ||
          ingredient.ingredient
      ),

    steps: component.steps
      .map((step) => ({
        ...step,
        text: step.text.trim(),
      }))
      .filter((step) => step.text.length > 0),
  }));
}

export default function AddRecipeScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [name, setName] = useState('');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

  const [components, setComponents] = useState<
    RecipeComponent[]
  >([createBlankComponent()]);

  const [photos, setPhotos] = useState<RecipePhoto[]>([]);

  const [mainPhotoId, setMainPhotoId] = useState<
    string | undefined
  >();

  const [unitTarget, setUnitTarget] =
    useState<UnitTarget | null>(null);

  useEffect(() => {
    async function loadRecipe(recipeId: string) {
      try {
        const existingRecipe =
          await getRecipeById(recipeId);

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
        setNotes(existingRecipe.notes ?? '');
        setCategory(existingRecipe.category ?? '');

        if (
          existingRecipe.components &&
          existingRecipe.components.length > 0
        ) {
          setComponents(
            existingRecipe.components.map(
              (component) => ({
                ...component,

                ingredients:
                  component.ingredients.length > 0
                    ? component.ingredients.map(
                        (ingredient) => ({
                          ...ingredient,
                        })
                      )
                    : [createBlankIngredient()],

                steps: expandStepsForEditor(
                  component.steps
                ),
              })
            )
          );
        } else {
          setComponents([createBlankComponent()]);
        }

        const existingPhotos =
          getRecipePhotos(existingRecipe);

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
    return createId('photo');
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

  function updateComponentName(
    componentId: string,
    value: string
  ) {
    setComponents((current) =>
      current.map((component) =>
        component.id === componentId
          ? {
              ...component,
              name: value,
            }
          : component
      )
    );
  }

  function updateIngredient(
    componentId: string,
    ingredientId: string,
    field:
      | 'quantity'
      | 'unit'
      | 'ingredient',
    value: string
  ) {
    setComponents((current) =>
      current.map((component) =>
        component.id === componentId
          ? {
              ...component,
              ingredients:
                component.ingredients.map(
                  (ingredient) =>
                    ingredient.id === ingredientId
                      ? {
                          ...ingredient,
                          [field]: value,
                        }
                      : ingredient
                ),
            }
          : component
      )
    );
  }

  function addIngredient(componentId: string) {
    setComponents((current) =>
      current.map((component) =>
        component.id === componentId
          ? {
              ...component,
              ingredients: [
                ...component.ingredients,
                createBlankIngredient(),
              ],
            }
          : component
      )
    );
  }

  function removeIngredient(
    componentId: string,
    ingredientId: string
  ) {
    setComponents((current) =>
      current.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const remaining =
          component.ingredients.filter(
            (ingredient) =>
              ingredient.id !== ingredientId
          );

        return {
          ...component,
          ingredients:
            remaining.length > 0
              ? remaining
              : [createBlankIngredient()],
        };
      })
    );
  }

  function moveIngredient(
    componentId: string,
    ingredientIndex: number,
    direction: -1 | 1
  ) {
    setComponents((current) =>
      current.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const targetIndex =
          ingredientIndex + direction;

        if (
          targetIndex < 0 ||
          targetIndex >= component.ingredients.length
        ) {
          return component;
        }

        const ingredients = [
          ...component.ingredients,
        ];

        const [moved] = ingredients.splice(
          ingredientIndex,
          1
        );

        ingredients.splice(
          targetIndex,
          0,
          moved
        );

        return {
          ...component,
          ingredients,
        };
      })
    );
  }

  function updateStep(
    componentId: string,
    stepId: string,
    value: string
  ) {
    /**
     * Prevent a pasted/newline-separated block from becoming
     * multiple invisible actions inside one numbered step.
     */
    const cleanValue = value.replace(/\r?\n/g, ' ');

    setComponents((current) =>
      current.map((component) =>
        component.id === componentId
          ? {
              ...component,
              steps: component.steps.map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      text: cleanValue,
                    }
                  : step
              ),
            }
          : component
      )
    );
  }

  function addStep(componentId: string) {
    setComponents((current) =>
      current.map((component) =>
        component.id === componentId
          ? {
              ...component,
              steps: [
                ...component.steps,
                createBlankStep(),
              ],
            }
          : component
      )
    );
  }

  function addStepAfter(
    componentId: string,
    stepIndex: number
  ) {
    setComponents((current) =>
      current.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const steps = [...component.steps];

        /**
         * Avoid creating repeated empty rows when Return is
         * pressed on an already-empty step.
         */
        if (
          !steps[stepIndex]?.text.trim() &&
          stepIndex === steps.length - 1
        ) {
          return component;
        }

        steps.splice(
          stepIndex + 1,
          0,
          createBlankStep()
        );

        return {
          ...component,
          steps,
        };
      })
    );
  }

  function removeStep(
    componentId: string,
    stepId: string
  ) {
    setComponents((current) =>
      current.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const remaining =
          component.steps.filter(
            (step) => step.id !== stepId
          );

        return {
          ...component,
          steps:
            remaining.length > 0
              ? remaining
              : [createBlankStep()],
        };
      })
    );
  }

  function moveStep(
    componentId: string,
    stepIndex: number,
    direction: -1 | 1
  ) {
    setComponents((current) =>
      current.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const targetIndex =
          stepIndex + direction;

        if (
          targetIndex < 0 ||
          targetIndex >= component.steps.length
        ) {
          return component;
        }

        const steps = [...component.steps];

        const [moved] = steps.splice(
          stepIndex,
          1
        );

        steps.splice(
          targetIndex,
          0,
          moved
        );

        return {
          ...component,
          steps,
        };
      })
    );
  }

  function addSection() {
    setComponents((current) => [
      ...current,
      createBlankComponent(),
    ]);
  }

  function removeSection(componentId: string) {
    if (components.length <= 1) {
      Alert.alert(
        'Keep one section',
        'A recipe needs at least one section.'
      );

      return;
    }

    const component = components.find(
      (item) => item.id === componentId
    );

    const hasContent =
      Boolean(component?.name.trim()) ||
      Boolean(
        component?.ingredients.some(
          (ingredient) =>
            ingredient.quantity.trim() ||
            ingredient.unit.trim() ||
            ingredient.ingredient.trim()
        )
      ) ||
      Boolean(
        component?.steps.some(
          (step) => step.text.trim()
        )
      );

    const performRemove = () => {
      setComponents((current) =>
        current.filter(
          (item) => item.id !== componentId
        )
      );
    };

    if (!hasContent) {
      performRemove();
      return;
    }

    Alert.alert(
      'Remove section?',
      'The ingredients and instructions in this section will be removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: performRemove,
        },
      ]
    );
  }

  function selectUnit(unit: string) {
    if (!unitTarget) {
      return;
    }

    updateIngredient(
      unitTarget.componentId,
      unitTarget.ingredientId,
      'unit',
      unit
    );

    setUnitTarget(null);
  }

  function getGlobalStepNumber(
    componentIndex: number,
    stepIndex: number
  ) {
    let number = 1;

    for (
      let index = 0;
      index < componentIndex;
      index += 1
    ) {
      number += components[index].steps.length;
    }

    return number + stepIndex;
  }

  async function saveRecipe() {
    if (!name.trim()) {
      Alert.alert(
        'Recipe name required',
        'Please enter a name for this dish.'
      );

      return;
    }

    const cleanedComponents =
      cleanComponentsForSave(components);

    const legacyIngredients =
      componentsToLegacyIngredients(
        cleanedComponents
      );

    const legacyInstructions =
      componentsToLegacyInstructions(
        cleanedComponents
      );

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
          ingredients: legacyIngredients,
          instructions: legacyInstructions,
          notes: notes.trim(),
          photos,
          mainPhotoId: resolvedMainPhotoId,
          components: cleanedComponents,
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
          ingredients: legacyIngredients,
          instructions: legacyInstructions,
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
          photos,
          mainPhotoId: resolvedMainPhotoId,
          photoUri: mainPhoto?.uri,
          favorite: false,
          components: cleanedComponents,
          source: {
            type: 'manual',
          },
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
    <>
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
              const isMain =
                photo.id === mainPhotoId;

              return (
                <View
                  key={photo.id}
                  style={styles.photoCard}
                >
                  <View
                    style={styles.photoImageWrapper}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoPreview}
                    />

                    {isMain ? (
                      <View style={styles.mainBadge}>
                        <Text
                          style={styles.mainBadgeText}
                        >
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
                      <Text
                        style={styles.photoActionText}
                      >
                        Make Main
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={styles.mainPhotoIndicator}
                    >
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
                    <Text
                      style={styles.removePhotoText}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.label}>
          Recipe name
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Example: Cajun Shrimp Pasta"
          placeholderTextColor="#9A938C"
          style={styles.input}
        />

        <Text style={styles.label}>
          Category
        </Text>

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

        <View style={styles.structuredHeader}>
          <Text style={styles.structuredTitle}>
            Ingredients & Instructions
          </Text>

          <Text style={styles.structuredHelp}>
            Leave the section name blank for a simple
            recipe. Use named sections for things like
            Sauce, Filling, Roux, or Topping.
          </Text>
        </View>

        {components.map(
          (component, componentIndex) => (
            <View
              key={component.id}
              style={styles.componentCard}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionLabel}>
                    SECTION {componentIndex + 1}
                  </Text>

                  <Text style={styles.sectionHint}>
                    Section name is optional
                  </Text>
                </View>

                {components.length > 1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      removeSection(component.id)
                    }
                  >
                    <Text
                      style={styles.removeSectionText}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextInput
                value={component.name}
                onChangeText={(value) =>
                  updateComponentName(
                    component.id,
                    value
                  )
                }
                placeholder={
                  componentIndex === 0
                    ? 'Leave blank for a simple recipe'
                    : 'Example: Sauce, Filling, Roux'
                }
                placeholderTextColor="#9A938C"
                style={styles.sectionNameInput}
              />

              <Text style={styles.subheading}>
                Ingredients
              </Text>

              {component.ingredients.map(
                (ingredient, ingredientIndex) => (
                  <View
                    key={ingredient.id}
                    style={styles.ingredientEntry}
                  >
                    <View
                      style={styles.ingredientTopRow}
                    >
                      <TextInput
                        value={ingredient.quantity}
                        onChangeText={(value) =>
                          updateIngredient(
                            component.id,
                            ingredient.id,
                            'quantity',
                            value
                          )
                        }
                        placeholder="Qty"
                        placeholderTextColor="#9A938C"
                        style={styles.quantityInput}
                      />

                      <TouchableOpacity
                        style={styles.unitButton}
                        onPress={() =>
                          setUnitTarget({
                            componentId:
                              component.id,
                            ingredientId:
                              ingredient.id,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            !ingredient.unit &&
                              styles.unitPlaceholder,
                          ]}
                        >
                          {ingredient.unit ||
                            'Unit'}
                        </Text>
                      </TouchableOpacity>

                      <View
                        style={styles.rowActions}
                      >
                        <TouchableOpacity
                          disabled={
                            ingredientIndex === 0
                          }
                          onPress={() =>
                            moveIngredient(
                              component.id,
                              ingredientIndex,
                              -1
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.moveButton,
                              ingredientIndex ===
                                0 &&
                                styles.moveButtonDisabled,
                            ]}
                          >
                            ↑
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={
                            ingredientIndex ===
                            component.ingredients
                              .length -
                              1
                          }
                          onPress={() =>
                            moveIngredient(
                              component.id,
                              ingredientIndex,
                              1
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.moveButton,
                              ingredientIndex ===
                                component
                                  .ingredients
                                  .length -
                                  1 &&
                                styles.moveButtonDisabled,
                            ]}
                          >
                            ↓
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            removeIngredient(
                              component.id,
                              ingredient.id
                            )
                          }
                        >
                          <Text
                            style={
                              styles.removeRowButton
                            }
                          >
                            ×
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TextInput
                      value={
                        ingredient.ingredient
                      }
                      onChangeText={(value) =>
                        updateIngredient(
                          component.id,
                          ingredient.id,
                          'ingredient',
                          value
                        )
                      }
                      placeholder="Ingredient"
                      placeholderTextColor="#9A938C"
                      style={
                        styles.ingredientNameInput
                      }
                    />

                    {ingredientIndex <
                    component.ingredients.length -
                      1 ? (
                      <View
                        style={
                          styles.ingredientDivider
                        }
                      />
                    ) : null}
                  </View>
                )
              )}

              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  addIngredient(component.id)
                }
              >
                <Text
                  style={styles.addRowButtonText}
                >
                  ＋ Add ingredient
                </Text>
              </TouchableOpacity>

              <View style={styles.majorDivider} />

              <Text style={styles.subheading}>
                Instructions
              </Text>

              <Text style={styles.instructionsHelp}>
                Enter one action per step. Step numbers
                continue through the entire recipe.
              </Text>

              {component.steps.map(
                (step, stepIndex) => (
                  <View
                    key={step.id}
                    style={styles.stepRow}
                  >
                    <View
                      style={styles.stepNumber}
                    >
                      <Text
                        style={styles.stepNumberText}
                      >
                        {getGlobalStepNumber(
                          componentIndex,
                          stepIndex
                        )}
                      </Text>
                    </View>

                    <TextInput
                      value={step.text}
                      onChangeText={(value) =>
                        updateStep(
                          component.id,
                          step.id,
                          value
                        )
                      }
                      placeholder="Example: Sear the beef until browned."
                      placeholderTextColor="#9A938C"
                      multiline
                      submitBehavior="submit"
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        addStepAfter(
                          component.id,
                          stepIndex
                        )
                      }
                      textAlignVertical="top"
                      style={styles.stepInput}
                    />

                    <View
                      style={styles.stepActions}
                    >
                      <TouchableOpacity
                        disabled={
                          stepIndex === 0
                        }
                        onPress={() =>
                          moveStep(
                            component.id,
                            stepIndex,
                            -1
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.smallMoveButton,
                            stepIndex === 0 &&
                              styles.moveButtonDisabled,
                          ]}
                        >
                          ↑
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={
                          stepIndex ===
                          component.steps.length -
                            1
                        }
                        onPress={() =>
                          moveStep(
                            component.id,
                            stepIndex,
                            1
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.smallMoveButton,
                            stepIndex ===
                              component.steps
                                .length -
                                1 &&
                              styles.moveButtonDisabled,
                          ]}
                        >
                          ↓
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          removeStep(
                            component.id,
                            step.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.removeRowButton
                          }
                        >
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}

              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  addStep(component.id)
                }
              >
                <Text
                  style={styles.addRowButtonText}
                >
                  ＋ Add step
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}

        <TouchableOpacity
          style={styles.addSectionButton}
          onPress={addSection}
        >
          <Text style={styles.addSectionButtonText}>
            ＋ Add another section
          </Text>
        </TouchableOpacity>

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

      <Modal
        visible={unitTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setUnitTarget(null)
        }
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.unitModal}>
            <Text style={styles.unitModalTitle}>
              Select Unit
            </Text>

            <Text style={styles.unitModalHelp}>
              Choose None when the ingredient does not
              need a measurement unit.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              {STANDARD_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit || 'none'}
                  style={styles.unitOption}
                  onPress={() =>
                    selectUnit(unit)
                  }
                >
                  <Text
                    style={styles.unitOptionText}
                  >
                    {unit || 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.unitCancelButton}
              onPress={() =>
                setUnitTarget(null)
              }
            >
              <Text
                style={styles.unitCancelButtonText}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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

  structuredHeader: {
    marginTop: 6,
    marginBottom: 14,
  },

  structuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 5,
  },

  structuredHelp: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7B746D',
  },

  componentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#8A5A44',
    marginBottom: 2,
  },

  sectionHint: {
    fontSize: 13,
    color: '#8B837B',
  },

  sectionNameInput: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: '#2D2A26',
    marginBottom: 20,
  },

  removeSectionText: {
    color: '#B24A3A',
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 10,
  },

  subheading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 12,
  },

  ingredientEntry: {
    marginBottom: 9,
  },

  ingredientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  quantityInput: {
    width: 68,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DDD3C8',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2D2A26',
  },

  unitButton: {
    width: 78,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DDD3C8',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },

  unitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#493F37',
  },

  unitPlaceholder: {
    color: '#9A938C',
    fontWeight: '500',
  },

  ingredientNameInput: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DDD3C8',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 11,
    fontSize: 16,
    color: '#2D2A26',
  },

  ingredientDivider: {
    height: 1,
    backgroundColor: '#EEE8E0',
    marginTop: 13,
  },

  rowActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },

  moveButton: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7A3E2F',
    paddingHorizontal: 2,
  },

  smallMoveButton: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7A3E2F',
  },

  moveButtonDisabled: {
    color: '#D5CDC5',
  },

  removeRowButton: {
    fontSize: 22,
    lineHeight: 24,
    color: '#B24A3A',
  },

  addRowButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 2,
  },

  addRowButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7A3E2F',
  },

  majorDivider: {
    height: 1,
    backgroundColor: '#E5DDD4',
    marginVertical: 20,
  },

  instructionsHelp: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8B837B',
    marginTop: -5,
    marginBottom: 14,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
    gap: 9,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7A3E2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  stepInput: {
    flex: 1,
    minHeight: 62,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 21,
    color: '#2D2A26',
  },

  stepActions: {
    width: 24,
    alignItems: 'center',
    gap: 5,
    paddingTop: 4,
  },

  addSectionButton: {
    backgroundColor: '#EEE5D9',
    borderWidth: 1,
    borderColor: '#D8C9B8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 26,
  },

  addSectionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7A3E2F',
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  unitModal: {
    maxHeight: '76%',
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    padding: 20,
  },

  unitModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A26',
    marginBottom: 6,
  },

  unitModalHelp: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7B746D',
    marginBottom: 12,
  },

  unitOption: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE5DC',
  },

  unitOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#493F37',
  },

  unitCancelButton: {
    marginTop: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  unitCancelButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7A3E2F',
  },
});