import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutLoggerModal } from '../components/WorkoutLoggerModal';
import { WorkoutPlan, useAppData } from '../data/AppDataContext';
import { colors } from '../theme';
import { completedSessionToday, completedSetCount } from '../utils/sessionSummary';

const week = [
  { index: 1, name: 'Monday', short: 'MON' }, { index: 2, name: 'Tuesday', short: 'TUE' },
  { index: 3, name: 'Wednesday', short: 'WED' }, { index: 4, name: 'Thursday', short: 'THU' },
  { index: 5, name: 'Friday', short: 'FRI' }, { index: 6, name: 'Saturday', short: 'SAT' },
  { index: 0, name: 'Sunday', short: 'SUN' },
];

export function ScheduleScreen() {
  const { plans, exercises, sessions, schedule, setScheduledPlan, activeWorkoutDraft, startWorkoutDraft, discardActiveWorkoutDraft } = useAppData();
  const [selectingDay, setSelectingDay] = useState<number | null>(null);
  const [loggerOpen, setLoggerOpen] = useState(false);
  const today = new Date().getDay();
  const assignedCount = Object.values(schedule).filter(Boolean).length;
  const planFor = (day: number) => plans.find((plan) => plan.id === schedule[day]);
  function choose(planId: string | null) { if (selectingDay !== null) setScheduledPlan(selectingDay, planId); setSelectingDay(null); }
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
      <View style={styles.header}><Text style={styles.eyebrow}>YOUR TRAINING RHYTHM</Text><Text style={styles.title}>Weekly Schedule</Text><Text style={styles.subtitle}>{assignedCount} training {assignedCount === 1 ? 'day' : 'days'} - tap a day to change it</Text></View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {week.map((day) => {
          const plan = planFor(day.index);
          const isToday = day.index === today;
          const completedSession = isToday ? completedSessionToday(sessions, plan?.id) : undefined;
          return (
            <View key={day.index} style={[styles.dayCard, isToday && styles.todayCard]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${day.name}, ${plan?.name ?? 'recovery day'}${completedSession ? ', completed' : ''}`} onPress={() => setSelectingDay(day.index)} style={styles.dayMain}>
                <View style={[styles.dayBadge, isToday && styles.todayBadge]}><Text style={[styles.dayShort, isToday && styles.todayBadgeText]}>{day.short}</Text></View>
                <View style={styles.dayCopy}>
                  <View style={styles.dayTitleRow}><Text style={styles.dayName}>{day.name}</Text>{isToday && <Text style={styles.todayPill}>TODAY</Text>}{completedSession && <Text style={styles.completedPill}>COMPLETED</Text>}</View>
                  <Text style={[styles.planName, !plan && styles.restText]}>{plan?.name ?? 'Recovery day'}</Text>
                  <Text style={styles.planMeta}>{completedSession ? `${completedSetCount(completedSession)} sets saved today` : plan ? `${plan.exercises.length} ${plan.exercises.length === 1 ? 'exercise' : 'exercises'}` : 'No workout scheduled'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.darkMuted} />
              </Pressable>
              {isToday && plan && (completedSession
                ? <View style={[styles.startButton, styles.completedButton]}><Ionicons name="checkmark-circle" size={16} color={colors.darkText} /><Text style={styles.startText}>Workout complete</Text></View>
                : <Pressable onPress={() => startWorkout(plan)} style={styles.startButton}><Ionicons name="play" size={14} color={colors.darkText} /><Text style={styles.startText}>Start today's workout</Text></Pressable>)}
            </View>
          );
        })}
      </ScrollView>
      <DayPlanPicker visible={selectingDay !== null} day={week.find((item) => item.index === selectingDay)?.name ?? ''} currentPlanId={selectingDay === null ? null : schedule[selectingDay]} plans={plans} exercises={exercises} onChoose={choose} onCancel={() => setSelectingDay(null)} />
      <WorkoutLoggerModal visible={loggerOpen} onClose={() => setLoggerOpen(false)} />
    </SafeAreaView>
  );
}

function DayPlanPicker({ visible, day, currentPlanId, plans, exercises, onChoose, onCancel }: { visible: boolean; day: string; currentPlanId: string | null; plans: WorkoutPlan[]; exercises: ReturnType<typeof useAppData>['exercises']; onChoose: (planId: string | null) => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={pickerStyles.safeArea}>
        <View style={pickerStyles.toolbar}><Pressable accessibilityRole="button" onPress={onCancel} style={pickerStyles.toolbarAction}><Text style={pickerStyles.cancel}>Cancel</Text></Pressable><View style={pickerStyles.heading}><Text style={pickerStyles.eyebrow}>ASSIGN WORKOUT</Text><Text style={pickerStyles.title}>{day}</Text></View><View style={pickerStyles.toolbarSpacer} /></View>
        <ScrollView contentContainerStyle={pickerStyles.content}>
          <PlanOption selected={currentPlanId === null} icon="leaf-outline" name="Recovery day" detail="No planned workout" onPress={() => onChoose(null)} />
          {plans.map((plan) => <PlanOption key={plan.id} selected={currentPlanId === plan.id} icon="barbell-outline" name={plan.name} detail={plan.exercises.map((item) => exercises.find((exercise) => exercise.id === item.exerciseId)?.name).filter(Boolean).join(' - ')} onPress={() => onChoose(plan.id)} />)}
          {!plans.length && <Text style={pickerStyles.noPlans}>Create a workout plan before assigning a training day.</Text>}
          <Text style={pickerStyles.hint}>The same plan can be assigned to multiple days.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlanOption({ selected, icon, name, detail, onPress }: { selected: boolean; icon: keyof typeof Ionicons.glyphMap; name: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${name}, ${detail}`} onPress={onPress} style={[pickerStyles.option, selected && pickerStyles.selectedOption]}><View style={pickerStyles.optionIcon}><Ionicons name={icon} size={22} color={colors.green} /></View><View style={pickerStyles.optionCopy}><Text style={pickerStyles.optionName}>{name}</Text><Text style={pickerStyles.optionMeta}>{detail}</Text></View>{selected && <Ionicons name="checkmark-circle" size={23} color={colors.green} />}</Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 5 }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 7 }, list: { paddingHorizontal: 22, paddingBottom: 35, gap: 10 },
  dayCard: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' }, todayCard: { borderColor: colors.lime }, dayMain: { flexDirection: 'row', alignItems: 'center', padding: 14 }, dayBadge: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#e6eadf', alignItems: 'center', justifyContent: 'center' }, todayBadge: { backgroundColor: colors.green }, dayShort: { color: colors.green, fontSize: 11, fontWeight: '800' }, todayBadgeText: { color: colors.lime }, dayCopy: { flex: 1, marginLeft: 12 }, dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, dayName: { color: colors.darkText, fontSize: 14, fontWeight: '800' }, todayPill: { color: colors.green, backgroundColor: '#ddedc8', fontSize: 11, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }, completedPill: { color: '#f5f8ee', backgroundColor: colors.green, fontSize: 11, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }, planName: { color: colors.green, fontSize: 17, fontWeight: '800', marginTop: 4 }, restText: { color: colors.darkMuted }, planMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 2 }, startButton: { minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9dbd2', backgroundColor: colors.lime, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, completedButton: { backgroundColor: '#b7dc72' }, startText: { color: colors.darkText, fontSize: 11, fontWeight: '800' },
});

const pickerStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 15 }, toolbarSpacer: { width: 72 }, heading: { flex: 1, alignItems: 'center' }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 2 }, content: { padding: 18, gap: 9, paddingBottom: 50 }, option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 13 }, selectedOption: { borderColor: colors.lime }, optionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, optionCopy: { flex: 1, marginLeft: 11 }, optionName: { color: colors.darkText, fontSize: 15, fontWeight: '800' }, optionMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 3 }, noPlans: { color: colors.muted, textAlign: 'center', padding: 25 }, hint: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
