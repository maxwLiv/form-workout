import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { clearAppState, loadAppState, PersistedAppState, saveAppState } from './database';

export const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'] as const;
export type MuscleGroup = typeof muscleGroups[number];

export const exerciseTypes = ['Strength', 'Bodyweight', 'Cardio', 'Yoga', 'Pilates', 'Mobility', 'Stretching', 'Custom'] as const;
export type ExerciseType = typeof exerciseTypes[number];

export const trackingMethods = [
  { id: 'weight_reps', label: 'Weight + reps', description: 'Sets with weight and repetitions' },
  { id: 'reps_only', label: 'Repetitions', description: 'Sets measured by repetitions' },
  { id: 'assisted_weight', label: 'Assisted / added weight', description: 'Reps with assistance or added weight' },
  { id: 'timed_sets', label: 'Timed sets', description: 'Multiple sets measured by duration' },
  { id: 'duration', label: 'Duration', description: 'One total activity duration' },
  { id: 'distance_duration', label: 'Distance + duration', description: 'Distance, time, and calculated pace' },
  { id: 'intervals', label: 'Rounds / intervals', description: 'Work and recovery rounds' },
  { id: 'custom_count', label: 'Custom count', description: 'Laps, steps, flights, or another count' },
] as const;
export type TrackingMethod = typeof trackingMethods[number]['id'];

export const recommendedTracking: Record<ExerciseType, TrackingMethod> = {
  Strength: 'weight_reps', Bodyweight: 'reps_only', Cardio: 'distance_duration',
  Yoga: 'duration', Pilates: 'duration', Mobility: 'duration',
  Stretching: 'timed_sets', Custom: 'custom_count',
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  exerciseType: ExerciseType;
  trackingMethod: TrackingMethod;
  equipment: string;
  notes: string;
};

export type ExerciseInput = Omit<Exercise, 'id'>;

export type PlannedSet = {
  id: string;
  targetReps?: number;
  targetWeight?: number;
  targetDurationSeconds?: number;
  targetDistance?: number;
  targetCount?: number;
  workSeconds?: number;
  restSeconds?: number;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  plannedSets: PlannedSet[];
};

export type WorkoutPlan = {
  id: string;
  name: string;
  notes: string;
  exercises: PlanExercise[];
};

export type WorkoutPlanInput = Omit<WorkoutPlan, 'id'>;

export type LoggedSet = {
  id: string;
  target: PlannedSet;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distance?: number;
  count?: number;
  workSeconds?: number;
  restSeconds?: number;
};

export type ExerciseLog = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  trackingMethod: TrackingMethod;
  completed: boolean;
  sets: LoggedSet[];
};

export type WorkoutSession = {
  id: string;
  planId: string;
  planName: string;
  startedAt: string;
  completedAt: string;
  note: string;
  exerciseLogs: ExerciseLog[];
};

export type WorkoutSessionInput = Omit<WorkoutSession, 'id'>;
export type WeeklySchedule = Record<number, string | null>;
export type UserPreferences = { weightUnit: 'lb' | 'kg'; distanceUnit: 'mi' | 'km' };
export const defaultPreferences: UserPreferences = { weightUnit: 'lb', distanceUnit: 'mi' };

const starterExercises: Exercise[] = [
  { id: 'bench-press', name: 'Barbell Bench Press', muscleGroup: 'Chest', exerciseType: 'Strength', trackingMethod: 'weight_reps', equipment: 'Barbell', notes: '' },
  { id: 'incline-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', exerciseType: 'Strength', trackingMethod: 'weight_reps', equipment: 'Dumbbells', notes: '' },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', exerciseType: 'Strength', trackingMethod: 'weight_reps', equipment: 'Cable machine', notes: '' },
  { id: 'squat', name: 'Barbell Squat', muscleGroup: 'Legs', exerciseType: 'Strength', trackingMethod: 'weight_reps', equipment: 'Barbell', notes: '' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', exerciseType: 'Strength', trackingMethod: 'weight_reps', equipment: 'Cable machine', notes: '' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', exerciseType: 'Bodyweight', trackingMethod: 'timed_sets', equipment: 'Bodyweight', notes: '' },
  { id: 'easy-run', name: 'Easy Run', muscleGroup: 'Legs', exerciseType: 'Cardio', trackingMethod: 'distance_duration', equipment: 'Running shoes', notes: '' },
  { id: 'sun-salutation', name: 'Sun Salutation', muscleGroup: 'Full Body', exerciseType: 'Yoga', trackingMethod: 'duration', equipment: 'Yoga mat', notes: '' },
  { id: 'pilates-hundred', name: 'The Hundred', muscleGroup: 'Core', exerciseType: 'Pilates', trackingMethod: 'timed_sets', equipment: 'Mat', notes: '' },
];

const starterPlans: WorkoutPlan[] = [
  {
    id: 'chest-plan', name: 'Chest', notes: 'A balanced chest session.',
    exercises: ['bench-press', 'incline-press', 'cable-fly'].map((exerciseId, index) => ({
      id: `chest-${index}`, exerciseId,
      plannedSets: [1, 2, 3].map((set) => ({ id: `chest-${index}-${set}`, targetReps: 10 })),
    })),
  },
  {
    id: 'core-plan', name: 'Core Reset', notes: 'Short bodyweight core work.',
    exercises: [
      { id: 'core-plank', exerciseId: 'plank', plannedSets: [1, 2, 3].map((set) => ({ id: `core-plank-${set}`, targetDurationSeconds: 30 })) },
      { id: 'core-pilates', exerciseId: 'pilates-hundred', plannedSets: [{ id: 'core-pilates-1', targetDurationSeconds: 60 }] },
    ],
  },
];

const starterSchedule: WeeklySchedule = {
  0: null, 1: 'chest-plan', 2: 'core-plan', 3: null,
  4: 'chest-plan', 5: null, 6: null,
};

type AppDataValue = {
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  schedule: WeeklySchedule;
  preferences: UserPreferences;
  addExercise: (input: ExerciseInput) => void;
  updateExercise: (id: string, input: ExerciseInput) => void;
  deleteExercise: (id: string) => boolean;
  addPlan: (input: WorkoutPlanInput) => void;
  updatePlan: (id: string, input: WorkoutPlanInput) => void;
  deletePlan: (id: string) => void;
  addSession: (input: WorkoutSessionInput) => void;
  deleteSession: (id: string) => void;
  setScheduledPlan: (weekday: number, planId: string | null) => void;
  resetAllData: () => Promise<void>;
  replaceAllData: (data: PersistedAppState) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => void;
  applySessionToPlan: (sessionId: string) => boolean;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [exercises, setExercises] = useState(starterExercises);
  const [plans, setPlans] = useState(starterPlans);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>(starterSchedule);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAppState()
      .then(({ data, recoveredFromCorruption }) => {
        if (cancelled) return;
        if (data) {
          setExercises(data.exercises); setPlans(data.plans);
          setSessions(data.sessions); setSchedule(data.schedule); setPreferences(data.preferences);
        }
        if (recoveredFromCorruption) console.warn('Starter workout data was restored.');
      })
      .catch((error) => console.error('Local workout storage could not be initialized.', error))
      .finally(() => { if (!cancelled) setIsHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      saveAppState({ exercises, plans, sessions, schedule, preferences })
        .catch((error) => console.error('Workout data could not be saved.', error));
    }, 200);
    return () => clearTimeout(timer);
  }, [exercises, plans, sessions, schedule, preferences, isHydrated]);

  const value = useMemo<AppDataValue>(() => ({
    exercises,
    plans,
    sessions,
    schedule,
    preferences,
    addExercise: (input) => setExercises((current) => [
      ...current,
      { id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...input },
    ]),
    updateExercise: (id, input) => setExercises((current) =>
      current.map((exercise) => exercise.id === id ? { id, ...input } : exercise),
    ),
    deleteExercise: (id) => {
      if (plans.some((plan) => plan.exercises.some((item) => item.exerciseId === id))) return false;
      setExercises((current) => current.filter((exercise) => exercise.id !== id));
      return true;
    },
    addPlan: (input) => setPlans((current) => [
      ...current,
      { id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...input },
    ]),
    updatePlan: (id, input) => setPlans((current) => current.map((plan) => plan.id === id ? { id, ...input } : plan)),
    deletePlan: (id) => {
      setPlans((current) => current.filter((plan) => plan.id !== id));
      setSchedule((current) => Object.fromEntries(
        Object.entries(current).map(([day, planId]) => [day, planId === id ? null : planId]),
      ) as WeeklySchedule);
    },
    addSession: (input) => setSessions((current) => [
      ...current,
      { id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...input },
    ]),
    deleteSession: (id) => setSessions((current) => current.filter((session) => session.id !== id)),
    setScheduledPlan: (weekday, planId) => setSchedule((current) => ({ ...current, [weekday]: planId })),
    updatePreferences: setPreferences,
    applySessionToPlan: (sessionId) => {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      if (!session || !plans.some((plan) => plan.id === session.planId)) return false;
      setPlans((current) => current.map((plan) => plan.id !== session.planId ? plan : {
        ...plan,
        exercises: plan.exercises.map((item) => {
          const log = session.exerciseLogs.find((candidate) => candidate.exerciseId === item.exerciseId);
          if (!log?.sets.length) return item;
          return {
            ...item,
            plannedSets: log.sets.map((set, index) => ({
              id: `${item.id}-updated-${Date.now()}-${index}`,
              targetReps: set.reps, targetWeight: set.weight,
              targetDurationSeconds: set.durationSeconds, targetDistance: set.distance,
              targetCount: set.count, workSeconds: set.workSeconds, restSeconds: set.restSeconds,
            })),
          };
        }),
      }));
      return true;
    },
    resetAllData: async () => {
      await clearAppState();
      setExercises(starterExercises); setPlans(starterPlans);
      setSessions([]); setSchedule(starterSchedule); setPreferences(defaultPreferences);
    },
    replaceAllData: async (data) => {
      await saveAppState(data);
      setExercises(data.exercises); setPlans(data.plans);
      setSessions(data.sessions); setSchedule(data.schedule); setPreferences(data.preferences);
    },
  }), [exercises, plans, sessions, schedule, preferences]);

  if (!isHydrated) return <View style={loadingStyles.screen}><ActivityIndicator size="large" color="#c9f46b" /><Text style={loadingStyles.text}>Loading your workouts…</Text></View>;
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider');
  return value;
}

const loadingStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#11160f', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#9ba496', marginTop: 12, fontSize: 13, fontWeight: '600' },
});
