import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Exercise, ExerciseInput, PlannedSet, PlanExercise, TrackingMethod, WorkoutPlan, WorkoutPlanInput,
  UserPreferences, trackingMethods, useAppData,
} from '../data/AppDataContext';
import { colors } from '../theme';
import { WorkoutLoggerModal } from '../components/WorkoutLoggerModal';
import { ExerciseFormModal } from '../components/ExerciseFormModal';
import { starterExercises, starterPlans } from '../data/starterLibrary';
import { displayDistance, displayWeight, storeDistance, storeWeight } from '../utils/units';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function defaultSet(method: TrackingMethod): PlannedSet {
  const base = { id: uid('set') };
  if (method === 'weight_reps') return { ...base, targetReps: 10 };
  if (method === 'reps_only' || method === 'assisted_weight') return { ...base, targetReps: 10 };
  if (method === 'timed_sets') return { ...base, targetDurationSeconds: 30 };
  if (method === 'duration') return { ...base, targetDurationSeconds: 600 };
  if (method === 'distance_duration') return { ...base, targetDistance: 1, targetDurationSeconds: 600 };
  if (method === 'intervals') return { ...base, workSeconds: 30, restSeconds: 30 };
  return { ...base, targetCount: 10 };
}

function prescriptionSummary(item: PlanExercise, exercise: Exercise | undefined, preferences: UserPreferences) {
  if (!exercise) return '';
  const sets = item.plannedSets;
  const first = sets[0];
  if (!first) return 'No targets';
  const same = sets.every((set) => JSON.stringify({ ...set, id: '' }) === JSON.stringify({ ...first, id: '' }));
  const prefix = `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`;
  if (!same) return `${prefix} · varied targets`;
  if (exercise.trackingMethod === 'weight_reps' || exercise.trackingMethod === 'reps_only' || exercise.trackingMethod === 'assisted_weight') return `${prefix} × ${first.targetReps ?? 0} reps`;
  if (exercise.trackingMethod === 'timed_sets') return `${prefix} × ${first.targetDurationSeconds ?? 0} sec`;
  if (exercise.trackingMethod === 'duration') return `${Math.round((first.targetDurationSeconds ?? 0) / 60)} min`;
  if (exercise.trackingMethod === 'distance_duration') return `${displayDistance(first.targetDistance ?? 0, preferences).toFixed(1)} ${preferences.distanceUnit} - ${Math.round((first.targetDurationSeconds ?? 0) / 60)} min`;
  if (exercise.trackingMethod === 'intervals') return `${prefix} · ${first.workSeconds ?? 0}s work / ${first.restSeconds ?? 0}s rest`;
  return `${prefix} × ${first.targetCount ?? 0}`;
}

const splitLabels: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full body',
  core: 'Core',
  conditioning: 'Conditioning',
  mobility: 'Mobility',
};

const goalLabels: Record<string, string> = {
  general_fitness: 'General fitness',
  build_muscle: 'Muscle',
  build_strength: 'Strength',
  improve_endurance: 'Endurance',
  mobility: 'Mobility',
};

const equipmentLabels: Record<string, string> = {
  bodyweight: 'Bodyweight',
  minimal: 'Minimal equipment',
  gym: 'Gym',
};

export function PlansScreen() {
  const { plans, exercises, preferences, addPlan, updatePlan, deletePlan, activeWorkoutDraft, startWorkoutDraft, discardActiveWorkoutDraft } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(plan: WorkoutPlan) { setEditing(plan); setFormOpen(true); }
  function confirmDelete(plan: WorkoutPlan) {
    Alert.alert('Delete workout plan?', `${plan.name} will be removed. Completed workout history will not be affected.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlan(plan.id) },
    ]);
  }
  function save(input: WorkoutPlanInput) {
    editing ? updatePlan(editing.id, input) : addPlan(input);
    setFormOpen(false);
  }
  function startWorkout(plan: WorkoutPlan) {
    if (!activeWorkoutDraft) {
      startWorkoutDraft(plan);
      setLoggerOpen(true);
      return;
    }
    Alert.alert('Workout already in progress', `${activeWorkoutDraft.planName} is still active.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume current', onPress: () => setLoggerOpen(true) },
      { text: 'Discard and start new', style: 'destructive', onPress: () => { discardActiveWorkoutDraft(); setTimeout(() => { startWorkoutDraft(plan); setLoggerOpen(true); }, 0); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>REUSABLE ROUTINES</Text><Text style={styles.title}>Workout Plans</Text></View>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Browse starter templates" onPress={() => setTemplatesOpen(true)} style={styles.secondaryHeaderButton}><Ionicons name="library-outline" size={21} color={colors.lime} /></Pressable>
          <Pressable accessibilityLabel="Create workout plan" onPress={openAdd} style={styles.addButton}><Ionicons name="add" size={24} color={colors.darkText} /></Pressable>
        </View>
      </View>
      <View style={styles.subHeader}>
        <Text style={styles.count}>{plans.length} {plans.length === 1 ? 'plan' : 'plans'}</Text>
        <Pressable accessibilityRole="button" onPress={() => setTemplatesOpen(true)} style={styles.browseButton}><Ionicons name="sparkles-outline" size={16} color={colors.darkText} /><Text style={styles.browseButtonText}>Templates</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            <View style={styles.planTop}>
              <View style={styles.planIcon}><Ionicons name="list-outline" size={22} color={colors.green} /></View>
              <View style={styles.planHeading}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planMeta}>{plan.exercises.length} {plan.exercises.length === 1 ? 'exercise' : 'exercises'}</Text></View>
              <Pressable accessibilityLabel={`Edit ${plan.name}`} onPress={() => openEdit(plan)} style={styles.iconButton}><Ionicons name="pencil-outline" size={19} color={colors.darkMuted} /></Pressable>
              <Pressable accessibilityLabel={`Delete ${plan.name}`} onPress={() => confirmDelete(plan)} style={styles.iconButton}><Ionicons name="trash-outline" size={19} color="#a94f3d" /></Pressable>
            </View>
            {plan.exercises.map((item, index) => {
              const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
              return exercise ? <View key={item.id} style={styles.planExercise}><Text style={styles.order}>{index + 1}</Text><View style={styles.planExerciseCopy}><Text style={styles.planExerciseName}>{exercise.name}</Text><Text style={styles.planExerciseTarget}>{prescriptionSummary(item, exercise, preferences)}</Text></View></View> : null;
            })}
            {!!plan.notes && <Text style={styles.planNotes}>{plan.notes}</Text>}
            <Pressable onPress={() => startWorkout(plan)} style={styles.startButton}><Ionicons name="play" size={15} color={colors.darkText} /><Text style={styles.startButtonText}>Start workout</Text></Pressable>
          </View>
        ))}
        {!plans.length && <View style={styles.empty}><Ionicons name="list-outline" size={42} color={colors.green} /><Text style={styles.emptyTitle}>No workout plans</Text><Text style={styles.emptyText}>Start from a guided template or combine exercises into your first reusable routine.</Text><Pressable onPress={() => setTemplatesOpen(true)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Browse templates</Text></Pressable><Pressable onPress={openAdd} style={styles.secondaryEmptyButton}><Text style={styles.secondaryEmptyText}>Create blank plan</Text></Pressable></View>}
      </ScrollView>
      <PlanForm visible={formOpen} plan={editing} allPlans={plans} exercises={exercises} onCancel={() => setFormOpen(false)} onSave={save} />
      <TemplateBrowserModal visible={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <WorkoutLoggerModal visible={loggerOpen} onClose={() => setLoggerOpen(false)} />
    </SafeAreaView>
  );
}

type FormProps = { visible: boolean; plan: WorkoutPlan | null; allPlans: WorkoutPlan[]; exercises: Exercise[]; onCancel: () => void; onSave: (input: WorkoutPlanInput) => void };

function TemplateBrowserModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { plans, exercises, preferences, importStarterTemplates } = useAppData();
  const [filter, setFilter] = useState('all');
  const filteredPlans = filter === 'all' ? starterPlans : starterPlans.filter((plan) => plan.template?.split === filter);
  const filters = [
    ['all', 'All'],
    ['full_body', 'Full body'],
    ['push', 'Push'],
    ['pull', 'Pull'],
    ['legs', 'Legs'],
    ['conditioning', 'Conditioning'],
    ['mobility', 'Mobility'],
  ];
  function hasPlan(template: WorkoutPlan) {
    return plans.some((plan) => plan.id === template.id || plan.name.trim().toLowerCase() === template.name.trim().toLowerCase());
  }
  function importPlans(planIds?: string[]) {
    const result = importStarterTemplates(planIds);
    Alert.alert('Templates imported', result.exercisesAdded || result.plansAdded
      ? `${result.plansAdded} plans and ${result.exercisesAdded} supporting exercises were added. Existing items were not changed.`
      : 'Your library already has those templates.');
  }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={templateStyles.safeArea}>
        <View style={templateStyles.toolbar}>
          <Pressable accessibilityRole="button" onPress={onClose} style={templateStyles.toolbarAction}><Text style={templateStyles.cancel}>Close</Text></Pressable>
          <Text style={templateStyles.title}>Starter Templates</Text>
          <Pressable accessibilityRole="button" onPress={() => importPlans()} style={templateStyles.toolbarAction}><Text style={templateStyles.importAll}>Import all</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={templateStyles.content} showsVerticalScrollIndicator={false}>
          <View style={templateStyles.intro}>
            <Text style={templateStyles.introTitle}>Choose a ready-made plan</Text>
            <Text style={templateStyles.introText}>Preview the exercises, training focus, and expected session length before adding anything to your library.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={templateStyles.filters}>
            {filters.map(([id, label]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: filter === id }} onPress={() => setFilter(id)} style={[templateStyles.filterChip, filter === id && templateStyles.activeFilterChip]}><Text style={[templateStyles.filterText, filter === id && templateStyles.activeFilterText]}>{label}</Text></Pressable>)}
          </ScrollView>
          <View style={templateStyles.templateList}>
            {filteredPlans.map((plan) => {
              const imported = hasPlan(plan);
              const meta = plan.template;
              return (
                <View key={plan.id} style={templateStyles.templateCard}>
                  <View style={templateStyles.templateTop}>
                    <View style={templateStyles.templateIcon}><Ionicons name={imported ? 'checkmark' : 'sparkles-outline'} size={21} color={colors.green} /></View>
                    <View style={templateStyles.templateHeading}>
                      <Text style={templateStyles.templateName}>{plan.name}</Text>
                      <Text style={templateStyles.templateMeta}>{meta ? `${splitLabels[meta.split]} - ${meta.difficulty} - ${meta.estimatedMinutes} min` : `${plan.exercises.length} exercises`}</Text>
                    </View>
                    <View style={[templateStyles.statusPill, imported && templateStyles.importedPill]}><Text style={[templateStyles.statusText, imported && templateStyles.importedText]}>{imported ? 'Added' : 'New'}</Text></View>
                  </View>
                  {!!plan.notes && <Text style={templateStyles.notes}>{plan.notes}</Text>}
                  {meta && <View style={templateStyles.tags}>
                    <Text style={templateStyles.tag}>{equipmentLabels[meta.equipmentCategory]}</Text>
                    {meta.goals.slice(0, 2).map((goal) => <Text key={goal} style={templateStyles.tag}>{goalLabels[goal]}</Text>)}
                  </View>}
                  <View style={templateStyles.previewList}>
                    {plan.exercises.slice(0, 4).map((item, index) => {
                      const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)
                        ?? starterExercises.find((candidate) => candidate.id === item.exerciseId);
                      return <View key={item.id} style={templateStyles.previewRow}><Text style={templateStyles.previewOrder}>{index + 1}</Text><View style={templateStyles.previewCopy}><Text style={templateStyles.previewName}>{exercise?.name ?? item.exerciseId}</Text><Text style={templateStyles.previewTarget}>{prescriptionSummary(item, exercise, preferences)}</Text></View></View>;
                    })}
                    {plan.exercises.length > 4 && <Text style={templateStyles.moreText}>+ {plan.exercises.length - 4} more</Text>}
                  </View>
                  <Pressable accessibilityRole="button" disabled={imported} onPress={() => importPlans([plan.id])} style={[templateStyles.importButton, imported && templateStyles.disabledImportButton]}><Ionicons name={imported ? 'checkmark-circle-outline' : 'download-outline'} size={17} color={imported ? colors.darkMuted : colors.darkText} /><Text style={[templateStyles.importButtonText, imported && templateStyles.disabledImportText]}>{imported ? 'Already in library' : 'Import template'}</Text></Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlanForm({ visible, plan, allPlans, exercises, onCancel, onSave }: FormProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PlanExercise[]>([]);
  const [error, setError] = useState('');
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const { addExercise: createExerciseInLibrary } = useAppData();
  const availableExercises = exercises
    .filter((exercise) => !items.some((item) => item.exerciseId === exercise.id))
    .filter((exercise) => {
      const query = exerciseSearch.trim().toLowerCase();
      if (!query) return true;
      return [exercise.name, exercise.muscleGroup, exercise.exerciseType, exercise.equipment, exercise.notes]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function loadForm() {
    setName(plan?.name ?? ''); setNotes(plan?.notes ?? '');
    setItems(plan ? plan.exercises.map((item) => ({ ...item, plannedSets: item.plannedSets.map((set) => ({ ...set })) })) : []);
    setExerciseSearch('');
    setError('');
  }
  function addExerciseToPlan(exercise: Exercise) {
    if (items.some((item) => item.exerciseId === exercise.id)) return;
    const setCount = ['duration', 'distance_duration'].includes(exercise.trackingMethod) ? 1 : 3;
    setItems((current) => [...current, { id: uid('plan-exercise'), exerciseId: exercise.id, plannedSets: Array.from({ length: setCount }, () => defaultSet(exercise.trackingMethod)) }]);
  }
  function createExercise(input: ExerciseInput) {
    const exercise = createExerciseInLibrary(input);
    addExerciseToPlan(exercise);
    setExerciseFormOpen(false);
    Alert.alert('Exercise added', `${exercise.name} was added to your library and this plan.`);
  }
  function removeExercise(id: string) { setItems((current) => current.filter((item) => item.id !== id)); }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => { const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; });
  }
  function updateSets(itemId: string, sets: PlannedSet[]) { setItems((current) => current.map((item) => item.id === itemId ? { ...item, plannedSets: sets } : item)); }
  function submit() {
    const cleanName = name.trim();
    if (!cleanName) { setError('Plan name is required.'); return; }
    if (allPlans.some((item) => item.id !== plan?.id && item.name.toLowerCase() === cleanName.toLowerCase())) { setError('A plan with this name already exists.'); return; }
    if (!items.length) { setError('Choose at least one exercise.'); return; }
    onSave({ name: cleanName, notes: notes.trim(), exercises: items });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={loadForm} onRequestClose={onCancel}>
      <SafeAreaView style={formStyles.safeArea}>
        <KeyboardAvoidingView style={formStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={formStyles.toolbar}><Pressable accessibilityRole="button" onPress={onCancel} style={formStyles.toolbarAction}><Text style={formStyles.cancel}>Cancel</Text></Pressable><Text style={formStyles.formTitle}>{plan ? 'Edit Plan' : 'New Plan'}</Text><Pressable accessibilityRole="button" onPress={submit} style={formStyles.toolbarAction}><Text style={formStyles.save}>Save</Text></Pressable></View>
          <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={formStyles.label}>PLAN NAME</Text>
            <TextInput value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="e.g. Push Day" placeholderTextColor="#747c70" style={[formStyles.input, !!error && formStyles.inputError]} />
            {!!error && <Text style={formStyles.error}>{error}</Text>}
            <Text style={formStyles.label}>NOTES <Text style={formStyles.optional}>OPTIONAL</Text></Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Purpose or instructions for this plan" placeholderTextColor="#747c70" style={[formStyles.input, formStyles.notesInput]} multiline />
            <View style={formStyles.sectionHeading}><Text style={formStyles.label}>PLAN EXERCISES</Text><Text style={formStyles.sectionHint}>{items.length} selected</Text></View>
            {!items.length && <View style={formStyles.emptySelection}><Text style={formStyles.emptySelectionText}>Choose exercises below to build this plan.</Text></View>}
            {items.map((item, index) => {
              const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
              return exercise ? (
                <View key={item.id} style={formStyles.selectedCard}>
                  <View style={formStyles.selectedHeader}>
                    <Text style={formStyles.selectedOrder}>{index + 1}</Text>
                    <View style={formStyles.selectedCopy}><Text style={formStyles.selectedName}>{exercise.name}</Text><Text style={formStyles.selectedMeta}>{trackingMethods.find((method) => method.id === exercise.trackingMethod)?.label}</Text></View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Move ${exercise.name} earlier`} disabled={index === 0} onPress={() => move(index, -1)} style={formStyles.smallButton}><Ionicons name="arrow-up" size={17} color={index === 0 ? '#596054' : colors.text} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Move ${exercise.name} later`} disabled={index === items.length - 1} onPress={() => move(index, 1)} style={formStyles.smallButton}><Ionicons name="arrow-down" size={17} color={index === items.length - 1 ? '#596054' : colors.text} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name} from plan`} onPress={() => removeExercise(item.id)} style={formStyles.smallButton}><Ionicons name="close" size={19} color="#e98570" /></Pressable>
                  </View>
                  <SetPrescriptionEditor exercise={exercise} sets={item.plannedSets} onChange={(sets) => updateSets(item.id, sets)} />
                </View>
              ) : null;
            })}
            <View style={formStyles.addExerciseHeader}><Text style={formStyles.label}>ADD EXERCISES</Text><Pressable onPress={() => setExerciseFormOpen(true)} style={formStyles.createExerciseButton}><Ionicons name="create-outline" size={16} color={colors.darkText} /><Text style={formStyles.createExerciseText}>Create new</Text></Pressable></View>
            <View style={formStyles.searchBox}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search name, type, muscle, or equipment" placeholderTextColor="#747c70" autoCapitalize="none" autoCorrect={false} style={formStyles.searchInput} />{!!exerciseSearch && <Pressable accessibilityRole="button" accessibilityLabel="Clear exercise search" onPress={() => setExerciseSearch('')} style={formStyles.clearSearch}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable>}</View>
            <Text style={formStyles.searchHint}>{availableExercises.length} available</Text>
            <View style={formStyles.availableList}>{availableExercises.map((exercise) => <Pressable key={exercise.id} onPress={() => addExerciseToPlan(exercise)} style={formStyles.availableRow}><View style={formStyles.availableIcon}><Ionicons name="add" size={18} color={colors.green} /></View><View style={formStyles.availableCopy}><Text style={formStyles.availableName}>{exercise.name}</Text><Text style={formStyles.availableMeta}>{exercise.exerciseType} - {exercise.muscleGroup}{exercise.equipment ? ` - ${exercise.equipment}` : ''}</Text></View></Pressable>)}{!availableExercises.length && <View style={formStyles.noSearchResults}><Ionicons name="search-outline" size={24} color={colors.muted} /><Text style={formStyles.noSearchTitle}>No exercises found</Text><Text style={formStyles.noSearchText}>Try a muscle group, equipment type, or create a new exercise.</Text></View>}</View>
          </ScrollView>
        </KeyboardAvoidingView>
        <ExerciseFormModal visible={exerciseFormOpen} exercise={null} allExercises={exercises} title="Create Exercise" onCancel={() => setExerciseFormOpen(false)} onSave={createExercise} />
      </SafeAreaView>
    </Modal>
  );
}

function SetPrescriptionEditor({ exercise, sets, onChange }: { exercise: Exercise; sets: PlannedSet[]; onChange: (sets: PlannedSet[]) => void }) {
  const { preferences } = useAppData();
  function update(index: number, patch: Partial<PlannedSet>) { onChange(sets.map((set, setIndex) => setIndex === index ? { ...set, ...patch } : set)); }
  function add() { onChange([...sets, { ...(sets.at(-1) ?? defaultSet(exercise.trackingMethod)), id: uid('set') }]); }
  function remove(index: number) { if (sets.length > 1) onChange(sets.filter((_, setIndex) => setIndex !== index)); }
  return (
    <View style={formStyles.setArea}>
      {sets.map((set, index) => <View key={set.id} style={formStyles.setRow}><Text style={formStyles.setNumber}>{index + 1}</Text><SetFields method={exercise.trackingMethod} set={set} preferences={preferences} update={(patch) => update(index, patch)} /><Pressable disabled={sets.length === 1} onPress={() => remove(index)} style={formStyles.removeSet}><Ionicons name="remove-circle-outline" size={21} color={sets.length === 1 ? '#656b61' : '#d87560'} /></Pressable></View>)}
      <Pressable onPress={add} style={formStyles.addSet}><Ionicons name="add-circle-outline" size={18} color={colors.lime} /><Text style={formStyles.addSetText}>Add set</Text></Pressable>
    </View>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return <View style={formStyles.numberField}><Text style={formStyles.numberLabel}>{label}</Text><TextInput value={value === undefined ? '' : String(value)} onChangeText={(text) => onChange(text === '' ? undefined : Number(text.replace(',', '.')) || 0)} keyboardType="decimal-pad" style={formStyles.numberInput} /></View>;
}
function SetFields({ method, set, preferences, update }: { method: TrackingMethod; set: PlannedSet; preferences: UserPreferences; update: (patch: Partial<PlannedSet>) => void }) {
  if (method === 'weight_reps') return <><NumberField label="REPS" value={set.targetReps} onChange={(targetReps) => update({ targetReps })} /><NumberField label={`WEIGHT ${preferences.weightUnit.toUpperCase()}`} value={set.targetWeight === undefined ? undefined : displayWeight(set.targetWeight, preferences)} onChange={(value) => update({ targetWeight: value === undefined ? undefined : storeWeight(value, preferences) })} /></>;
  if (method === 'reps_only') return <NumberField label="REPS" value={set.targetReps} onChange={(targetReps) => update({ targetReps })} />;
  if (method === 'assisted_weight') return <><NumberField label="REPS" value={set.targetReps} onChange={(targetReps) => update({ targetReps })} /><NumberField label={`+/- ${preferences.weightUnit.toUpperCase()}`} value={set.targetWeight === undefined ? undefined : displayWeight(set.targetWeight, preferences)} onChange={(value) => update({ targetWeight: value === undefined ? undefined : storeWeight(value, preferences) })} /></>;
  if (method === 'timed_sets') return <><NumberField label="SECONDS" value={set.targetDurationSeconds} onChange={(targetDurationSeconds) => update({ targetDurationSeconds })} /><NumberField label={`WEIGHT ${preferences.weightUnit.toUpperCase()}`} value={set.targetWeight === undefined ? undefined : displayWeight(set.targetWeight, preferences)} onChange={(value) => update({ targetWeight: value === undefined ? undefined : storeWeight(value, preferences) })} /></>;
  if (method === 'duration') return <NumberField label="MINUTES" value={set.targetDurationSeconds === undefined ? undefined : set.targetDurationSeconds / 60} onChange={(minutes) => update({ targetDurationSeconds: minutes === undefined ? undefined : minutes * 60 })} />;
  if (method === 'distance_duration') return <><NumberField label={preferences.distanceUnit.toUpperCase()} value={set.targetDistance === undefined ? undefined : displayDistance(set.targetDistance, preferences)} onChange={(value) => update({ targetDistance: value === undefined ? undefined : storeDistance(value, preferences) })} /><NumberField label="MINUTES" value={set.targetDurationSeconds === undefined ? undefined : set.targetDurationSeconds / 60} onChange={(minutes) => update({ targetDurationSeconds: minutes === undefined ? undefined : minutes * 60 })} /></>;
  if (method === 'intervals') return <><NumberField label="WORK SEC" value={set.workSeconds} onChange={(workSeconds) => update({ workSeconds })} /><NumberField label="REST SEC" value={set.restSeconds} onChange={(restSeconds) => update({ restSeconds })} /></>;
  return <NumberField label="COUNT" value={set.targetCount} onChange={(targetCount) => update({ targetCount })} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 22, paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 5 }, secondaryHeaderButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, addButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, subHeader: { marginHorizontal: 22, marginTop: 13, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, count: { color: colors.muted }, browseButton: { minHeight: 34, borderRadius: 17, backgroundColor: colors.lime, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 }, browseButtonText: { color: colors.darkText, fontSize: 12, fontWeight: '800' }, list: { paddingHorizontal: 22, paddingBottom: 35, gap: 13 }, planCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16 }, planTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 }, planIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, planHeading: { flex: 1, marginLeft: 11 }, planName: { color: colors.darkText, fontSize: 18, fontWeight: '800' }, planMeta: { color: colors.darkMuted, fontSize: 12, marginTop: 2 }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, planExercise: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddded6' }, order: { width: 24, color: colors.green, fontWeight: '800', fontSize: 12 }, planExerciseCopy: { flex: 1 }, planExerciseName: { color: colors.darkText, fontSize: 13, fontWeight: '700' }, planExerciseTarget: { color: colors.darkMuted, fontSize: 11, marginTop: 2 }, planNotes: { color: colors.darkMuted, fontSize: 11, fontStyle: 'italic', marginTop: 9 }, startButton: { minHeight: 44, marginTop: 13, borderRadius: 10, backgroundColor: colors.lime, paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, startButtonText: { color: colors.darkText, fontSize: 12, fontWeight: '800' }, empty: { alignItems: 'center', padding: 45 }, emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 15 }, emptyText: { color: colors.muted, textAlign: 'center', marginTop: 7 }, primaryButton: { backgroundColor: colors.lime, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 }, primaryButtonText: { color: colors.darkText, fontWeight: '800' }, secondaryEmptyButton: { minHeight: 44, justifyContent: 'center', marginTop: 10 }, secondaryEmptyText: { color: colors.lime, fontWeight: '800' },
});

const templateStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 86, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, importAll: { color: colors.lime, fontSize: 14, fontWeight: '800' }, title: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 22, paddingBottom: 44 }, intro: { marginBottom: 14 }, introTitle: { color: colors.text, fontSize: 24, fontWeight: '800' }, introText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }, filters: { gap: 8, paddingVertical: 4, paddingRight: 22 }, filterChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }, activeFilterChip: { backgroundColor: colors.lime, borderColor: colors.lime }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, activeFilterText: { color: colors.darkText }, templateList: { gap: 12, marginTop: 12 }, templateCard: { backgroundColor: colors.card, borderRadius: 18, padding: 15 }, templateTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, templateIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, templateHeading: { flex: 1 }, templateName: { color: colors.darkText, fontSize: 17, fontWeight: '800' }, templateMeta: { color: colors.darkMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' }, statusPill: { minHeight: 28, borderRadius: 14, paddingHorizontal: 10, backgroundColor: '#e4ecd9', justifyContent: 'center' }, importedPill: { backgroundColor: colors.lime }, statusText: { color: colors.green, fontSize: 11, fontWeight: '800' }, importedText: { color: colors.darkText }, notes: { color: colors.darkMuted, fontSize: 12, lineHeight: 17, marginTop: 10 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, tag: { color: colors.green, fontSize: 11, fontWeight: '800', backgroundColor: '#e4ecd9', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }, previewList: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddded6' }, previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddded6' }, previewOrder: { width: 24, color: colors.green, fontSize: 12, fontWeight: '800' }, previewCopy: { flex: 1 }, previewName: { color: colors.darkText, fontSize: 13, fontWeight: '800' }, previewTarget: { color: colors.darkMuted, fontSize: 11, marginTop: 2 }, moreText: { color: colors.darkMuted, fontSize: 12, fontWeight: '700', marginTop: 8 }, importButton: { minHeight: 44, borderRadius: 10, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 }, disabledImportButton: { backgroundColor: '#e4ecd9' }, importButtonText: { color: colors.darkText, fontSize: 12, fontWeight: '800' }, disabledImportText: { color: colors.darkMuted },
});

const formStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, save: { color: colors.lime, fontSize: 16, fontWeight: '800' }, formTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 22, paddingBottom: 60 }, label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 19, marginBottom: 8 }, optional: { color: '#6f786b', fontWeight: '500' }, input: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 }, notesInput: { minHeight: 65, textAlignVertical: 'top' }, inputError: { borderColor: '#d56c55' }, error: { color: '#e98570', fontSize: 12, marginTop: 6 }, sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionHint: { color: colors.muted, fontSize: 11, marginBottom: 8 }, emptySelection: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 13, padding: 20 }, emptySelectionText: { color: colors.muted, textAlign: 'center', fontSize: 12 }, selectedCard: { backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 }, selectedHeader: { flexDirection: 'row', alignItems: 'center' }, selectedOrder: { color: colors.lime, width: 24, fontWeight: '800' }, selectedCopy: { flex: 1 }, selectedName: { color: colors.text, fontSize: 14, fontWeight: '800' }, selectedMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, smallButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, setArea: { marginTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 7 }, setRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 5 }, setNumber: { color: colors.muted, width: 18, paddingBottom: 10, textAlign: 'center', fontSize: 11, fontWeight: '800' }, numberField: { flex: 1 }, numberLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 3 }, numberInput: { color: colors.text, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 8, fontSize: 13 }, removeSet: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, addSet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, marginLeft: 20 }, addSetText: { color: colors.lime, fontSize: 11, fontWeight: '800' }, addExerciseHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, createExerciseButton: { minHeight: 34, borderRadius: 17, backgroundColor: colors.lime, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }, createExerciseText: { color: colors.darkText, fontSize: 11, fontWeight: '800' }, searchBox: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }, searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 10 }, clearSearch: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, searchHint: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 8 }, availableList: { gap: 7 }, availableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 11 }, availableIcon: { width: 44, height: 44, borderRadius: 9, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, availableCopy: { flex: 1, marginLeft: 10 }, availableName: { color: colors.darkText, fontSize: 13, fontWeight: '800' }, availableMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 2 }, noSearchResults: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 13, padding: 18, gap: 6 }, noSearchTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, noSearchText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
