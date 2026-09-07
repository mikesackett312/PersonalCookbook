import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
    getRecipePhotos,
    getRecipes,
    Recipe,
    replaceRecipes,
} from './recipeStorage';

const BACKUP_FORMAT = 'recipe-box-backup';
const BACKUP_VERSION = 1;

type StoredPhoto = {
  id: string;
  extension: string;
  base64: string;
};

type StoredRecipePhoto = {
  id: string;
  storedPhotoId: string;
};

type StoredRecipe = Omit<
  Recipe,
  'photos' | 'photoUri'
> & {
  photos: StoredRecipePhoto[];
};

type RecipeBoxBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  recipeCount: number;
  photoCount: number;
  recipes: StoredRecipe[];
  photos: StoredPhoto[];
};

export type PickedBackup = {
  uri: string;
  backup: RecipeBoxBackup;
};

export type BackupResult = {
  recipeCount: number;
  photoCount: number;
  createdAt: string;
};

function getExtension(uri: string): string {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(
    /\.([a-zA-Z0-9]+)$/
  );

  if (!match) {
    return 'jpg';
  }

  const extension =
    match[1].toLowerCase();

  if (
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png' ||
    extension === 'heic' ||
    extension === 'webp'
  ) {
    return extension;
  }

  return 'jpg';
}

function makeSafeTimestamp(
  date: Date
): string {
  return date
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '');
}

function validateBackup(
  value: unknown
): RecipeBoxBackup {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    throw new Error(
      'This is not a valid Recipe Box backup.'
    );
  }

  const backup =
    value as Partial<RecipeBoxBackup>;

  if (
    backup.format !== BACKUP_FORMAT
  ) {
    throw new Error(
      'This file is not a Recipe Box backup.'
    );
  }

  if (
    backup.version !== BACKUP_VERSION
  ) {
    throw new Error(
      'This backup was created by an unsupported version of Recipe Box.'
    );
  }

  if (
    !Array.isArray(backup.recipes) ||
    !Array.isArray(backup.photos)
  ) {
    throw new Error(
      'This Recipe Box backup is incomplete or damaged.'
    );
  }

  if (
    typeof backup.createdAt !== 'string'
  ) {
    throw new Error(
      'This Recipe Box backup does not contain a valid creation date.'
    );
  }

  return backup as RecipeBoxBackup;
}

async function readBackupFromUri(
  uri: string
): Promise<RecipeBoxBackup> {
  let contents: string;

  try {
    contents =
      await FileSystem.readAsStringAsync(
        uri,
        {
          encoding:
            FileSystem.EncodingType.UTF8,
        }
      );
  } catch {
    throw new Error(
      'Recipe Box could not read the selected backup file.'
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error(
      'The selected file is not a readable Recipe Box backup.'
    );
  }

  return validateBackup(parsed);
}

async function buildBackup():
  Promise<RecipeBoxBackup> {
  const recipes =
    await getRecipes();

  const storedPhotos: StoredPhoto[] =
    [];

  const storedRecipes: StoredRecipe[] =
    [];

  for (
    let recipeIndex = 0;
    recipeIndex < recipes.length;
    recipeIndex += 1
  ) {
    const recipe =
      recipes[recipeIndex];

    const recipePhotos =
      getRecipePhotos(recipe);

    const storedRecipePhotos:
      StoredRecipePhoto[] = [];

    for (
      let photoIndex = 0;
      photoIndex <
      recipePhotos.length;
      photoIndex += 1
    ) {
      const photo =
        recipePhotos[photoIndex];

      const storedPhotoId =
        `${recipeIndex}-` +
        `${photoIndex}-` +
        `${photo.id}`;

      let base64: string;

      try {
        base64 =
          await FileSystem.readAsStringAsync(
            photo.uri,
            {
              encoding:
                FileSystem.EncodingType
                  .Base64,
            }
          );
      } catch {
        throw new Error(
          `Recipe Box could not read a photo for "${recipe.name}". ` +
            'No backup was created because it would have been incomplete.'
        );
      }

      storedPhotos.push({
        id: storedPhotoId,
        extension:
          getExtension(photo.uri),
        base64,
      });

      storedRecipePhotos.push({
        id: photo.id,
        storedPhotoId,
      });
    }

    const {
      photos: _photos,
      photoUri: _photoUri,
      ...recipeWithoutPhotos
    } = recipe;

    storedRecipes.push({
      ...recipeWithoutPhotos,
      photos: storedRecipePhotos,
    });
  }

  const now = new Date();

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    recipeCount:
      storedRecipes.length,
    photoCount:
      storedPhotos.length,
    recipes: storedRecipes,
    photos: storedPhotos,
  };
}

export async function createBackupAndShare():
  Promise<BackupResult> {
  if (!FileSystem.cacheDirectory) {
    throw new Error(
      'Recipe Box could not access temporary storage.'
    );
  }

  const backup =
    await buildBackup();

  const createdDate =
    new Date(backup.createdAt);

  const filename =
    `RecipeBox-Backup-` +
    `${makeSafeTimestamp(createdDate)}` +
    `.recipebox`;

  const backupUri =
    `${FileSystem.cacheDirectory}` +
    `${filename}`;

  await FileSystem.writeAsStringAsync(
    backupUri,
    JSON.stringify(backup),
    {
      encoding:
        FileSystem.EncodingType.UTF8,
    }
  );

  const sharingAvailable =
    await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error(
      'The iPhone share sheet is not available.'
    );
  }

  await Sharing.shareAsync(
    backupUri,
    {
      mimeType: 'application/json',
      UTI: 'public.data',
      dialogTitle:
        'Save Recipe Box Backup',
    }
  );

  return {
    recipeCount:
      backup.recipeCount,
    photoCount:
      backup.photoCount,
    createdAt:
      backup.createdAt,
  };
}

export async function pickBackupFile():
  Promise<PickedBackup | null> {
  const result =
    await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

  if (result.canceled) {
    return null;
  }

  if (
    !result.assets ||
    result.assets.length === 0
  ) {
    return null;
  }

  const uri =
    result.assets[0].uri;

  const backup =
    await readBackupFromUri(uri);

  return {
    uri,
    backup,
  };
}

export function getPickedBackupSummary(
  picked: PickedBackup
): BackupResult {
  return {
    recipeCount:
      picked.backup.recipes.length,
    photoCount:
      picked.backup.photos.length,
    createdAt:
      picked.backup.createdAt,
  };
}

export async function restoreBackup(
  picked: PickedBackup
): Promise<BackupResult> {
  if (
    !FileSystem.documentDirectory
  ) {
    throw new Error(
      'Recipe Box could not access permanent storage.'
    );
  }

  const backup =
    validateBackup(picked.backup);

  const restoreId =
    `restore-${Date.now()}`;

  const restoreDirectory =
    `${FileSystem.documentDirectory}` +
    `recipebox-photos/` +
    `${restoreId}/`;

  await FileSystem.makeDirectoryAsync(
    restoreDirectory,
    {
      intermediates: true,
    }
  );

  const restoredPhotoUris =
    new Map<string, string>();

  for (
    let index = 0;
    index < backup.photos.length;
    index += 1
  ) {
    const photo =
      backup.photos[index];

    if (
      !photo.id ||
      !photo.extension ||
      !photo.base64
    ) {
      throw new Error(
        'The backup contains incomplete photo data.'
      );
    }

    const restoredUri =
      `${restoreDirectory}` +
      `photo-${index}.` +
      `${photo.extension}`;

    try {
      await FileSystem.writeAsStringAsync(
        restoredUri,
        photo.base64,
        {
          encoding:
            FileSystem.EncodingType
              .Base64,
        }
      );
    } catch {
      throw new Error(
        'Recipe Box could not restore one of the photo files.'
      );
    }

    restoredPhotoUris.set(
      photo.id,
      restoredUri
    );
  }

  const restoredRecipes: Recipe[] =
    backup.recipes.map(
      (storedRecipe) => {
        const restoredPhotos =
          storedRecipe.photos.map(
            (storedPhoto) => {
              const uri =
                restoredPhotoUris.get(
                  storedPhoto
                    .storedPhotoId
                );

              if (!uri) {
                throw new Error(
                  `A photo for "${storedRecipe.name}" is missing from the backup.`
                );
              }

              return {
                id: storedPhoto.id,
                uri,
              };
            }
          );

        const validMainPhotoId =
          restoredPhotos.some(
            (photo) =>
              photo.id ===
              storedRecipe.mainPhotoId
          )
            ? storedRecipe.mainPhotoId
            : restoredPhotos[0]?.id;

        const mainPhoto =
          restoredPhotos.find(
            (photo) =>
              photo.id ===
              validMainPhotoId
          );

        return {
          ...storedRecipe,
          photos: restoredPhotos,
          mainPhotoId:
            validMainPhotoId,
          photoUri:
            mainPhoto?.uri,
        };
      }
    );

  /*
   * We do not replace AsyncStorage until all
   * backup data and all photos have been
   * successfully reconstructed.
   */
  await replaceRecipes(
    restoredRecipes
  );

  return {
    recipeCount:
      restoredRecipes.length,
    photoCount:
      backup.photos.length,
    createdAt:
      backup.createdAt,
  };
}