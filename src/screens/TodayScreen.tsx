import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutLoggerModal } from '../components/WorkoutLoggerModal';
import { useAppData, WorkoutPlan } from '../data/AppDataContext';
import { colors } from '../theme';
import { completedSessionToday, summarizeExerciseLog } from '../utils/sessionSummary';
import { SettingsModal } from '../components/SettingsModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { displayVolume, formatMeasurement } from '../utils/units';

export function TodayScreen() {
  const { plans, exercises, sessions, schedule, preferences } = useAppData();
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const todayIndex = new Date().getDay();
  const scheduledPlan = plans.find((plan) => plan.id === schedule[todayIndex]);
  const completedSession = completedSessionToday(sessions, scheduledPlan?.id);
  const planExercises = scheduledPlan?.exercises.flatMap((item) => {
    const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
    return exercise ? [{ name: exercise.name, detail: `${item.plannedSets.length} ${item.plannedSets.length === 1 ? 'set' : 'sets'} - ${exercise.exerciseType}` }] : [];
  }) ?? [];
  const completedExercises = completedSession?.exerciseLogs.filter((log) => log.sets.length > 0) ?? [];
  const totalVolume = sessions.reduce((sessionTotal, session) => sessionTotal + session.exerciseLogs.reduce((logTotal, log) => logTotal + log.sets.reduce((setTotal, set) => setTotal + (set.weight ?? 0) * (set.reps ?? 0), 0), 0), 0);
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}><View><Text style={styles.eyebrow}>{date}</Text><Text style={styles.heading}>{completedSession ? 'Nice work today.' : 'Ready to move?'}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => setSettingsOpen(true)} style={styles.settingsButton}><Ionicons name="settings-outline" size={23} color={colors.text} /></TouchableOpacity></View>
        <View style={[styles.hero, completedSession && styles.completedHero]}>
          <Text style={styles.heroEyebrow}>{completedSession ? 'SESSION SAVED' : "TODAY'S WORKOUT"}</Text>
          <Text style={styles.heroTitle}>{completedSession ? 'Workout complete' : scheduledPlan?.name ?? 'Recovery day'}</Text>
          <Text style={styles.heroDetail}>{completedSession ? `${scheduledPlan?.name} - ${completedExercises.length} exercises completed` : scheduledPlan ? `${scheduledPlan.exercises.length} exercises scheduled for today` : 'No workout scheduled - rest and recharge'}</Text>
          <TouchableOpacity disabled={!scheduledPlan || !!completedSession} onPress={() => scheduledPlan && setActivePlan(scheduledPlan)} style={[styles.startButton, (!scheduledPlan || !!completedSession) && styles.disabledButton]} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>{completedSession ? 'Completed  ✓' : scheduledPlan ? 'Start workout  ->' : 'Rest day'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{completedSession ? 'Completed summary' : scheduledPlan ? 'On the plan' : "Today's focus"}</Text>
        {completedSession ? <View style={styles.list}>
          {completedExercises.map((log, index) => (
            <View key={log.id} style={[styles.row, index === completedExercises.length - 1 && styles.lastRow]}>
              <View style={[styles.number, styles.completedNumber]}><Text style={styles.completedNumberText}>✓</Text></View>
              <View style={styles.rowCopy}><Text style={styles.exerciseName}>{log.exerciseName}</Text><Text style={styles.exerciseDetail}>{summarizeExerciseLog(log, preferences)}</Text></View>
            </View>
          ))}
        </View> : scheduledPlan ? <View style={styles.list}>
          {planExercises.map((exercise, index) => (
            <View key={exercise.name} style={[styles.row, index === planExercises.length - 1 && styles.lastRow]}>
              <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
              <View style={styles.rowCopy}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseDetail}>{exercise.detail}</Text></View>
            </View>
          ))}
        </View> : <View style={styles.restCard}><Text style={styles.restCardTitle}>Recovery is training, too.</Text><Text style={styles.restCardText}>Use today to rest, walk, stretch, or adjust your week in Schedule.</Text></View>}

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{sessions.length}</Text><Text style={styles.statLabel}>WORKOUTS</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{formatMeasurement(displayVolume(totalVolume, preferences))} {preferences.weightUnit}</Text><Text style={styles.statLabel}>TOTAL VOLUME</Text></View>
        </View>
      </ScrollView>
      <WorkoutLoggerModal plan={activePlan} visible={!!activePlan} onClose={() => setActivePlan(null)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, page: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 35 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 }, settingsButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }, heading: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 7 },
  hero: { backgroundColor: colors.green, borderRadius: 24, padding: 25 }, completedHero: { backgroundColor: '#355c3e' }, heroEyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heroTitle: { color: 'white', fontSize: 37, fontWeight: '800', marginTop: 10 }, heroDetail: { color: '#c5d0c3', fontSize: 14, marginTop: 4 },
  startButton: { backgroundColor: colors.lime, borderRadius: 12, marginTop: 28, padding: 15, alignItems: 'center' }, disabledButton: { opacity: 0.62 }, startButtonText: { color: '#17200f', fontSize: 15, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 30, marginBottom: 13 }, list: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderBottomColor: '#deddd4', borderBottomWidth: StyleSheet.hairlineWidth }, lastRow: { borderBottomWidth: 0 }, rowCopy: { flex: 1 },
  number: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, completedNumber: { backgroundColor: colors.green }, completedNumberText: { color: colors.lime, fontWeight: '900' }, numberText: { color: colors.green, fontWeight: '800' },
  exerciseName: { color: colors.darkText, fontSize: 15, fontWeight: '700' }, exerciseDetail: { color: colors.darkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 }, stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 17 }, statValue: { color: colors.text, fontSize: 22, fontWeight: '800' }, statLabel: { color: '#899184', fontSize: 11, fontWeight: '700', marginTop: 4 },
  restCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 }, restCardTitle: { color: colors.darkText, fontSize: 16, fontWeight: '800' }, restCardText: { color: colors.darkMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
});
