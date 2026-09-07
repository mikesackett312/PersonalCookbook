import { useFocusEffect } from '@react-navigation/native';
import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getRecipePhotos,
  getRecipes,
} from '../../services/recipeStorage';

import {
  createBackupAndShare,
  getPickedBackupSummary,
  pickBackupFile,
  restoreBackup,
} from '../../services/backupService';

export default function MoreScreen() {
  const [recipeCount, setRecipeCount] =
    useState(0);

  const [photoCount, setPhotoCount] =
    useState(0);

  const [isWorking, setIsWorking] =
    useState(false);

  const loadCounts =
    useCallback(async () => {
      const recipes = await getRecipes();

      const photos = recipes.reduce(
        (total, recipe) =>
          total +
          getRecipePhotos(recipe).length,
        0
      );

      setRecipeCount(recipes.length);
      setPhotoCount(photos);
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts])
  );

  async function handleCreateBackup() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);

    try {
      const result =
        await createBackupAndShare();

      Alert.alert(
        'Backup Prepared',
        `Recipe Box prepared a complete backup of ` +
          `${result.recipeCount} ` +
          `${result.recipeCount === 1 ? 'recipe' : 'recipes'} ` +
          `and ${result.photoCount} ` +
          `${result.photoCount === 1 ? 'photo' : 'photos'}.\n\n` +
          'If you selected Save to Files, keep the .recipebox file somewhere safe.'
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Recipe Box could not create the backup.';

      Alert.alert(
        'Backup Could Not Be Created',
        message
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleChooseRestore() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);

    try {
      const picked =
        await pickBackupFile();

      if (!picked) {
        return;
      }

      const summary =
        getPickedBackupSummary(picked);

      const backupDate =
        new Date(
          summary.createdAt
        ).toLocaleString();

      Alert.alert(
        'Replace Recipe Box?',
        `This backup contains ${summary.recipeCount} ` +
          `${summary.recipeCount === 1 ? 'recipe' : 'recipes'} ` +
          `and ${summary.photoCount} ` +
          `${summary.photoCount === 1 ? 'photo' : 'photos'}.\n\n` +
          `Backup created:\n${backupDate}\n\n` +
          'Restoring will replace every recipe currently in this Recipe Box.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setIsWorking(true);

              try {
                const result =
                  await restoreBackup(
                    picked
                  );

                await loadCounts();

                Alert.alert(
                  'Recipe Box Restored',
                  `${result.recipeCount} ` +
                    `${result.recipeCount === 1 ? 'recipe' : 'recipes'} ` +
                    `and ${result.photoCount} ` +
                    `${result.photoCount === 1 ? 'photo' : 'photos'} ` +
                    'were restored successfully.'
                );
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Recipe Box could not restore this backup.';

                Alert.alert(
                  'Restore Failed',
                  message
                );
              } finally {
                setIsWorking(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Recipe Box could not open this backup.';

      Alert.alert(
        'Backup Could Not Be Opened',
        message
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          More
        </Text>

        <Text style={styles.subtitle}>
          Protect and manage your Recipe Box.
        </Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>
          YOUR RECIPE BOX
        </Text>

        <Text style={styles.statusNumber}>
          {recipeCount}
        </Text>

        <Text style={styles.statusText}>
          {recipeCount === 1
            ? 'Recipe'
            : 'Recipes'}
          {'  ·  '}
          {photoCount}{' '}
          {photoCount === 1
            ? 'Photo'
            : 'Photos'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Protect Your Recipe Box
      </Text>

      <View style={styles.utilityCard}>
        <Text style={styles.utilityTitle}>
          Create a Backup
        </Text>

        <Text style={styles.utilityText}>
          Make a complete copy of your
          recipes and photos. Save the
          resulting .recipebox file to
          iCloud Drive, Files, or another
          safe location.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isWorking &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateBackup}
          disabled={isWorking}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {isWorking
              ? 'Working...'
              : 'Create Backup'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.utilityCard}>
        <Text style={styles.utilityTitle}>
          Restore a Backup
        </Text>

        <Text style={styles.utilityText}>
          Recover Recipe Box from a
          previously saved .recipebox
          backup. Your current recipes will
          not be replaced until you confirm
          the restore.
        </Text>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isWorking &&
              styles.buttonDisabled,
          ]}
          onPress={handleChooseRestore}
          disabled={isWorking}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Restore Backup
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          ABOUT BACKUPS
        </Text>

        <Text style={styles.infoText}>
          A Recipe Box backup is
          self-contained. It includes your
          recipe information, favorites,
          ratings, notes, categories, and
          the actual recipe photos.
        </Text>

        <Text style={styles.infoTextLast}>
          Creating a backup does not remove
          or change anything in your current
          Recipe Box.
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
    paddingBottom: 44,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: '#302A25',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#766D64',
  },

  statusCard: {
    backgroundColor: '#E7DED0',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 30,
  },

  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: '#7A3E2F',
    marginBottom: 8,
  },

  statusNumber: {
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '600',
    color: '#302A25',
  },

  statusText: {
    marginTop: 3,
    fontSize: 14,
    color: '#625B54',
  },

  sectionTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '600',
    color: '#302A25',
    marginBottom: 12,
  },

  utilityCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3D8CA',
    padding: 20,
    marginBottom: 14,
  },

  utilityTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '600',
    color: '#302A25',
    marginBottom: 8,
  },

  utilityText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6F675F',
    marginBottom: 18,
  },

  primaryButton: {
    backgroundColor: '#7A3E2F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CDBDA9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#493F37',
    fontSize: 15,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  infoCard: {
    backgroundColor: '#EFE8DE',
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#7A3E2F',
    marginBottom: 10,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#625B54',
    marginBottom: 10,
  },

  infoTextLast: {
    fontSize: 14,
    lineHeight: 21,
    color: '#625B54',
  },
});