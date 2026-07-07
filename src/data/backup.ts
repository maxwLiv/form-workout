import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { isValidAppState, PersistedAppState } from './database';

const BACKUP_FORMAT = 'form-workout-backup';
const BACKUP_VERSION = 1;

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: PersistedAppState;
};

export type BackupSummary = {
  exercises: number;
  plans: number;
  sessions: number;
  exportedAt: string;
};

function filename() {
  return `form-workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function exportBackup(data: PersistedAppState) {
  if (!FileSystem.cacheDirectory) throw new Error('Temporary file storage is unavailable.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');

  const backup: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  const uri = `${FileSystem.cacheDirectory}${filename()}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export Form Workout Backup',
  });
}

export async function chooseBackup(): Promise<{ data: PersistedAppState; summary: BackupSummary } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const contents = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('This is not a Form Workout backup.');
  const backup = parsed as Partial<BackupEnvelope>;
  if (backup.format !== BACKUP_FORMAT) throw new Error('This is not a Form Workout backup.');
  if (backup.version !== BACKUP_VERSION) throw new Error('This backup uses an unsupported version.');
  if (typeof backup.exportedAt !== 'string' || !isValidAppState(backup.data)) {
    throw new Error('The backup is incomplete or contains invalid workout data.');
  }
  return {
    data: backup.data,
    summary: {
      exercises: backup.data.exercises.length,
      plans: backup.data.plans.length,
      sessions: backup.data.sessions.length,
      exportedAt: backup.exportedAt,
    },
  };
}
