import * as DocumentPicker from 'expo-document-picker';
import { MAX_BACKUP_CHARS } from '../../utils/importBackup';

/**
 * Web: the picker hands back a browser File, which can be read directly, so expo-file-system
 * isn't needed here. Returns the file's text, or null if the user cancelled.
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '.json'],
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_BACKUP_CHARS) {
    throw new Error('That file is far too large to be a Penney backup.');
  }
  if (asset.file) return asset.file.text();
  const response = await fetch(asset.uri);
  return response.text();
}
