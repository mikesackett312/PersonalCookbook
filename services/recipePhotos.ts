import * as FileSystem from 'expo-file-system/legacy';

function photoDirectory(): string | null {
  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}recipebox-photos/`
    : null;
}

export async function copyRecipePhoto(uri: string): Promise<string> {
  const directory = photoDirectory();
  if (!directory) {
    throw new Error('Recipe Box could not access permanent photo storage.');
  }

  const extension = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'jpg';
  const destination = `${directory}photo-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    await deleteOwnedRecipePhotos([destination]);
    throw error;
  }
}

/** Delete only individual files in our directory, never external files or folders. */
export async function deleteOwnedRecipePhotos(uris: string[]): Promise<void> {
  const directory = photoDirectory();
  if (!directory) return;

  for (const uri of new Set(uris)) {
    if (!uri.startsWith(directory)) continue;
    const relativePath = uri.slice(directory.length);
    // Reject encoded/traversal paths rather than risk deleting outside our directory.
    if (!relativePath || /[%?#\\]/.test(relativePath) ||
        relativePath.split('/').some((part) => !part || part === '.' || part === '..')) continue;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (error) {
      // Cleanup must not turn a successfully saved recipe into a failed save.
      console.warn('Recipe Box could not clean up a photo file.', error);
    }
  }
}
