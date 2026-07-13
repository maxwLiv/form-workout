import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { clearAppState, loadAppState, PersistedAppState, saveAppState } from './database';
import { starterExercises, starterPlans, starterSchedule } from './starterLibrary';

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
export type ActiveWorkoutDraftSet = {
  id: string;
  target: PlannedSet;
  reps: string;
  weight: string;
  duration: string;
  distance: string;
  count: string;
  work: string;
  rest: string;
};
export type ActiveWorkoutDraftExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  trackingMethod: TrackingMethod;
  completed: boolean;
  sets: ActiveWorkoutDraftSet[];
};
export type ActiveWorkoutDraft = {
  id: string;
  planId: string;
  planName: string;
  startedAt: string;
  note: string;
  exerciseLogs: ActiveWorkoutDraftExercise[];
};
export type WeeklySchedule = Record<number, string | null>;
export type UserPreferences = { weightUnit: 'lb' | 'kg'; distanceUnit: 'mi' | 'km' };
export const defaultPreferences: UserPreferences = { weightUnit: 'lb', distanceUnit: 'mi' };
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export type FitnessGoal = 'general_fitness' | 'build_muscle' | 'lose_fat' | 'build_strength' | 'improve_endurance' | 'mobility';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BodyweightEntry = {
  id: string;
  date: string;
  weight: number;
  note: string;
};
export type UserProfile = {
  displayName: string;
  heightInches?: number;
  currentWeight?: number;
  goal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  preferredTrainingDays: number[];
  bodyweightEntries: BodyweightEntry[];
};
export const defaultProfile: UserProfile = {
  displayName: '',
  goal: 'general_fitness',
  experienceLevel: 'beginner',
  preferredTrainingDays: [1, 3, 5],
  bodyweightEntries: [],
};

type AppDataValue = {
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  schedule: WeeklySchedule;
  preferences: UserPreferences;
  profile: UserProfile;
  activeWorkoutDraft: ActiveWorkoutDraft | null;
  addExercise: (input: ExerciseInput) => Exercise;
  updateExercise: (id: string, input: ExerciseInput) => void;
  deleteExercise: (id: string) => boolean;
  addPlan: (input: WorkoutPlanInput) => WorkoutPlan;
  updatePlan: (id: string, input: WorkoutPlanInput) => void;
  deletePlan: (id: string) => void;
  addSession: (input: WorkoutSessionInput) => void;
  deleteSession: (id: string) => void;
  setScheduledPlan: (weekday: number, planId: string | null) => void;
  resetAllData: () => Promise<void>;
  replaceAllData: (data: PersistedAppState) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => void;
  updateProfile: (profile: UserProfile) => void;
  addBodyweightEntry: (entry: Omit<BodyweightEntry, 'id'>) => void;
  deleteBodyweightEntry: (id: string) => void;
  importStarterTemplates: () => { exercisesAdded: number; plansAdded: number };
  applySessionToPlan: (sessionId: string) => boolean;
  startWorkoutDraft: (plan: WorkoutPlan) => ActiveWorkoutDraft | null;
  updateActiveWorkoutDraft: (change: (draft: ActiveWorkoutDraft) => ActiveWorkoutDraft) => void;
  discardActiveWorkoutDraft: () => void;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [exercises, setExercises] = useState(starterExercises);
  const [plans, setPlans] = useState(starterPlans);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>(starterSchedule);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [activeWorkoutDraft, setActiveWorkoutDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAppState()
      .then(({ data, recoveredFromCorruption }) => {
        if (cancelled) return;
        if (data) {
          setExercises(data.exercises); setPlans(data.plans);
          setSessions(data.sessions); setSchedule(data.schedule); setPreferences(data.preferences);
          setProfile(data.profile ?? defaultProfile);
          setActiveWorkoutDraft(data.activeWorkoutDraft ?? null);
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
      saveAppState({ exercises, plans, sessions, schedule, preferences, profile, activeWorkoutDraft })
        .catch((error) => console.error('Workout data could not be saved.', error));
    }, 200);
    return () => clearTimeout(timer);
  }, [exercises, plans, sessions, schedule, preferences, profile, activeWorkoutDraft, isHydrated]);

  const value = useMemo<AppDataValue>(() => ({
    exercises,
    plans,
    sessions,
    schedule,
    preferences,
    profile,
    activeWorkoutDraft,
    addExercise: (input) => {
      const exercise = { id: uid('exercise'), ...input };
      setExercises((current) => [...current, exercise]);
      return exercise;
    },
    updateExercise: (id, input) => setExercises((current) =>
      current.map((exercise) => exercise.id === id ? { id, ...input } : exercise),
    ),
    deleteExercise: (id) => {
      if (plans.some((plan) => plan.exercises.some((item) => item.exerciseId === id))) return false;
      setExercises((current) => current.filter((exercise) => exercise.id !== id));
      return true;
    },
    addPlan: (input) => {
      const plan = { id: uid('plan'), ...input };
      setPlans((current) => [...current, plan]);
      return plan;
    },
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
    updatePreferences: (nextPreferences) => {
      setPreferences(nextPreferences);
    },
    updateProfile: setProfile,
    addBodyweightEntry: (entry) => {
      const saved = { id: uid('bodyweight'), ...entry };
      setProfile((current) => ({
        ...current,
        currentWeight: saved.weight,
        bodyweightEntries: [...current.bodyweightEntries, saved].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }));
    },
    deleteBodyweightEntry: (id) => setProfile((current) => {
      const entries = current.bodyweightEntries.filter((entry) => entry.id !== id);
      return { ...current, bodyweightEntries: entries, currentWeight: entries[0]?.weight };
    }),
    importStarterTemplates: () => {
      const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
      const exerciseNames = new Set(exercises.map((exercise) => exercise.name.trim().toLowerCase()));
      const exerciseAdditions = starterExercises.filter((exercise) => !exerciseIds.has(exercise.id) && !exerciseNames.has(exercise.name.trim().toLowerCase()));
      const planIds = new Set(plans.map((plan) => plan.id));
      const planNames = new Set(plans.map((plan) => plan.name.trim().toLowerCase()));
      const planAdditions = starterPlans.filter((plan) => !planIds.has(plan.id) && !planNames.has(plan.name.trim().toLowerCase()));
      setExercises((current) => [...current, ...exerciseAdditions]);
      setPlans((current) => [...current, ...planAdditions]);
      return { exercisesAdded: exerciseAdditions.length, plansAdded: planAdditions.length };
    },
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
      setProfile(defaultProfile);
      setActiveWorkoutDraft(null);
    },
    replaceAllData: async (data) => {
      await saveAppState(data);
      setExercises(data.exercises); setPlans(data.plans);
      setSessions(data.sessions); setSchedule(data.schedule); setPreferences(data.preferences);
      setProfile(data.profile ?? defaultProfile);
      setActiveWorkoutDraft(data.activeWorkoutDraft ?? null);
    },
    startWorkoutDraft: (plan) => {
      const draft: ActiveWorkoutDraft = {
        id: uid('active-workout'),
        planId: plan.id,
        planName: plan.name,
        startedAt: new Date().toISOString(),
        note: '',
        exerciseLogs: plan.exercises.flatMap((item) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          return exercise ? [{
            id: uid('draft-exercise'),
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            trackingMethod: exercise.trackingMethod,
            completed: false,
            sets: item.plannedSets.map((target) => ({
              id: uid('draft-set'),
              target: { ...target },
              reps: '',
              weight: '',
              duration: '',
              distance: '',
              count: '',
              work: '',
              rest: '',
            })),
          }] : [];
        }),
      };
      setActiveWorkoutDraft(draft);
      return draft;
    },
    updateActiveWorkoutDraft: (change) => setActiveWorkoutDraft((current) => current ? change(current) : current),
    discardActiveWorkoutDraft: () => setActiveWorkoutDraft(null),
  }), [exercises, plans, sessions, schedule, preferences, profile, activeWorkoutDraft]);

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
