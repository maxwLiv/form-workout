import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseLog, LoggedSet, TrackingMethod, UserPreferences, WorkoutSession, useAppData } from '../data/AppDataContext';
import { colors } from '../theme';
import { displayDistance, displayVolume, displayWeight, formatMeasurement } from '../utils/units';

const sessionVolume = (session: WorkoutSession) => session.exerciseLogs.reduce((total, log) => total + log.sets.reduce((setTotal, set) => setTotal + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);
const sessionSetCount = (session: WorkoutSession) => session.exerciseLogs.reduce((total, log) => total + log.sets.length, 0);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

type TrendPoint = { id: string; label: string; value: number };
type Metric = { label: string; unit: string; points: TrendPoint[] };

function exerciseMetric(sessions: WorkoutSession[], exerciseId: string, preferences: UserPreferences, method?: TrackingMethod): Metric {
  const points = sessions.map((session) => {
    const sets = session.exerciseLogs.filter((log) => log.exerciseId === exerciseId).flatMap((log) => log.sets);
    let value = 0;
    if (method === 'weight_reps' || method === 'assisted_weight') value = displayWeight(Math.max(0, ...sets.map((set) => set.weight ?? 0)), preferences);
    else if (method === 'reps_only') value = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    else if (method === 'timed_sets' || method === 'duration') value = sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0) / 60;
    else if (method === 'distance_duration') value = displayDistance(sets.reduce((sum, set) => sum + (set.distance ?? 0), 0), preferences);
    else if (method === 'intervals') value = sets.reduce((sum, set) => sum + (set.workSeconds ?? 0), 0) / 60;
    else value = sets.reduce((sum, set) => sum + (set.count ?? 0), 0);
    return { id: session.id, label: shortDate(session.completedAt), value };
  }).filter((point) => point.value > 0).slice(-6);
  if (method === 'weight_reps' || method === 'assisted_weight') return { label: 'Best weight', unit: preferences.weightUnit, points };
  if (method === 'reps_only') return { label: 'Total repetitions', unit: 'reps', points };
  if (method === 'timed_sets' || method === 'duration' || method === 'intervals') return { label: 'Active duration', unit: 'min', points };
  if (method === 'distance_duration') return { label: 'Distance', unit: preferences.distanceUnit, points };
  return { label: 'Total count', unit: '', points };
}

export function ProgressScreen() {
  const { sessions, exercises, plans, preferences, deleteSession, applySessionToPlan } = useAppData();
  const [planFilter, setPlanFilter] = useState('all');
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()), [sessions]);
  const planOptions = useMemo(() => Array.from(new Map(sortedSessions.map((session) => [session.planId, session.planName])).entries()), [sortedSessions]);
  const exerciseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    sortedSessions.forEach((session) => session.exerciseLogs.forEach((log) => seen.set(log.exerciseId, exercises.find((exercise) => exercise.id === log.exerciseId)?.name ?? log.exerciseName)));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sortedSessions, exercises]);
  const filtered = useMemo(() => sortedSessions.filter((session) =>
    (planFilter === 'all' || session.planId === planFilter) &&
    (exerciseFilter === 'all' || session.exerciseLogs.some((log) => log.exerciseId === exerciseFilter)),
  ), [sortedSessions, planFilter, exerciseFilter]);
  const totalVolume = displayVolume(filtered.reduce((sum, session) => sum + sessionVolume(session), 0), preferences);
  const totalSets = filtered.reduce((sum, session) => sum + sessionSetCount(session), 0);
  const selectedExercise = exerciseFilter === 'all' ? undefined : exercises.find((exercise) => exercise.id === exerciseFilter);
  const trend = exerciseFilter === 'all'
    ? { label: 'Training volume', unit: preferences.weightUnit, points: filtered.slice(0, 6).reverse().map((session) => ({ id: session.id, label: shortDate(session.completedAt), value: displayVolume(sessionVolume(session), preferences) })) }
    : exerciseMetric([...filtered].reverse(), exerciseFilter, preferences, selectedExercise?.trackingMethod ?? filtered.flatMap((session) => session.exerciseLogs).find((log) => log.exerciseId === exerciseFilter)?.trackingMethod);

  function confirmDelete(session: WorkoutSession) {
    Alert.alert('Delete workout?', `${session.planName} from ${shortDate(session.completedAt)} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteSession(session.id); setSelectedSession(null); } },
    ]);
  }
  function confirmApplySession(session: WorkoutSession) {
    Alert.alert('Update plan targets?', `Replace ${session.planName}'s targets with the actual sets from this workout? Workout history will remain unchanged.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update plan', onPress: () => {
        const updated = applySessionToPlan(session.id);
        Alert.alert(updated ? 'Plan updated' : 'Plan unavailable', updated ? 'The completed sets are now the plan targets.' : 'This plan may have been deleted.');
      } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>TRAINING INSIGHTS</Text><Text style={styles.title}>Progress</Text>
        <View style={styles.stats}><Stat value={String(filtered.length)} label="WORKOUTS" /><Stat value={String(totalSets)} label="SETS" /><Stat value={formatMeasurement(totalVolume)} label={`VOLUME ${preferences.weightUnit.toUpperCase()}`} /></View>

        {!!sessions.length && <>
          <FilterRow label="WORKOUT PLAN" value={planFilter} options={[['all', 'All plans'], ...planOptions]} onChange={setPlanFilter} />
          <FilterRow label="EXERCISE" value={exerciseFilter} options={[['all', 'All exercises'], ...exerciseOptions]} onChange={setExerciseFilter} />
          <View style={styles.chartCard}><View style={styles.chartHeading}><View><Text style={styles.cardEyebrow}>{selectedExercise?.name.toUpperCase() ?? 'LAST 6 MATCHING WORKOUTS'}</Text><Text style={styles.cardTitle}>{trend.label}</Text></View>{trend.points.length > 0 && <Text style={styles.latestValue}>{formatNumber(trend.points.at(-1)?.value ?? 0)} <Text style={styles.latestUnit}>{trend.unit}</Text></Text>}</View><BarChart points={trend.points} unit={trend.unit} /></View>
          {exerciseFilter !== 'all' && <PersonalBestCard sessions={filtered} exerciseId={exerciseFilter} method={selectedExercise?.trackingMethod} preferences={preferences} />}
        </>}

        <View style={styles.historyHeading}><View><Text style={styles.cardEyebrow}>TRAINING LOG</Text><Text style={styles.historyTitle}>Workout history</Text></View><Text style={styles.resultCount}>{filtered.length} results</Text></View>
        {!sessions.length ? <View style={styles.empty}><Ionicons name="stats-chart-outline" size={45} color={colors.green} /><Text style={styles.emptyTitle}>No progress yet</Text><Text style={styles.emptyText}>Complete a workout and it will appear here with its volume and performance trends.</Text></View>
          : !filtered.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No matching workouts</Text><Text style={styles.emptyText}>Adjust your plan or exercise filters.</Text></View>
          : filtered.map((session) => <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={`${session.planName}, ${shortDate(session.completedAt)}, ${sessionSetCount(session)} sets`} onPress={() => setSelectedSession(session)} style={styles.sessionRow}><View style={styles.sessionDate}><Text style={styles.sessionMonth}>{new Date(session.completedAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text><Text style={styles.sessionDay}>{new Date(session.completedAt).getDate()}</Text></View><View style={styles.sessionCopy}><Text style={styles.sessionName}>{session.planName}</Text><Text style={styles.sessionMeta}>{sessionSetCount(session)} sets - {formatMeasurement(displayVolume(sessionVolume(session), preferences))} {preferences.weightUnit} volume</Text></View><Ionicons name="chevron-forward" size={20} color={colors.darkMuted} /></Pressable>)}
      </ScrollView>
      <SessionDetail session={selectedSession} visible={!!selectedSession} preferences={preferences} canUpdatePlan={!!selectedSession && plans.some((plan) => plan.id === selectedSession.planId)} onClose={() => setSelectedSession(null)} onDelete={() => selectedSession && confirmDelete(selectedSession)} onUpdatePlan={() => selectedSession && confirmApplySession(selectedSession)} />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function FilterRow({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <View><Text style={styles.filterLabel}>{label}</Text><ScrollView horizontal style={styles.filterScroll} contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>{options.map(([id, title]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: value === id }} onPress={() => onChange(id)} style={[styles.filterChip, value === id ? styles.activeFilter : styles.inactiveFilter]}><Text style={[styles.filterText, value === id && styles.activeFilterText]}>{title}</Text></Pressable>)}</ScrollView></View>; }
function BarChart({ points, unit }: { points: TrendPoint[]; unit: string }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  if (!points.length) return <View style={styles.noChart}><Text style={styles.noChartText}>No measurable results for this selection yet.</Text></View>;
  return <View style={styles.chart}>{points.map((point) => <View key={point.id} style={styles.barColumn}><Text style={styles.barValue}>{formatNumber(point.value)}</Text><View style={styles.barTrack}><View style={[styles.bar, { height: Math.max(4, point.value / max * 110) }]} /></View><Text style={styles.barLabel}>{point.label}</Text></View>)}</View>;
}
function PersonalBestCard({ sessions, exerciseId, method, preferences }: { sessions: WorkoutSession[]; exerciseId: string; method?: TrackingMethod; preferences: UserPreferences }) {
  const sets = sessions.flatMap((session) => session.exerciseLogs.filter((log) => log.exerciseId === exerciseId).flatMap((log) => log.sets));
  const maxWeight = Math.max(0, ...sets.map((set) => set.weight ?? 0));
  const maxReps = Math.max(0, ...sets.map((set) => set.reps ?? 0));
  const estimated1RM = Math.max(0, ...sets.map((set) => (set.weight ?? 0) * (1 + (set.reps ?? 0) / 30)));
  const maxDuration = Math.max(0, ...sets.map((set) => set.durationSeconds ?? 0));
  const maxDistance = Math.max(0, ...sets.map((set) => set.distance ?? 0));
  const maxCount = Math.max(0, ...sets.map((set) => set.count ?? 0));
  const strength = method === 'weight_reps' || method === 'assisted_weight';
  return <View style={styles.bestCard}><View style={styles.bestIcon}><Ionicons name="trophy-outline" size={23} color="#9b6a16" /></View><View style={styles.bestCopy}><Text style={styles.cardEyebrow}>PERSONAL BESTS</Text><Text style={styles.bestText}>{strength ? `${formatMeasurement(displayWeight(maxWeight, preferences))} ${preferences.weightUnit} heaviest - ${formatMeasurement(displayWeight(estimated1RM, preferences))} ${preferences.weightUnit} estimated 1RM` : method === 'reps_only' ? `${maxReps} reps in one set` : method === 'distance_duration' ? `${formatMeasurement(displayDistance(maxDistance, preferences))} ${preferences.distanceUnit} longest activity` : method === 'custom_count' ? `${maxCount} highest count` : `${formatNumber(maxDuration / 60)} min longest effort`}</Text></View></View>;
}

function SessionDetail({ session, visible, preferences, canUpdatePlan, onClose, onDelete, onUpdatePlan }: { session: WorkoutSession | null; visible: boolean; preferences: UserPreferences; canUpdatePlan: boolean; onClose: () => void; onDelete: () => void; onUpdatePlan: () => void }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={detailStyles.safeArea}><View style={detailStyles.toolbar}><Pressable accessibilityRole="button" onPress={onClose} style={detailStyles.toolbarAction}><Text style={detailStyles.close}>Done</Text></Pressable><Text style={detailStyles.toolbarTitle}>Workout Details</Text><Pressable accessibilityRole="button" accessibilityLabel="Delete workout" onPress={onDelete} style={detailStyles.toolbarAction}><Ionicons name="trash-outline" size={21} color="#e98570" /></Pressable></View>{session && <ScrollView contentContainerStyle={detailStyles.content}><Text style={detailStyles.eyebrow}>{longDate(session.completedAt).toUpperCase()}</Text><Text style={detailStyles.title}>{session.planName}</Text><View style={detailStyles.summary}><Stat value={String(sessionSetCount(session))} label="SETS" /><Stat value={formatMeasurement(displayVolume(sessionVolume(session), preferences))} label={`VOLUME ${preferences.weightUnit.toUpperCase()}`} /></View>{session.exerciseLogs.filter((log) => log.sets.length).map((log) => <View key={log.id} style={detailStyles.logCard}><View style={detailStyles.logHeading}><Text style={detailStyles.logName}>{log.exerciseName}</Text>{log.completed && <Ionicons name="checkmark-circle" size={19} color={colors.green} />}</View>{log.sets.map((set, index) => <View key={set.id} style={detailStyles.setRow}><Text style={detailStyles.setNumber}>SET {index + 1}</Text><Text style={detailStyles.setResult}>{formatLoggedSet(log, set, preferences)}</Text></View>)}</View>)}{!!session.note && <View style={detailStyles.note}><Text style={detailStyles.noteLabel}>SESSION NOTE</Text><Text style={detailStyles.noteText}>{session.note}</Text></View>}{canUpdatePlan && <Pressable accessibilityRole="button" onPress={onUpdatePlan} style={detailStyles.updateButton}><Ionicons name="refresh-outline" size={20} color={colors.darkText} /><Text style={detailStyles.updateButtonText}>Use results as plan targets</Text></Pressable>}</ScrollView>}</SafeAreaView></Modal>;
}

function formatLoggedSet(log: ExerciseLog, set: LoggedSet, preferences: UserPreferences) {
  if (log.trackingMethod === 'weight_reps') return `${formatMeasurement(displayWeight(set.weight ?? 0, preferences))} ${preferences.weightUnit} x ${set.reps ?? 0} reps`;
  if (log.trackingMethod === 'reps_only') return `${set.reps ?? 0} reps`;
  if (log.trackingMethod === 'assisted_weight') return `${formatMeasurement(displayWeight(set.weight ?? 0, preferences))} ${preferences.weightUnit} adjustment x ${set.reps ?? 0} reps`;
  if (log.trackingMethod === 'timed_sets') return `${formatNumber(set.durationSeconds ?? 0)} sec${set.weight ? ` - ${formatMeasurement(displayWeight(set.weight, preferences))} ${preferences.weightUnit}` : ''}`;
  if (log.trackingMethod === 'duration') return `${formatNumber((set.durationSeconds ?? 0) / 60)} minutes`;
  if (log.trackingMethod === 'distance_duration') return `${formatMeasurement(displayDistance(set.distance ?? 0, preferences))} ${preferences.distanceUnit} - ${formatNumber((set.durationSeconds ?? 0) / 60)} min`;
  if (log.trackingMethod === 'intervals') return `${set.workSeconds ?? 0}s work · ${set.restSeconds ?? 0}s rest`;
  return `${set.count ?? 0} count`;
}
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, page: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 40 }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 31, fontWeight: '800', marginTop: 5 }, stats: { flexDirection: 'row', gap: 9, marginTop: 18 }, stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 13, padding: 13 }, statValue: { color: colors.text, fontSize: 20, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4 }, filterLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 17, marginBottom: 5 }, filterScroll: { flexGrow: 0, height: 52 }, filters: { gap: 7, alignItems: 'center' }, filterChip: { height: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 12, justifyContent: 'center' }, inactiveFilter: { backgroundColor: colors.surface, borderColor: colors.border }, activeFilter: { backgroundColor: colors.lime, borderColor: colors.lime }, filterText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, activeFilterText: { color: colors.darkText }, chartCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 16 }, chartHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, cardEyebrow: { color: colors.darkMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, cardTitle: { color: colors.darkText, fontSize: 17, fontWeight: '800', marginTop: 3 }, latestValue: { color: colors.green, fontSize: 21, fontWeight: '800' }, latestUnit: { fontSize: 11 }, chart: { height: 155, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 13 }, barColumn: { flex: 1, height: 150, alignItems: 'center', justifyContent: 'flex-end' }, barValue: { color: colors.darkMuted, fontSize: 11, marginBottom: 3 }, barTrack: { height: 110, width: '70%', justifyContent: 'flex-end' }, bar: { backgroundColor: colors.green, borderRadius: 5, minWidth: 8 }, barLabel: { color: colors.darkMuted, fontSize: 11, marginTop: 5 }, noChart: { height: 115, alignItems: 'center', justifyContent: 'center' }, noChartText: { color: colors.darkMuted, fontSize: 11 }, bestCard: { backgroundColor: '#f3ead8', borderRadius: 15, padding: 14, marginTop: 11, flexDirection: 'row', alignItems: 'center' }, bestIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#ead7af', alignItems: 'center', justifyContent: 'center' }, bestCopy: { flex: 1, marginLeft: 11 }, bestText: { color: '#60491e', fontSize: 12, fontWeight: '700', marginTop: 4 }, historyHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 }, historyTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 3 }, resultCount: { color: colors.muted, fontSize: 11 }, sessionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 13, borderRadius: 14, marginBottom: 9 }, sessionDate: { width: 43, height: 45, borderRadius: 11, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, sessionMonth: { color: colors.green, fontSize: 11, fontWeight: '900' }, sessionDay: { color: colors.darkText, fontSize: 17, fontWeight: '800' }, sessionCopy: { flex: 1, marginLeft: 11 }, sessionName: { color: colors.darkText, fontSize: 15, fontWeight: '800' }, sessionMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 3 }, empty: { alignItems: 'center', padding: 40, backgroundColor: colors.surface, borderRadius: 18 }, emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 13 }, emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 6 },
});

const detailStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, close: { color: colors.lime, fontSize: 15, fontWeight: '700' }, toolbarTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, content: { padding: 20, paddingBottom: 50 }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.text, fontSize: 29, fontWeight: '800', marginTop: 5 }, summary: { flexDirection: 'row', gap: 9, marginTop: 16, marginBottom: 17 }, logCard: { backgroundColor: colors.card, borderRadius: 15, padding: 14, marginBottom: 10 }, logHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }, logName: { color: colors.darkText, fontSize: 15, fontWeight: '800' }, setRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9dbd2', paddingVertical: 10 }, setNumber: { color: colors.darkMuted, fontSize: 11, fontWeight: '800' }, setResult: { color: colors.darkText, fontSize: 12, fontWeight: '700' }, note: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginTop: 4 }, noteLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, noteText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 6 }, updateButton: { minHeight: 50, borderRadius: 12, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }, updateButtonText: { color: colors.darkText, fontSize: 15, fontWeight: '800' },
});
