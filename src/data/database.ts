import * as SQLite from 'expo-sqlite';
import type { ActiveWorkoutDraft, Exercise, UserPreferences, WeeklySchedule, WorkoutPlan, WorkoutSession, UserProfile } from './AppDataContext';

const DATABASE_NAME = 'form-workout.db';
const CURRENT_SCHEMA_VERSION = 4;

export type PersistedAppState = {
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  schedule: WeeklySchedule;
  preferences: UserPreferences;
  profile?: UserProfile;
  activeWorkoutDraft?: ActiveWorkoutDraft | null;
};

type StateRow = { schema_version: number; payload: string };
let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

const validMuscleGroups = new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body']);
const validExerciseTypes = new Set(['Strength', 'Bodyweight', 'Cardio', 'Yoga', 'Pilates', 'Mobility', 'Stretching', 'Custom']);
const validTrackingMethods = new Set(['weight_reps', 'reps_only', 'assisted_weight', 'timed_sets', 'duration', 'distance_duration', 'intervals', 'custom_count']);
const validGoals = new Set(['general_fitness', 'build_muscle', 'lose_fat', 'build_strength', 'improve_endurance', 'mobility']);
const validExperienceLevels = new Set(['beginner', 'intermediate', 'advanced']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalNumber(value: unknown) {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isValidSet(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  return ['targetReps', 'targetWeight', 'targetDurationSeconds', 'targetDistance', 'targetCount', 'workSeconds', 'restSeconds']
    .every((key) => isOptionalNumber(value[key]));
}

function isValidExercise(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    validMuscleGroups.has(String(value.muscleGroup)) && validExerciseTypes.has(String(value.exerciseType)) &&
    validTrackingMethods.has(String(value.trackingMethod)) && typeof value.equipment === 'string' && typeof value.notes === 'string';
}

function isValidPlan(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.notes === 'string' &&
    Array.isArray(value.exercises) && value.exercises.every((item) => isRecord(item) && typeof item.id === 'string' &&
      typeof item.exerciseId === 'string' && Array.isArray(item.plannedSets) && item.plannedSets.every(isValidSet));
}

function isValidSession(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.planId === 'string' && typeof value.planName === 'string' &&
    typeof value.startedAt === 'string' && typeof value.completedAt === 'string' && typeof value.note === 'string' &&
    Array.isArray(value.exerciseLogs) && value.exerciseLogs.every((log) => isRecord(log) && typeof log.id === 'string' &&
      typeof log.exerciseId === 'string' && typeof log.exerciseName === 'string' && validTrackingMethods.has(String(log.trackingMethod)) &&
      typeof log.completed === 'boolean' && Array.isArray(log.sets) && log.sets.every((set) => isRecord(set) &&
        typeof set.id === 'string' && isValidSet(set.target) && ['reps', 'weight', 'durationSeconds', 'distance', 'count', 'workSeconds', 'restSeconds']
          .every((key) => isOptionalNumber(set[key]))));
}

function isValidActiveWorkoutDraft(value: unknown) {
  return value === null || (isRecord(value) && typeof value.id === 'string' && typeof value.planId === 'string' &&
    typeof value.planName === 'string' && typeof value.startedAt === 'string' && typeof value.note === 'string' &&
    Array.isArray(value.exerciseLogs) && value.exerciseLogs.every((log) => isRecord(log) && typeof log.id === 'string' &&
      typeof log.exerciseId === 'string' && typeof log.exerciseName === 'string' && validTrackingMethods.has(String(log.trackingMethod)) &&
      typeof log.completed === 'boolean' && Array.isArray(log.sets) && log.sets.every((set) => isRecord(set) &&
        typeof set.id === 'string' && isValidSet(set.target) && ['reps', 'weight', 'duration', 'distance', 'count', 'work', 'rest']
          .every((key) => typeof set[key] === 'string'))));
}

function isValidProfile(value: unknown) {
  return isRecord(value) && typeof value.displayName === 'string' &&
    (value.heightInches === undefined || (typeof value.heightInches === 'number' && Number.isFinite(value.heightInches) && value.heightInches > 0)) &&
    (value.currentWeight === undefined || (typeof value.currentWeight === 'number' && Number.isFinite(value.currentWeight) && value.currentWeight > 0)) &&
    validGoals.has(String(value.goal)) && validExperienceLevels.has(String(value.experienceLevel)) &&
    Array.isArray(value.preferredTrainingDays) && value.preferredTrainingDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    Array.isArray(value.bodyweightEntries) && value.bodyweightEntries.every((entry) => isRecord(entry) &&
      typeof entry.id === 'string' && typeof entry.date === 'string' &&
      typeof entry.weight === 'number' && Number.isFinite(entry.weight) && entry.weight > 0 &&
      typeof entry.note === 'string');
}

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function isValidAppState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PersistedAppState>;
  if (!Array.isArray(state.exercises) || !state.exercises.every(isValidExercise) ||
      !Array.isArray(state.plans) || !state.plans.every(isValidPlan) ||
      !Array.isArray(state.sessions) || !state.sessions.every(isValidSession) ||
      !isRecord(state.schedule) || !isRecord(state.preferences) || !isValidActiveWorkoutDraft(state.activeWorkoutDraft ?? null) ||
      !isValidProfile(state.profile ?? { displayName: '', goal: 'general_fitness', experienceLevel: 'beginner', preferredTrainingDays: [1, 3, 5], bodyweightEntries: [] }) ||
      !['lb', 'kg'].includes(String(state.preferences.weightUnit)) || !['mi', 'km'].includes(String(state.preferences.distanceUnit))) return false;
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  const planIds = new Set(state.plans.map((plan) => plan.id));
  if (exerciseIds.size !== state.exercises.length || planIds.size !== state.plans.length) return false;
  if (state.plans.some((plan) => plan.exercises.some((item) => !exerciseIds.has(item.exerciseId)))) return false;
  return Object.entries(state.schedule).every(([day, planId]) =>
    /^[0-6]$/.test(day) && (planId === null || (typeof planId === 'string' && planIds.has(planId))),
  );
}

export async function loadAppState(): Promise<{ data: PersistedAppState | null; recoveredFromCorruption: boolean }> {
  const db = await database();
  const row = await db.getFirstAsync<StateRow>('SELECT schema_version, payload FROM app_state WHERE id = 1');
  if (!row) return { data: null, recoveredFromCorruption: false };
  try {
    if (row.schema_version > CURRENT_SCHEMA_VERSION) throw new Error('Stored data uses a newer schema version.');
    let parsed: unknown = JSON.parse(row.payload);
    if (row.schema_version === 1 && parsed && typeof parsed === 'object') {
      parsed = { ...(parsed as object), preferences: { weightUnit: 'lb', distanceUnit: 'mi' } };
    }
    if ((row.schema_version === 1 || row.schema_version === 2) && parsed && typeof parsed === 'object') {
      parsed = { ...(parsed as object), activeWorkoutDraft: null };
    }
    if (row.schema_version <= 3 && parsed && typeof parsed === 'object') {
      parsed = { ...(parsed as object), profile: { displayName: '', goal: 'general_fitness', experienceLevel: 'beginner', preferredTrainingDays: [1, 3, 5], bodyweightEntries: [] } };
    }
    if (!isValidAppState(parsed)) throw new Error('Stored data did not match the expected shape.');
    return { data: parsed, recoveredFromCorruption: false };
  } catch (error) {
    console.warn('Workout data could not be loaded and was reset.', error);
    await db.runAsync('DELETE FROM app_state WHERE id = 1');
    return { data: null, recoveredFromCorruption: true };
  }
}

export function saveAppState(state: PersistedAppState): Promise<void> {
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    const db = await database();
    await db.runAsync(
      `INSERT INTO app_state (id, schema_version, payload, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         schema_version = excluded.schema_version,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
      CURRENT_SCHEMA_VERSION, JSON.stringify(state), new Date().toISOString(),
    );
  });
  return saveQueue;
}

export async function clearAppState() {
  const db = await database();
  await db.runAsync('DELETE FROM app_state WHERE id = 1');
}
