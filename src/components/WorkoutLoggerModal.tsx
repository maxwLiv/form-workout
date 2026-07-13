import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseFormModal } from './ExerciseFormModal';
import {
  ActiveWorkoutDraftExercise, ActiveWorkoutDraftSet, Exercise, ExerciseInput, LoggedSet,
  PlannedSet, PlanExercise, TrackingMethod, UserPreferences, useAppData,
} from '../data/AppDataContext';
import { colors } from '../theme';
import { displayDistance, displayWeight, formatMeasurement, storeDistance, storeWeight } from '../utils/units';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function newDraftSet(target: PlannedSet): ActiveWorkoutDraftSet {
  return { id: uid('draft-set'), target: { ...target }, reps: '', weight: '', duration: '', distance: '', count: '', work: '', rest: '' };
}
function defaultSet(method: TrackingMethod): PlannedSet {
  const base = { id: uid('target') };
  if (method === 'weight_reps' || method === 'reps_only' || method === 'assisted_weight') return { ...base, targetReps: 10 };
  if (method === 'timed_sets') return { ...base, targetDurationSeconds: 30 };
  if (method === 'duration') return { ...base, targetDurationSeconds: 600 };
  if (method === 'distance_duration') return { ...base, targetDistance: 1, targetDurationSeconds: 600 };
  if (method === 'intervals') return { ...base, workSeconds: 30, restSeconds: 30 };
  return { ...base, targetCount: 10 };
}
function hasData(set: ActiveWorkoutDraftSet) { return [set.reps, set.weight, set.duration, set.distance, set.count, set.work, set.rest].some((value) => value.trim() !== ''); }
function toNumber(value: string) { const parsed = Number(value.replace(',', '.')); return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed; }

export function WorkoutLoggerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const {
    activeWorkoutDraft, exercises, addExercise, addPlan, addSession, preferences,
    updateActiveWorkoutDraft, discardActiveWorkoutDraft,
  } = useAppData();
  const [addingExercise, setAddingExercise] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const recordedSetCount = useMemo(() => activeWorkoutDraft?.exerciseLogs.reduce((total, draft) => total + draft.sets.filter(hasData).length, 0) ?? 0, [activeWorkoutDraft]);

  function updateDraft(id: string, change: (draft: ActiveWorkoutDraftExercise) => ActiveWorkoutDraftExercise) {
    updateActiveWorkoutDraft((draft) => ({ ...draft, exerciseLogs: draft.exerciseLogs.map((log) => log.id === id ? change(log) : log) }));
  }
  function updateSet(draftId: string, setId: string, patch: Partial<ActiveWorkoutDraftSet>) {
    updateDraft(draftId, (draft) => ({ ...draft, sets: draft.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }));
  }
  function addSet(draftId: string) {
    updateDraft(draftId, (draft) => ({ ...draft, sets: [...draft.sets, newDraftSet(draft.sets.at(-1)?.target ?? defaultSet(draft.trackingMethod))] }));
  }
  function removeSet(draftId: string, setId: string) {
    updateDraft(draftId, (draft) => draft.sets.length === 1 ? draft : { ...draft, sets: draft.sets.filter((set) => set.id !== setId) });
  }
  function toggleCompleted(draftId: string) { updateDraft(draftId, (draft) => ({ ...draft, completed: !draft.completed })); }
  function updateNote(note: string) { updateActiveWorkoutDraft((draft) => ({ ...draft, note })); }

  function addExerciseToDraft(exercise: Exercise) {
    updateActiveWorkoutDraft((draft) => ({
      ...draft,
      exerciseLogs: [...draft.exerciseLogs, {
        id: uid('draft-exercise'),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingMethod: exercise.trackingMethod,
        completed: false,
        sets: [newDraftSet(defaultSet(exercise.trackingMethod))],
      }],
    }));
  }
  function saveNewExercise(input: ExerciseInput) {
    const exercise = addExercise(input);
    addExerciseToDraft(exercise);
    setCreatingExercise(false);
    Alert.alert('Exercise added', `${exercise.name} was added to your library and this workout.`);
  }
  function confirmRemoveExercise(draftExercise: ActiveWorkoutDraftExercise) {
    Alert.alert('Remove exercise?', `${draftExercise.exerciseName} will be removed from this workout only. Your saved workout plan will not change.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => updateActiveWorkoutDraft((draft) => ({ ...draft, exerciseLogs: draft.exerciseLogs.filter((log) => log.id !== draftExercise.id) })) },
    ]);
  }
  function confirmDiscard() {
    Alert.alert('Discard active workout?', 'This will permanently delete the in-progress draft. Your original workout plan will not change.', [
      { text: 'Keep workout', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardActiveWorkoutDraft(); onClose(); } },
    ]);
  }
  function finish() {
    const draft = activeWorkoutDraft;
    if (!draft || !recordedSetCount) { Alert.alert('Nothing logged yet', 'Enter at least one result before finishing the workout.'); return; }
    addSession({
      planId: draft.planId, planName: draft.planName, startedAt: draft.startedAt, completedAt: new Date().toISOString(), note: draft.note.trim(),
      exerciseLogs: draft.exerciseLogs.map((log) => ({
        id: uid('exercise-log'), exerciseId: log.exerciseId, exerciseName: log.exerciseName,
        trackingMethod: log.trackingMethod, completed: log.completed || log.sets.some(hasData),
        sets: log.sets.filter(hasData).map((set): LoggedSet => ({
          id: uid('logged-set'), target: set.target, reps: toNumber(set.reps), weight: toNumber(set.weight) === undefined ? undefined : storeWeight(toNumber(set.weight)!, preferences),
          durationSeconds: toNumber(set.duration) === undefined ? undefined : toNumber(set.duration)! * (['duration', 'distance_duration'].includes(log.trackingMethod) ? 60 : 1), distance: toNumber(set.distance) === undefined ? undefined : storeDistance(toNumber(set.distance)!, preferences), count: toNumber(set.count),
          workSeconds: toNumber(set.work), restSeconds: toNumber(set.rest),
        })),
      })),
    });
    discardActiveWorkoutDraft();
    onClose();
    Alert.alert('Workout complete', `${recordedSetCount} ${recordedSetCount === 1 ? 'set was' : 'sets were'} saved.`);
  }
  function saveAsPlan() {
    const draft = activeWorkoutDraft;
    if (!draft || !draft.exerciseLogs.length) return;
    const plan = addPlan({
      name: `${draft.planName} Variation`,
      notes: `Created from an active workout on ${new Date().toLocaleDateString()}.`,
      exercises: draft.exerciseLogs.map((log): PlanExercise => ({
        id: uid('plan-exercise'),
        exerciseId: log.exerciseId,
        plannedSets: log.sets.map((set, index) => toPlannedSet(log.trackingMethod, set, preferences, index)),
      })),
    });
    Alert.alert('Plan saved', `${plan.name} is now available in Workout Plans.`);
  }

  return (
    <Modal visible={visible && !!activeWorkoutDraft} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={onClose} style={styles.toolbarAction}><Text style={styles.cancel}>Close</Text></Pressable><View style={styles.toolbarTitle}><Text style={styles.eyebrow}>ACTIVE WORKOUT</Text><Text style={styles.title} numberOfLines={1}>{activeWorkoutDraft?.planName}</Text></View><Pressable accessibilityRole="button" onPress={finish} style={styles.toolbarAction}><Text style={styles.finish}>Finish</Text></Pressable></View>
          {activeWorkoutDraft && <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.progress}><Text style={styles.progressValue}>{activeWorkoutDraft.exerciseLogs.filter((draft) => draft.completed).length}/{activeWorkoutDraft.exerciseLogs.length}</Text><Text style={styles.progressLabel}>EXERCISES MARKED COMPLETE</Text></View>
            <View style={styles.actionGrid}>
              <Pressable onPress={() => setAddingExercise(true)} style={styles.actionButton}><Ionicons name="add-circle-outline" size={18} color={colors.darkText} /><Text style={styles.actionText}>Add exercise</Text></Pressable>
              <Pressable onPress={() => setCreatingExercise(true)} style={styles.secondaryActionButton}><Ionicons name="create-outline" size={18} color={colors.lime} /><Text style={styles.secondaryActionText}>Create exercise</Text></Pressable>
              <Pressable onPress={saveAsPlan} style={styles.secondaryActionButton}><Ionicons name="save-outline" size={18} color={colors.lime} /><Text style={styles.secondaryActionText}>Save as plan</Text></Pressable>
            </View>
            {activeWorkoutDraft.exerciseLogs.map((draft, exerciseIndex) => (
              <View key={draft.id} style={[styles.exerciseCard, draft.completed && styles.completedCard]}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseOrder}>{exerciseIndex + 1}</Text>
                  <View style={styles.exerciseCopy}><Text style={styles.exerciseName}>{draft.exerciseName}</Text><Text style={styles.exerciseMethod}>{methodLabel(draft.trackingMethod)}</Text></View>
                  <Pressable accessibilityLabel={`Remove ${draft.exerciseName}`} onPress={() => confirmRemoveExercise(draft)} style={styles.headerButton}><Ionicons name="trash-outline" size={20} color="#e98570" /></Pressable>
                  <Pressable accessibilityLabel={`Mark ${draft.exerciseName} complete`} onPress={() => toggleCompleted(draft.id)} style={[styles.checkButton, draft.completed && styles.checkedButton]}><Ionicons name={draft.completed ? 'checkmark' : 'ellipse-outline'} size={21} color={draft.completed ? colors.darkText : colors.muted} /></Pressable>
                </View>
                <View style={styles.setHeader}><Text style={styles.setColumn}>SET</Text><Text style={styles.targetColumn}>SUGGESTED</Text><Text style={styles.actualColumn}>ACTUAL</Text></View>
                {draft.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setNumber}>{setIndex + 1}</Text>
                    <Text style={styles.targetText}>{targetSummary(draft.trackingMethod, set.target, preferences)}</Text>
                    <View style={styles.actualFields}><ActualFields method={draft.trackingMethod} set={set} preferences={preferences} update={(patch) => updateSet(draft.id, set.id, patch)} /></View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${setIndex + 1}`} disabled={draft.sets.length === 1} onPress={() => removeSet(draft.id, set.id)} style={styles.removeButton}><Ionicons name="remove-circle-outline" size={20} color={draft.sets.length === 1 ? '#62685e' : '#d87560'} /></Pressable>
                  </View>
                ))}
                <Pressable accessibilityRole="button" accessibilityLabel={`Add set to ${draft.exerciseName}`} onPress={() => addSet(draft.id)} style={styles.addSet}><Ionicons name="add-circle-outline" size={18} color={colors.lime} /><Text style={styles.addSetText}>Add set</Text></Pressable>
              </View>
            ))}
            <Text style={styles.noteLabel}>SESSION NOTE <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput value={activeWorkoutDraft.note} onChangeText={updateNote} placeholder="How did the workout feel?" placeholderTextColor="#747c70" multiline textAlignVertical="top" style={styles.noteInput} />
            <Pressable onPress={finish} style={styles.finishButton}><Text style={styles.finishButtonText}>Finish workout · {recordedSetCount} {recordedSetCount === 1 ? 'set' : 'sets'}</Text></Pressable>
            <Pressable onPress={confirmDiscard} style={styles.discardButton}><Text style={styles.discardButtonText}>Discard active workout</Text></Pressable>
          </ScrollView>}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AddExercisePicker visible={addingExercise} exercises={exercises} onChoose={(exercise) => { addExerciseToDraft(exercise); setAddingExercise(false); }} onCancel={() => setAddingExercise(false)} />
      <ExerciseFormModal visible={creatingExercise} exercise={null} allExercises={exercises} title="Create Exercise" onCancel={() => setCreatingExercise(false)} onSave={saveNewExercise} />
    </Modal>
  );
}

function AddExercisePicker({ visible, exercises, onChoose, onCancel }: { visible: boolean; exercises: Exercise[]; onChoose: (exercise: Exercise) => void; onCancel: () => void }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}><SafeAreaView style={pickerStyles.safeArea}><View style={pickerStyles.toolbar}><Pressable onPress={onCancel} style={pickerStyles.toolbarAction}><Text style={pickerStyles.cancel}>Cancel</Text></Pressable><Text style={pickerStyles.title}>Add Exercise</Text><View style={pickerStyles.toolbarAction} /></View><ScrollView contentContainerStyle={pickerStyles.content}>{[...exercises].sort((a, b) => a.name.localeCompare(b.name)).map((exercise) => <Pressable key={exercise.id} onPress={() => onChoose(exercise)} style={pickerStyles.option}><View style={pickerStyles.icon}><Ionicons name="add" size={18} color={colors.green} /></View><View style={pickerStyles.copy}><Text style={pickerStyles.name}>{exercise.name}</Text><Text style={pickerStyles.meta}>{exercise.exerciseType} · {exercise.equipment || 'No equipment'}</Text></View></Pressable>)}</ScrollView></SafeAreaView></Modal>;
}

function toPlannedSet(method: TrackingMethod, set: ActiveWorkoutDraftSet, preferences: UserPreferences, index: number): PlannedSet {
  const fallback = { ...set.target, id: uid(`saved-target-${index}`) };
  const reps = toNumber(set.reps);
  const weight = toNumber(set.weight);
  const duration = toNumber(set.duration);
  const distance = toNumber(set.distance);
  const count = toNumber(set.count);
  const work = toNumber(set.work);
  const rest = toNumber(set.rest);
  if (!hasData(set)) return fallback;
  if (method === 'weight_reps') return { id: fallback.id, targetReps: reps ?? fallback.targetReps, targetWeight: weight === undefined ? fallback.targetWeight : storeWeight(weight, preferences) };
  if (method === 'reps_only') return { id: fallback.id, targetReps: reps ?? fallback.targetReps };
  if (method === 'assisted_weight') return { id: fallback.id, targetReps: reps ?? fallback.targetReps, targetWeight: weight === undefined ? fallback.targetWeight : storeWeight(weight, preferences) };
  if (method === 'timed_sets') return { id: fallback.id, targetDurationSeconds: duration ?? fallback.targetDurationSeconds, targetWeight: weight === undefined ? fallback.targetWeight : storeWeight(weight, preferences) };
  if (method === 'duration') return { id: fallback.id, targetDurationSeconds: duration === undefined ? fallback.targetDurationSeconds : duration * 60 };
  if (method === 'distance_duration') return { id: fallback.id, targetDistance: distance === undefined ? fallback.targetDistance : storeDistance(distance, preferences), targetDurationSeconds: duration === undefined ? fallback.targetDurationSeconds : duration * 60 };
  if (method === 'intervals') return { id: fallback.id, workSeconds: work ?? fallback.workSeconds, restSeconds: rest ?? fallback.restSeconds };
  return { id: fallback.id, targetCount: count ?? fallback.targetCount };
}

function methodLabel(method: TrackingMethod) { return ({ weight_reps: 'Weight + reps', reps_only: 'Repetitions', assisted_weight: 'Assisted / added weight', timed_sets: 'Timed set', duration: 'Duration', distance_duration: 'Distance + duration', intervals: 'Interval', custom_count: 'Custom count' } as const)[method]; }
function targetSummary(method: TrackingMethod, set: PlannedSet, preferences: UserPreferences) {
  if (method === 'weight_reps') return `${set.targetWeight ? `${formatMeasurement(displayWeight(set.targetWeight, preferences))} ${preferences.weightUnit} x ` : ''}${set.targetReps ?? '-'} reps`;
  if (method === 'reps_only' || method === 'assisted_weight') return `${set.targetReps ?? '—'} reps`;
  if (method === 'timed_sets') return `${set.targetDurationSeconds ?? '—'} sec`;
  if (method === 'duration') return `${(set.targetDurationSeconds ?? 0) / 60} min`;
  if (method === 'distance_duration') return `${set.targetDistance === undefined ? '-' : formatMeasurement(displayDistance(set.targetDistance, preferences))} ${preferences.distanceUnit} / ${(set.targetDurationSeconds ?? 0) / 60} min`;
  if (method === 'intervals') return `${set.workSeconds ?? '—'}s / ${set.restSeconds ?? '—'}s`;
  return `${set.targetCount ?? '—'} count`;
}

function Field({ value, placeholder, suffix, onChange }: { value: string; placeholder: string; suffix: string; onChange: (value: string) => void }) { return <View style={styles.field}><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#687063" keyboardType="decimal-pad" style={styles.fieldInput} /><Text style={styles.suffix}>{suffix}</Text></View>; }
function ActualFields({ method, set, preferences, update }: { method: TrackingMethod; set: ActiveWorkoutDraftSet; preferences: UserPreferences; update: (patch: Partial<ActiveWorkoutDraftSet>) => void }) {
  if (method === 'weight_reps') return <><Field value={set.weight} placeholder={formatMeasurement(displayWeight(set.target.targetWeight ?? 0, preferences))} suffix={preferences.weightUnit} onChange={(weight) => update({ weight })} /><Field value={set.reps} placeholder={String(set.target.targetReps ?? 0)} suffix="reps" onChange={(reps) => update({ reps })} /></>;
  if (method === 'reps_only') return <Field value={set.reps} placeholder={String(set.target.targetReps ?? 0)} suffix="reps" onChange={(reps) => update({ reps })} />;
  if (method === 'assisted_weight') return <><Field value={set.weight} placeholder={formatMeasurement(displayWeight(set.target.targetWeight ?? 0, preferences))} suffix={`+/-${preferences.weightUnit}`} onChange={(weight) => update({ weight })} /><Field value={set.reps} placeholder={String(set.target.targetReps ?? 0)} suffix="reps" onChange={(reps) => update({ reps })} /></>;
  if (method === 'timed_sets') return <><Field value={set.duration} placeholder={String(set.target.targetDurationSeconds ?? 0)} suffix="sec" onChange={(duration) => update({ duration })} /><Field value={set.weight} placeholder={formatMeasurement(displayWeight(set.target.targetWeight ?? 0, preferences))} suffix={preferences.weightUnit} onChange={(weight) => update({ weight })} /></>;
  if (method === 'duration') return <Field value={set.duration} placeholder={String((set.target.targetDurationSeconds ?? 0) / 60)} suffix="min" onChange={(duration) => update({ duration })} />;
  if (method === 'distance_duration') return <><Field value={set.distance} placeholder={formatMeasurement(displayDistance(set.target.targetDistance ?? 0, preferences))} suffix={preferences.distanceUnit} onChange={(distance) => update({ distance })} /><Field value={set.duration} placeholder={String((set.target.targetDurationSeconds ?? 0) / 60)} suffix="min" onChange={(duration) => update({ duration })} /></>;
  if (method === 'intervals') return <><Field value={set.work} placeholder={String(set.target.workSeconds ?? 0)} suffix="work" onChange={(work) => update({ work })} /><Field value={set.rest} placeholder={String(set.target.restSeconds ?? 0)} suffix="rest" onChange={(rest) => update({ rest })} /></>;
  return <Field value={set.count} placeholder={String(set.target.targetCount ?? 0)} suffix="count" onChange={(count) => update({ count })} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 15 }, toolbarTitle: { flex: 1, alignItems: 'center' }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }, finish: { color: colors.lime, fontSize: 15, fontWeight: '800', textAlign: 'right' }, content: { padding: 18, paddingBottom: 50 }, progress: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 13 }, progressValue: { color: colors.text, fontSize: 22, fontWeight: '800' }, progressLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, actionGrid: { gap: 8, marginBottom: 13 }, actionButton: { minHeight: 44, borderRadius: 11, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, actionText: { color: colors.darkText, fontSize: 12, fontWeight: '800' }, secondaryActionButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, secondaryActionText: { color: colors.lime, fontSize: 12, fontWeight: '800' },
  exerciseCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 12 }, completedCard: { borderColor: '#6f9146' }, exerciseHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }, exerciseOrder: { width: 27, color: colors.lime, fontWeight: '800' }, exerciseCopy: { flex: 1 }, exerciseName: { color: colors.text, fontSize: 15, fontWeight: '800' }, exerciseMethod: { color: colors.muted, fontSize: 11, marginTop: 2 }, headerButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, checkButton: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, checkedButton: { backgroundColor: colors.lime }, setHeader: { flexDirection: 'row', paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 }, setColumn: { width: 27, color: colors.muted, fontSize: 11, fontWeight: '800' }, targetColumn: { width: 80, color: colors.muted, fontSize: 11, fontWeight: '800' }, actualColumn: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '800' }, setRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 }, setNumber: { width: 27, color: colors.muted, fontSize: 11, fontWeight: '800' }, targetText: { width: 80, color: colors.muted, fontSize: 11 }, actualFields: { flex: 1, flexDirection: 'row', gap: 5 }, field: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, minWidth: 58 }, fieldInput: { flex: 1, color: colors.text, paddingVertical: 7, paddingLeft: 7, fontSize: 11, minWidth: 25 }, suffix: { color: colors.muted, fontSize: 11, marginRight: 5 }, removeButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' }, addSet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, marginLeft: 26, alignSelf: 'flex-start' }, addSetText: { color: colors.lime, fontSize: 11, fontWeight: '800' }, noteLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 9, marginBottom: 7 }, optional: { fontWeight: '500', color: '#6f786b' }, noteInput: { minHeight: 80, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13 }, finishButton: { backgroundColor: colors.lime, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 }, finishButtonText: { color: colors.darkText, fontSize: 14, fontWeight: '800' }, discardButton: { padding: 15, alignItems: 'center', marginTop: 8 }, discardButtonText: { color: '#e98570', fontSize: 13, fontWeight: '800' },
});

const pickerStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, title: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 18, gap: 9, paddingBottom: 50 }, option: { minHeight: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12 }, icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, marginLeft: 11 }, name: { color: colors.darkText, fontSize: 15, fontWeight: '800' }, meta: { color: colors.darkMuted, fontSize: 11, marginTop: 3 },
});
