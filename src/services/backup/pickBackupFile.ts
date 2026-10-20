import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { MAX_BACKUP_CHARS } from '../../utils/importBackup';

/**
 * Lets the user pick a backup file and returns its text, or null if they cancelled.
 * Throws with a readable message if the file can't be read.
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'text/*', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_BACKUP_CHARS) {
    throw new Error('That file is far too large to be a Penney backup.');
  }
  try {
    return await new File(asset.uri).text();
  } catch {
    throw new Error(`Couldn't open ${asset.name}. Try saving it to your device first, or paste its text instead.`);
  }
}
