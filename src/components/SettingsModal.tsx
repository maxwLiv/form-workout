import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExperienceLevel, FitnessGoal, UserPreferences, useAppData } from '../data/AppDataContext';
import { chooseBackup, exportBackup } from '../data/backup';
import { colors } from '../theme';
import { displayWeight, formatMeasurement, storeWeight } from '../utils/units';

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { exercises, plans, sessions, schedule, preferences, profile, activeWorkoutDraft, updatePreferences, updateProfile, addBodyweightEntry, deleteBodyweightEntry, importStarterTemplates, resetAllData, replaceAllData } = useAppData();
  const [dataBusy, setDataBusy] = useState(false);
  const [bodyweightValue, setBodyweightValue] = useState('');
  const [bodyweightNote, setBodyweightNote] = useState('');
  function change(patch: Partial<UserPreferences>) { updatePreferences({ ...preferences, ...patch }); }
  function updateProfilePatch(patch: Partial<typeof profile>) { updateProfile({ ...profile, ...patch }); }
  function numberFromInput(value: string) {
    const parsed = Number(value.replace(',', '.'));
    return value.trim() === '' || Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
  }
  async function handleExport() {
    setDataBusy(true);
    try {
      await exportBackup({ exercises, plans, sessions, schedule, preferences, profile, activeWorkoutDraft });
    } catch (error) {
      Alert.alert('Could not export backup', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDataBusy(false);
    }
  }
  async function handleImport() {
    setDataBusy(true);
    try {
      const backup = await chooseBackup();
      if (!backup) return;
      const date = new Date(backup.summary.exportedAt).toLocaleDateString();
      Alert.alert(
        'Replace all workout data?',
        `Backup from ${date}\n${backup.summary.exercises} exercises, ${backup.summary.plans} plans, and ${backup.summary.sessions} completed workouts\n\nYour current data will be replaced. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace data', style: 'destructive', onPress: async () => {
            setDataBusy(true);
            try {
              await replaceAllData(backup.data);
              Alert.alert('Backup imported', 'Your exercises, plans, schedule, preferences, and workout history were restored.');
            } catch (error) {
              Alert.alert('Could not import backup', error instanceof Error ? error.message : 'Your existing data was not changed.');
            } finally {
              setDataBusy(false);
            }
          } },
        ],
      );
    } catch (error) {
      Alert.alert('Could not read backup', error instanceof Error ? error.message : 'The selected file could not be imported.');
    } finally {
      setDataBusy(false);
    }
  }
  function confirmReset() {
    Alert.alert('Reset all workout data?', 'This permanently removes your exercises, plans, schedule, and workout history, then restores the starter content.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset everything', style: 'destructive', onPress: async () => { await resetAllData(); onClose(); } },
    ]);
  }
  function handleImportStarterTemplates() {
    const result = importStarterTemplates();
    Alert.alert('Starter templates imported', result.exercisesAdded || result.plansAdded
      ? `${result.exercisesAdded} exercises and ${result.plansAdded} plans were added. Existing custom items were not changed.`
      : 'Your library already has the current starter exercises and plans.');
  }
  function saveBodyweight() {
    const weight = numberFromInput(bodyweightValue);
    if (!weight) { Alert.alert('Enter body weight', `Add a valid body weight in ${preferences.weightUnit}.`); return; }
    addBodyweightEntry({ date: new Date().toISOString(), weight: storeWeight(weight, preferences), note: bodyweightNote.trim() });
    setBodyweightValue('');
    setBodyweightNote('');
  }
  function toggleTrainingDay(day: number) {
    const next = profile.preferredTrainingDays.includes(day)
      ? profile.preferredTrainingDays.filter((item) => item !== day)
      : [...profile.preferredTrainingDays, day].sort((a, b) => a - b);
    updateProfilePatch({ preferredTrainingDays: next });
  }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.toolbar}><View style={styles.toolbarSpacer} /><Text style={styles.toolbarTitle}>Settings</Text><Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={onClose} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>PROFILE</Text>
          <SettingsGroup>
            <TextField label="Display name" value={profile.displayName} placeholder="Your name" onChange={(displayName) => updateProfilePatch({ displayName })} />
            <View style={styles.divider} />
            <TextField label="Height" value={profile.heightInches === undefined ? '' : String(profile.heightInches)} placeholder="Inches" keyboardType="decimal-pad" onChange={(value) => updateProfilePatch({ heightInches: numberFromInput(value) })} />
            <View style={styles.divider} />
            <TextField label={`Current body weight (${preferences.weightUnit})`} value={profile.currentWeight === undefined ? '' : formatMeasurement(displayWeight(profile.currentWeight, preferences))} placeholder="Optional" keyboardType="decimal-pad" onChange={(value) => updateProfilePatch({ currentWeight: numberFromInput(value) === undefined ? undefined : storeWeight(numberFromInput(value)!, preferences) })} />
            <View style={styles.divider} />
            <ChoiceRow label="Fitness goal" value={profile.goal} options={[['general_fitness', 'General'], ['build_muscle', 'Muscle'], ['lose_fat', 'Fat loss'], ['build_strength', 'Strength'], ['improve_endurance', 'Endurance'], ['mobility', 'Mobility']]} onChange={(goal) => updateProfilePatch({ goal: goal as FitnessGoal })} />
            <View style={styles.divider} />
            <ChoiceRow label="Experience" value={profile.experienceLevel} options={[['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']]} onChange={(experienceLevel) => updateProfilePatch({ experienceLevel: experienceLevel as ExperienceLevel })} />
            <View style={styles.divider} />
            <View style={styles.settingRow}><Text style={styles.settingTitle}>Preferred training days</Text><View style={styles.dayChips}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => <Pressable key={label} accessibilityRole="checkbox" accessibilityState={{ checked: profile.preferredTrainingDays.includes(index) }} onPress={() => toggleTrainingDay(index)} style={[styles.dayChip, profile.preferredTrainingDays.includes(index) && styles.activeDayChip]}><Text style={[styles.dayChipText, profile.preferredTrainingDays.includes(index) && styles.activeDayChipText]}>{label}</Text></Pressable>)}</View></View>
          </SettingsGroup>

          <Text style={styles.sectionLabel}>BODY METRICS</Text>
          <SettingsGroup>
            <TextField label={`New bodyweight entry (${preferences.weightUnit})`} value={bodyweightValue} placeholder="e.g. 185" keyboardType="decimal-pad" onChange={setBodyweightValue} />
            <View style={styles.divider} />
            <TextField label="Note" value={bodyweightNote} placeholder="Optional note" onChange={setBodyweightNote} />
            <Pressable onPress={saveBodyweight} style={styles.primaryRow}><Ionicons name="add-circle-outline" size={21} color={colors.darkText} /><Text style={styles.primaryRowText}>Save bodyweight entry</Text></Pressable>
            {profile.bodyweightEntries.slice(0, 5).map((entry) => <View key={entry.id} style={styles.metricRow}><View style={styles.metricCopy}><Text style={styles.metricTitle}>{formatMeasurement(displayWeight(entry.weight, preferences))} {preferences.weightUnit}</Text><Text style={styles.metricDetail}>{new Date(entry.date).toLocaleDateString()}{entry.note ? ` · ${entry.note}` : ''}</Text></View><Pressable accessibilityLabel="Delete bodyweight entry" onPress={() => deleteBodyweightEntry(entry.id)} style={styles.metricDelete}><Ionicons name="trash-outline" size={19} color="#e36b5c" /></Pressable></View>)}
          </SettingsGroup>

          <Text style={styles.sectionLabel}>MEASUREMENT UNITS</Text>
          <SettingsGroup>
            <SettingRow icon="barbell-outline" title="Weight" detail="Used for lifting targets, logs, and volume"><SegmentedControl value={preferences.weightUnit} options={[['lb', 'Pounds'], ['kg', 'Kilograms']]} onChange={(value) => change({ weightUnit: value as UserPreferences['weightUnit'] })} /></SettingRow>
            <View style={styles.divider} />
            <SettingRow icon="map-outline" title="Distance" detail="Used for running, walking, cycling, and rowing"><SegmentedControl value={preferences.distanceUnit} options={[['mi', 'Miles'], ['km', 'Kilometers']]} onChange={(value) => change({ distanceUnit: value as UserPreferences['distanceUnit'] })} /></SettingRow>
          </SettingsGroup>
          <Text style={styles.helper}>Changing units converts displayed values. Stored workout history retains its original precision.</Text>

          <Text style={styles.sectionLabel}>DATA</Text>
          <SettingsGroup>
            <DataRow icon="library-outline" title="Import starter templates" detail="Add the expanded exercise library and preset plans without replacing your data" onPress={handleImportStarterTemplates} disabled={dataBusy} />
            <View style={styles.dataDivider} />
            <DataRow icon="share-outline" title="Export backup" detail="Save a copy to Files, iCloud Drive, or another app" onPress={handleExport} disabled={dataBusy} />
            <View style={styles.dataDivider} />
            <DataRow icon="download-outline" title="Import backup" detail="Replace current data from a Form Workout backup" onPress={handleImport} disabled={dataBusy} />
            <View style={styles.dataDivider} />
            <Pressable accessibilityRole="button" accessibilityLabel="Reset all workout data" accessibilityState={{ disabled: dataBusy }} disabled={dataBusy} onPress={confirmReset} style={({ pressed }) => [styles.dangerRow, (pressed || dataBusy) && styles.pressedRow]}><Ionicons name="trash-outline" size={22} color="#e36b5c" /><View style={styles.dangerCopy}><Text style={styles.dangerTitle}>Reset all data</Text><Text style={styles.dangerDetail}>Restore the original exercises, plans, and schedule</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>
          </SettingsGroup>
          <Text style={styles.helper}>Backups contain workout data, profile details, preferences, and in-progress workout drafts in a portable JSON file.</Text>

          <View style={styles.about}><View style={styles.appMark}><Ionicons name="barbell" size={25} color={colors.darkText} /></View><Text style={styles.appName}>Form Workout</Text><Text style={styles.version}>Version 0.8.0</Text><Text style={styles.aboutText}>Your workout data is stored locally on this device.</Text></View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SettingsGroup({ children }: { children: React.ReactNode }) { return <View style={styles.group}>{children}</View>; }
function DataRow({ icon, title, detail, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void; disabled: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.dataRow, (pressed || disabled) && styles.pressedRow]}><Ionicons name={icon} size={22} color={colors.lime} /><View style={styles.dataCopy}><Text style={styles.dataTitle}>{title}</Text><Text style={styles.dataDetail}>{detail}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>; }
function SettingRow({ icon, title, detail, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; children: React.ReactNode }) { return <View style={styles.settingRow}><View style={styles.settingHeading}><View style={styles.iconBox}><Ionicons name={icon} size={21} color={colors.green} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View></View>{children}</View>; }
function SegmentedControl({ value, options, onChange }: { value: string; options: string[][]; onChange: (value: string) => void }) { return <View style={styles.segments}>{options.map(([id, label]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: value === id }} onPress={() => onChange(id)} style={[styles.segment, value === id && styles.activeSegment]}><Text style={[styles.segmentText, value === id && styles.activeSegmentText]}>{label}</Text></Pressable>)}</View>; }
function TextField({ label, value, placeholder, keyboardType, onChange }: { label: string; value: string; placeholder: string; keyboardType?: 'default' | 'decimal-pad'; onChange: (value: string) => void }) { return <View style={styles.textFieldRow}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#747c70" keyboardType={keyboardType ?? 'default'} style={styles.textInput} /></View>; }
function ChoiceRow({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <View style={styles.settingRow}><Text style={styles.settingTitle}>{label}</Text><View style={styles.choiceChips}>{options.map(([id, optionLabel]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: value === id }} onPress={() => onChange(id)} style={[styles.choiceChip, value === id && styles.activeChoiceChip]}><Text style={[styles.choiceChipText, value === id && styles.activeChoiceChipText]}>{optionLabel}</Text></Pressable>)}</View></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 10 }, toolbarSpacer: { width: 64 }, toolbarTitle: { flex: 1, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '700' }, doneButton: { width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, doneText: { color: colors.lime, fontSize: 16, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 }, sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }, group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }, settingRow: { padding: 14 }, settingHeading: { flexDirection: 'row', alignItems: 'center' }, iconBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, settingCopy: { flex: 1, marginLeft: 11 }, settingTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, settingDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 15 }, textFieldRow: { padding: 14 }, inputLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }, textInput: { minHeight: 44, borderRadius: 11, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, fontSize: 15 }, choiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, choiceChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }, activeChoiceChip: { backgroundColor: colors.lime, borderColor: colors.lime }, choiceChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, activeChoiceChipText: { color: colors.darkText }, dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, dayChip: { minHeight: 34, borderRadius: 17, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }, activeDayChip: { backgroundColor: colors.lime, borderColor: colors.lime }, dayChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, activeDayChipText: { color: colors.darkText }, primaryRow: { minHeight: 48, margin: 14, borderRadius: 12, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryRowText: { color: colors.darkText, fontSize: 14, fontWeight: '800' }, metricRow: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, metricCopy: { flex: 1 }, metricTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, metricDetail: { color: colors.muted, fontSize: 12, marginTop: 2 }, metricDelete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, segments: { height: 44, flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, padding: 3, marginTop: 12 }, segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, activeSegment: { backgroundColor: colors.lime }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, activeSegmentText: { color: colors.darkText, fontWeight: '800' }, helper: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8, marginHorizontal: 4 }, dataRow: { minHeight: 70, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' }, dataCopy: { flex: 1, marginLeft: 12 }, dataTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, dataDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, dataDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 49 }, pressedRow: { opacity: 0.55 }, dangerRow: { minHeight: 64, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' }, dangerCopy: { flex: 1, marginLeft: 12 }, dangerTitle: { color: '#f08a7b', fontSize: 16, fontWeight: '700' }, dangerDetail: { color: colors.muted, fontSize: 12, marginTop: 2 }, about: { alignItems: 'center', marginTop: 35 }, appMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, appName: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 11 }, version: { color: colors.muted, fontSize: 12, marginTop: 3 }, aboutText: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
