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

export function PlansScreen() {
  const { plans, exercises, preferences, addPlan, updatePlan, deletePlan, activeWorkoutDraft, startWorkoutDraft, discardActiveWorkoutDraft } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [loggerOpen, setLoggerOpen] = useState(false);

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
        <Pressable accessibilityLabel="Create workout plan" onPress={openAdd} style={styles.addButton}><Ionicons name="add" size={24} color={colors.darkText} /></Pressable>
      </View>
      <Text style={styles.count}>{plans.length} {plans.length === 1 ? 'plan' : 'plans'}</Text>
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
        {!plans.length && <View style={styles.empty}><Ionicons name="list-outline" size={42} color={colors.green} /><Text style={styles.emptyTitle}>No workout plans</Text><Text style={styles.emptyText}>Combine exercises into your first reusable routine.</Text><Pressable onPress={openAdd} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Create plan</Text></Pressable></View>}
      </ScrollView>
      <PlanForm visible={formOpen} plan={editing} allPlans={plans} exercises={exercises} onCancel={() => setFormOpen(false)} onSave={save} />
      <WorkoutLoggerModal visible={loggerOpen} onClose={() => setLoggerOpen(false)} />
    </SafeAreaView>
  );
}

type FormProps = { visible: boolean; plan: WorkoutPlan | null; allPlans: WorkoutPlan[]; exercises: Exercise[]; onCancel: () => void; onSave: (input: WorkoutPlanInput) => void };
function PlanForm({ visible, plan, allPlans, exercises, onCancel, onSave }: FormProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PlanExercise[]>([]);
  const [error, setError] = useState('');
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const { addExercise: createExerciseInLibrary } = useAppData();

  function loadForm() {
    setName(plan?.name ?? ''); setNotes(plan?.notes ?? '');
    setItems(plan ? plan.exercises.map((item) => ({ ...item, plannedSets: item.plannedSets.map((set) => ({ ...set })) })) : []);
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
            <View style={formStyles.availableList}>{exercises.filter((exercise) => !items.some((item) => item.exerciseId === exercise.id)).sort((a, b) => a.name.localeCompare(b.name)).map((exercise) => <Pressable key={exercise.id} onPress={() => addExerciseToPlan(exercise)} style={formStyles.availableRow}><View style={formStyles.availableIcon}><Ionicons name="add" size={18} color={colors.green} /></View><View style={formStyles.availableCopy}><Text style={formStyles.availableName}>{exercise.name}</Text><Text style={formStyles.availableMeta}>{exercise.exerciseType} · {exercise.muscleGroup}</Text></View></Pressable>)}</View>
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
  safeArea: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 22, paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 5 }, addButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, count: { color: colors.muted, marginHorizontal: 22, marginTop: 13, marginBottom: 12 }, list: { paddingHorizontal: 22, paddingBottom: 35, gap: 13 }, planCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16 }, planTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 }, planIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, planHeading: { flex: 1, marginLeft: 11 }, planName: { color: colors.darkText, fontSize: 18, fontWeight: '800' }, planMeta: { color: colors.darkMuted, fontSize: 12, marginTop: 2 }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, planExercise: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddded6' }, order: { width: 24, color: colors.green, fontWeight: '800', fontSize: 12 }, planExerciseCopy: { flex: 1 }, planExerciseName: { color: colors.darkText, fontSize: 13, fontWeight: '700' }, planExerciseTarget: { color: colors.darkMuted, fontSize: 11, marginTop: 2 }, planNotes: { color: colors.darkMuted, fontSize: 11, fontStyle: 'italic', marginTop: 9 }, startButton: { minHeight: 44, marginTop: 13, borderRadius: 10, backgroundColor: colors.lime, paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, startButtonText: { color: colors.darkText, fontSize: 12, fontWeight: '800' }, empty: { alignItems: 'center', padding: 45 }, emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 15 }, emptyText: { color: colors.muted, textAlign: 'center', marginTop: 7 }, primaryButton: { backgroundColor: colors.lime, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 }, primaryButtonText: { color: colors.darkText, fontWeight: '800' },
});

const formStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, save: { color: colors.lime, fontSize: 16, fontWeight: '800' }, formTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 22, paddingBottom: 60 }, label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 19, marginBottom: 8 }, optional: { color: '#6f786b', fontWeight: '500' }, input: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 }, notesInput: { minHeight: 65, textAlignVertical: 'top' }, inputError: { borderColor: '#d56c55' }, error: { color: '#e98570', fontSize: 12, marginTop: 6 }, sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionHint: { color: colors.muted, fontSize: 11, marginBottom: 8 }, emptySelection: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 13, padding: 20 }, emptySelectionText: { color: colors.muted, textAlign: 'center', fontSize: 12 }, selectedCard: { backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 }, selectedHeader: { flexDirection: 'row', alignItems: 'center' }, selectedOrder: { color: colors.lime, width: 24, fontWeight: '800' }, selectedCopy: { flex: 1 }, selectedName: { color: colors.text, fontSize: 14, fontWeight: '800' }, selectedMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, smallButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, setArea: { marginTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 7 }, setRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 5 }, setNumber: { color: colors.muted, width: 18, paddingBottom: 10, textAlign: 'center', fontSize: 11, fontWeight: '800' }, numberField: { flex: 1 }, numberLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 3 }, numberInput: { color: colors.text, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 8, fontSize: 13 }, removeSet: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, addSet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, marginLeft: 20 }, addSetText: { color: colors.lime, fontSize: 11, fontWeight: '800' }, addExerciseHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, createExerciseButton: { minHeight: 34, borderRadius: 17, backgroundColor: colors.lime, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }, createExerciseText: { color: colors.darkText, fontSize: 11, fontWeight: '800' }, availableList: { gap: 7 }, availableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 11 }, availableIcon: { width: 44, height: 44, borderRadius: 9, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, availableCopy: { marginLeft: 10 }, availableName: { color: colors.darkText, fontSize: 13, fontWeight: '800' }, availableMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 2 },
});
