import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPreferences, useAppData } from '../data/AppDataContext';
import { chooseBackup, exportBackup } from '../data/backup';
import { colors } from '../theme';

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { exercises, plans, sessions, schedule, preferences, updatePreferences, resetAllData, replaceAllData } = useAppData();
  const [dataBusy, setDataBusy] = useState(false);
  function change(patch: Partial<UserPreferences>) { updatePreferences({ ...preferences, ...patch }); }
  async function handleExport() {
    setDataBusy(true);
    try {
      await exportBackup({ exercises, plans, sessions, schedule, preferences });
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
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.toolbar}><View style={styles.toolbarSpacer} /><Text style={styles.toolbarTitle}>Settings</Text><Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={onClose} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>MEASUREMENT UNITS</Text>
          <SettingsGroup>
            <SettingRow icon="barbell-outline" title="Weight" detail="Used for lifting targets, logs, and volume"><SegmentedControl value={preferences.weightUnit} options={[['lb', 'Pounds'], ['kg', 'Kilograms']]} onChange={(value) => change({ weightUnit: value as UserPreferences['weightUnit'] })} /></SettingRow>
            <View style={styles.divider} />
            <SettingRow icon="map-outline" title="Distance" detail="Used for running, walking, cycling, and rowing"><SegmentedControl value={preferences.distanceUnit} options={[['mi', 'Miles'], ['km', 'Kilometers']]} onChange={(value) => change({ distanceUnit: value as UserPreferences['distanceUnit'] })} /></SettingRow>
          </SettingsGroup>
          <Text style={styles.helper}>Changing units converts displayed values. Stored workout history retains its original precision.</Text>

          <Text style={styles.sectionLabel}>DATA</Text>
          <SettingsGroup>
            <DataRow icon="share-outline" title="Export backup" detail="Save a copy to Files, iCloud Drive, or another app" onPress={handleExport} disabled={dataBusy} />
            <View style={styles.dataDivider} />
            <DataRow icon="download-outline" title="Import backup" detail="Replace current data from a Form Workout backup" onPress={handleImport} disabled={dataBusy} />
            <View style={styles.dataDivider} />
            <Pressable accessibilityRole="button" accessibilityLabel="Reset all workout data" accessibilityState={{ disabled: dataBusy }} disabled={dataBusy} onPress={confirmReset} style={({ pressed }) => [styles.dangerRow, (pressed || dataBusy) && styles.pressedRow]}><Ionicons name="trash-outline" size={22} color="#e36b5c" /><View style={styles.dangerCopy}><Text style={styles.dangerTitle}>Reset all data</Text><Text style={styles.dangerDetail}>Restore the original exercises, plans, and schedule</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>
          </SettingsGroup>
          <Text style={styles.helper}>Backups contain all workout data and preferences in a portable JSON file.</Text>

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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 10 }, toolbarSpacer: { width: 64 }, toolbarTitle: { flex: 1, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '700' }, doneButton: { width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, doneText: { color: colors.lime, fontSize: 16, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 }, sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }, group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }, settingRow: { padding: 14 }, settingHeading: { flexDirection: 'row', alignItems: 'center' }, iconBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, settingCopy: { flex: 1, marginLeft: 11 }, settingTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, settingDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 65 }, segments: { height: 44, flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, padding: 3, marginTop: 12 }, segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, activeSegment: { backgroundColor: colors.lime }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, activeSegmentText: { color: colors.darkText, fontWeight: '800' }, helper: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8, marginHorizontal: 4 }, dataRow: { minHeight: 70, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' }, dataCopy: { flex: 1, marginLeft: 12 }, dataTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, dataDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, dataDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 49 }, pressedRow: { opacity: 0.55 }, dangerRow: { minHeight: 64, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' }, dangerCopy: { flex: 1, marginLeft: 12 }, dangerTitle: { color: '#f08a7b', fontSize: 16, fontWeight: '700' }, dangerDetail: { color: colors.muted, fontSize: 12, marginTop: 2 }, about: { alignItems: 'center', marginTop: 35 }, appMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, appName: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 11 }, version: { color: colors.muted, fontSize: 12, marginTop: 3 }, aboutText: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
