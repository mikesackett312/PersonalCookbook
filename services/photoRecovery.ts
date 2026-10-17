import * as FileSystem from 'expo-file-system/legacy';

import { readBackupFromUri, type RecipeBoxBackup } from './backupService';
import {
  commitPhotoRecovery,
  getRecipePhotos,
  readPhotoRecoverySnapshot,
  type Recipe,
} from './recipeStorage';

export type PhotoRecoveryReport = {
  recovered: number;
  kept: number;
  reusedFiles: number;
  skipped: { recipeId?: string; photoId?: string; reason: string }[];
};

function uniqueIds(values: { id: string }[]): boolean {
  return values.every((value) => typeof value?.id === 'string' && value.id.length > 0)
    && new Set(values.map((value) => value.id)).size === values.length;
}

/** Stricter recovery validation is intentionally separate from normal restore. */
function validateRecovery(backup: RecipeBoxBackup): void {
  if (!uniqueIds(backup.recipes) || !uniqueIds(backup.photos)
    || backup.recipeCount !== backup.recipes.length || backup.photoCount !== backup.photos.length) {
    throw new Error('Recovery requires unique IDs and accurate backup counts.');
  }
  for (const photo of backup.photos) {
    if (!/^(jpg|jpeg|png|heic|webp)$/i.test(photo.extension)
      || typeof photo.base64 !== 'string' || !photo.base64.length
      || photo.base64.length % 4 !== 0
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64)) {
      throw new Error('The backup contains invalid photo data.');
    }
  }
  const ids = new Set(backup.photos.map((photo) => photo.id));
  for (const recipe of backup.recipes) {
    if (!Array.isArray(recipe.photos) || !uniqueIds(recipe.photos)
      || recipe.photos.some((photo) => !ids.has(photo.storedPhotoId))) {
      throw new Error('The backup contains ambiguous or missing photo references.');
    }
  }
}

function owned(uri: string, directory: string): boolean {
  if (!uri.startsWith(directory)) return false;
  const relative = uri.slice(directory.length);
  return !!relative && !/[%?#\\]/.test(relative)
    && relative.split('/').every((part) => !!part && part !== '.' && part !== '..');
}

// A filename hint only; full byte comparison below handles hash collisions safely.
function fingerprint(data: string): string {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
  return `${data.length}-${(hash >>> 0).toString(16)}`;
}

/** No deletion, no normal restore, no backup recipe content copied into current storage. */
let recoveryRunning = false;

export async function recoverPhotosFromBackup(uri: string): Promise<PhotoRecoveryReport> {
  if (recoveryRunning) throw new Error('Photo recovery is already running.');
  recoveryRunning = true;
  try {
    return await runRecovery(uri);
  } finally {
    recoveryRunning = false;
  }
}

async function runRecovery(uri: string): Promise<PhotoRecoveryReport> {
  const backup = await readBackupFromUri(uri);
  validateRecovery(backup);
  if (!FileSystem.documentDirectory) throw new Error('Permanent photo storage is unavailable.');
  const directory = `${FileSystem.documentDirectory}recipebox-photos/`;
  const snapshot = await readPhotoRecoverySnapshot();
  const recipes: Recipe[] = snapshot ? JSON.parse(snapshot) : [];
  if (!Array.isArray(recipes)) throw new Error('Current recipe storage is invalid.');
  const report: PhotoRecoveryReport = { recovered: 0, kept: 0, reusedFiles: 0, skipped: [] };
  const replacements: Parameters<typeof commitPhotoRecovery>[1] = [];
  const payloads = new Map(backup.photos.map((photo) => [photo.id, photo]));
  const used = new Set<string>();
  const readable = new Map<string, string>();

  // Read failures are not treated as proof that a durable file can be replaced.
  for (const recipe of recipes) {
    for (const photo of getRecipePhotos(recipe)) {
      if (!owned(photo.uri, directory) || readable.has(photo.uri)) continue;
      const info = await FileSystem.getInfoAsync(photo.uri);
      if (info.exists && !info.isDirectory) {
        readable.set(photo.uri, await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 }));
      }
    }
  }
  for (const storedRecipe of backup.recipes) {
    const matches = recipes.filter((recipe) => recipe.id === storedRecipe.id);
    if (matches.length !== 1 && storedRecipe.photos.length === 0) {
      report.skipped.push({ recipeId: storedRecipe.id, reason: 'Recipe ID unmatched or ambiguous (no photos)' });
    }
    for (const photo of storedRecipe.photos) {
      used.add(photo.storedPhotoId);
      const skip = (reason: string) => report.skipped.push({ recipeId: storedRecipe.id, photoId: photo.id, reason });
      if (matches.length !== 1) { skip('Recipe ID unmatched or ambiguous'); continue; }
      const matchesPhoto = getRecipePhotos(matches[0]).filter((current) => current.id === photo.id);
      if (matchesPhoto.length !== 1) { skip('Photo ID unmatched or ambiguous; not re-adding removed photos'); continue; }
      const current = matchesPhoto[0];
      if (readable.get(current.uri)) { report.kept++; continue; }
      const payload = payloads.get(photo.storedPhotoId)!;
      let destination = [...readable].find(([, bytes]) => bytes === payload.base64)?.[0];
      if (destination) report.reusedFiles++;
      else {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        const stem = `${directory}recovered-${fingerprint(payload.base64)}`;
        for (let attempt = 0; ; attempt++) {
          const candidate = `${stem}-${attempt}.${payload.extension.toLowerCase()}`;
          const info = await FileSystem.getInfoAsync(candidate);
          if (info.exists) {
            if (!info.isDirectory && await FileSystem.readAsStringAsync(candidate, { encoding: FileSystem.EncodingType.Base64 }) === payload.base64) {
              destination = candidate;
              report.reusedFiles++;
              break;
            }
            continue; // Never overwrite, including a partial write left by an earlier failure.
          }
          await FileSystem.writeAsStringAsync(candidate, payload.base64, { encoding: FileSystem.EncodingType.Base64 });
          if (await FileSystem.readAsStringAsync(candidate, { encoding: FileSystem.EncodingType.Base64 }) !== payload.base64) {
            throw new Error('Recovered photo verification failed. Recipe references were not changed.');
          }
          destination = candidate;
          break;
        }
        readable.set(destination, payload.base64);
      }
      replacements.push({ recipeId: storedRecipe.id, photoId: photo.id, previousUri: current.uri, uri: destination });
      report.recovered++;
    }
  }
  for (const photo of backup.photos) {
    if (!used.has(photo.id)) report.skipped.push({ photoId: photo.id, reason: 'Embedded photo is not referenced by a backup recipe' });
  }
  // A write/verification failure above leaves ALL recipe references unchanged.
  await commitPhotoRecovery(snapshot, replacements);
  return report;
}
