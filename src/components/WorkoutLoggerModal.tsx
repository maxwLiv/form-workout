import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Exercise, LoggedSet, PlannedSet, TrackingMethod, UserPreferences, WorkoutPlan, useAppData,
} from '../data/AppDataContext';
import { colors } from '../theme';
import { displayDistance, displayWeight, formatMeasurement, storeDistance, storeWeight } from '../utils/units';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
type DraftSet = { id: string; target: PlannedSet; reps: string; weight: string; duration: string; distance: string; count: string; work: string; rest: string };
type DraftExercise = { id: string; exerciseId: string; exerciseName: string; trackingMethod: TrackingMethod; completed: boolean; sets: DraftSet[] };

function newDraftSet(target: PlannedSet): DraftSet {
  return { id: uid('draft-set'), target: { ...target }, reps: '', weight: '', duration: '', distance: '', count: '', work: '', rest: '' };
}
function hasData(set: DraftSet) { return [set.reps, set.weight, set.duration, set.distance, set.count, set.work, set.rest].some((value) => value.trim() !== ''); }
function toNumber(value: string) { const parsed = Number(value.replace(',', '.')); return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed; }

export function WorkoutLoggerModal({ plan, visible, onClose }: { plan: WorkoutPlan | null; visible: boolean; onClose: () => void }) {
  const { exercises, addSession, preferences } = useAppData();
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [note, setNote] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const recordedSetCount = useMemo(() => drafts.reduce((total, draft) => total + draft.sets.filter(hasData).length, 0), [drafts]);

  useEffect(() => {
    if (!visible || !plan) return;
    setStartedAt(new Date().toISOString()); setNote('');
    setDrafts(plan.exercises.flatMap((item) => {
      const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
      return exercise ? [{ id: uid('draft-exercise'), exerciseId: exercise.id, exerciseName: exercise.name, trackingMethod: exercise.trackingMethod, completed: false, sets: item.plannedSets.map(newDraftSet) }] : [];
    }));
  }, [visible, plan, exercises]);

  function requestClose() {
    if (!recordedSetCount && !note.trim()) { onClose(); return; }
    Alert.alert('Abandon workout?', 'Your entries in this active workout will be lost.', [
      { text: 'Keep working', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: onClose },
    ]);
  }
  function updateDraft(id: string, change: (draft: DraftExercise) => DraftExercise) { setDrafts((current) => current.map((draft) => draft.id === id ? change(draft) : draft)); }
  function updateSet(draftId: string, setId: string, patch: Partial<DraftSet>) { updateDraft(draftId, (draft) => ({ ...draft, sets: draft.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) })); }
  function addSet(draftId: string) { updateDraft(draftId, (draft) => ({ ...draft, sets: [...draft.sets, newDraftSet(draft.sets.at(-1)?.target ?? { id: uid('target') })] })); }
  function removeSet(draftId: string, setId: string) { updateDraft(draftId, (draft) => draft.sets.length === 1 ? draft : { ...draft, sets: draft.sets.filter((set) => set.id !== setId) }); }
  function toggleCompleted(draftId: string) { updateDraft(draftId, (draft) => ({ ...draft, completed: !draft.completed })); }

  function finish() {
    if (!plan || !recordedSetCount) { Alert.alert('Nothing logged yet', 'Enter at least one result before finishing the workout.'); return; }
    addSession({
      planId: plan.id, planName: plan.name, startedAt, completedAt: new Date().toISOString(), note: note.trim(),
      exerciseLogs: drafts.map((draft) => ({
        id: uid('exercise-log'), exerciseId: draft.exerciseId, exerciseName: draft.exerciseName,
        trackingMethod: draft.trackingMethod, completed: draft.completed || draft.sets.some(hasData),
        sets: draft.sets.filter(hasData).map((set): LoggedSet => ({
          id: uid('logged-set'), target: set.target, reps: toNumber(set.reps), weight: toNumber(set.weight) === undefined ? undefined : storeWeight(toNumber(set.weight)!, preferences),
          durationSeconds: toNumber(set.duration) === undefined ? undefined : toNumber(set.duration)! * (['duration', 'distance_duration'].includes(draft.trackingMethod) ? 60 : 1), distance: toNumber(set.distance) === undefined ? undefined : storeDistance(toNumber(set.distance)!, preferences), count: toNumber(set.count),
          workSeconds: toNumber(set.work), restSeconds: toNumber(set.rest),
        })),
      })),
    });
    onClose();
    Alert.alert('Workout complete', `${recordedSetCount} ${recordedSetCount === 1 ? 'set was' : 'sets were'} saved.`);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={requestClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={requestClose} style={styles.toolbarAction}><Text style={styles.cancel}>Cancel</Text></Pressable><View style={styles.toolbarTitle}><Text style={styles.eyebrow}>ACTIVE WORKOUT</Text><Text style={styles.title} numberOfLines={1}>{plan?.name}</Text></View><Pressable accessibilityRole="button" onPress={finish} style={styles.toolbarAction}><Text style={styles.finish}>Finish</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.progress}><Text style={styles.progressValue}>{drafts.filter((draft) => draft.completed).length}/{drafts.length}</Text><Text style={styles.progressLabel}>EXERCISES MARKED COMPLETE</Text></View>
            {drafts.map((draft, exerciseIndex) => (
              <View key={draft.id} style={[styles.exerciseCard, draft.completed && styles.completedCard]}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseOrder}>{exerciseIndex + 1}</Text>
                  <View style={styles.exerciseCopy}><Text style={styles.exerciseName}>{draft.exerciseName}</Text><Text style={styles.exerciseMethod}>{methodLabel(draft.trackingMethod)}</Text></View>
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
            <TextInput value={note} onChangeText={setNote} placeholder="How did the workout feel?" placeholderTextColor="#747c70" multiline textAlignVertical="top" style={styles.noteInput} />
            <Pressable onPress={finish} style={styles.finishButton}><Text style={styles.finishButtonText}>Finish workout · {recordedSetCount} {recordedSetCount === 1 ? 'set' : 'sets'}</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
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
function ActualFields({ method, set, preferences, update }: { method: TrackingMethod; set: DraftSet; preferences: UserPreferences; update: (patch: Partial<DraftSet>) => void }) {
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
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 15 }, toolbarTitle: { flex: 1, alignItems: 'center' }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }, finish: { color: colors.lime, fontSize: 15, fontWeight: '800', textAlign: 'right' }, content: { padding: 18, paddingBottom: 50 }, progress: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 13 }, progressValue: { color: colors.text, fontSize: 22, fontWeight: '800' }, progressLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, exerciseCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 12 }, completedCard: { borderColor: '#6f9146' }, exerciseHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }, exerciseOrder: { width: 27, color: colors.lime, fontWeight: '800' }, exerciseCopy: { flex: 1 }, exerciseName: { color: colors.text, fontSize: 15, fontWeight: '800' }, exerciseMethod: { color: colors.muted, fontSize: 11, marginTop: 2 }, checkButton: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, checkedButton: { backgroundColor: colors.lime }, setHeader: { flexDirection: 'row', paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 }, setColumn: { width: 27, color: colors.muted, fontSize: 11, fontWeight: '800' }, targetColumn: { width: 80, color: colors.muted, fontSize: 11, fontWeight: '800' }, actualColumn: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '800' }, setRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 }, setNumber: { width: 27, color: colors.muted, fontSize: 11, fontWeight: '800' }, targetText: { width: 80, color: colors.muted, fontSize: 11 }, actualFields: { flex: 1, flexDirection: 'row', gap: 5 }, field: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, minWidth: 58 }, fieldInput: { flex: 1, color: colors.text, paddingVertical: 7, paddingLeft: 7, fontSize: 11, minWidth: 25 }, suffix: { color: colors.muted, fontSize: 11, marginRight: 5 }, removeButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' }, addSet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, marginLeft: 26, alignSelf: 'flex-start' }, addSetText: { color: colors.lime, fontSize: 11, fontWeight: '800' }, noteLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 9, marginBottom: 7 }, optional: { fontWeight: '500', color: '#6f786b' }, noteInput: { minHeight: 80, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13 }, finishButton: { backgroundColor: colors.lime, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 }, finishButtonText: { color: colors.darkText, fontSize: 14, fontWeight: '800' },
});
