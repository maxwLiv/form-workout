import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appMetadata } from '../config/appMetadata';
import { useAppData } from '../data/AppDataContext';
import { colors } from '../theme';

type FeedbackType = 'Bug' | 'Idea' | 'Confusing' | 'Other';
const feedbackTypes: FeedbackType[] = ['Bug', 'Idea', 'Confusing', 'Other'];
const feedbackRecipient = 'maxwellliv@gmail.com';

export function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { exercises, plans, sessions, preferences, activeWorkoutDraft } = useAppData();
  const [type, setType] = useState<FeedbackType>('Bug');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [sending, setSending] = useState(false);

  function formattedFallback(subject: string, body: string) {
    return `To: ${feedbackRecipient}\nSubject: ${subject}\n\n${body}`;
  }

  function buildBody() {
    return [
      `Feedback type: ${type}`,
      '',
      'Message:',
      message.trim(),
      '',
      'Steps to reproduce:',
      steps.trim() || 'Not provided',
      '',
      'App context:',
      `App: ${appMetadata.name} ${appMetadata.version}`,
      `Platform: ${Platform.OS}`,
      `Submitted: ${new Date().toISOString()}`,
      `Plans: ${plans.length}`,
      `Exercises: ${exercises.length}`,
      `Completed workouts: ${sessions.length}`,
      `Active workout draft: ${activeWorkoutDraft ? activeWorkoutDraft.planName : 'None'}`,
      `Units: ${preferences.weightUnit}, ${preferences.distanceUnit}`,
    ].join('\n');
  }

  async function openMailLink(subject: string, body: string) {
    const url = `mailto:${feedbackRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return false;
    await Linking.openURL(url);
    return true;
  }

  function showManualFallback(subject: string, body: string) {
    setFallbackText(formattedFallback(subject, body));
    Alert.alert('Email app not available', 'A prepared report is shown below. Select the text and send it to maxwellliv@gmail.com.');
  }

  async function sendFeedback() {
    if (!message.trim()) {
      Alert.alert('Add a message', 'Tell us what happened or what would make Form Workout better.');
      return;
    }
    const body = buildBody();
    const subject = `[Form Workout Feedback] ${type}`;
    setSending(true);
    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        const opened = await openMailLink(subject, body);
        if (opened) {
          setMessage('');
          setSteps('');
          setFallbackText('');
          onClose();
          return;
        }
        showManualFallback(subject, body);
        return;
      }
      const result = await MailComposer.composeAsync({ recipients: [feedbackRecipient], subject, body });
      if (result.status === MailComposer.MailComposerStatus.CANCELLED) return;
      setMessage('');
      setSteps('');
      setFallbackText('');
      onClose();
    } catch {
      showManualFallback(subject, body);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.toolbarAction}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Text style={styles.toolbarTitle}>Send Feedback</Text>
            <Pressable accessibilityRole="button" disabled={sending} onPress={sendFeedback} style={styles.toolbarAction}><Text style={[styles.sendText, sending && styles.disabledText]}>Send</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>Send bugs, confusing moments, or ideas directly to Maxwell.</Text>
            <Text style={styles.label}>TYPE</Text>
            <View style={styles.choiceChips}>{feedbackTypes.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: type === option }} onPress={() => setType(option)} style={[styles.choiceChip, type === option && styles.activeChoiceChip]}><Text style={[styles.choiceChipText, type === option && styles.activeChoiceChipText]}>{option}</Text></Pressable>)}</View>
            <Text style={styles.label}>MESSAGE</Text>
            <TextInput value={message} onChangeText={setMessage} placeholder="What happened?" placeholderTextColor="#747c70" multiline style={[styles.textInput, styles.feedbackInput]} />
            <Text style={styles.label}>STEPS OPTIONAL</Text>
            <TextInput value={steps} onChangeText={setSteps} placeholder="1. Opened...\n2. Tapped...\n3. Saw..." placeholderTextColor="#747c70" multiline style={[styles.textInput, styles.stepsInput]} />
            {!!fallbackText && <View style={styles.fallbackBox}><Text style={styles.fallbackTitle}>Email app not available</Text><Text style={styles.fallbackHelp}>Select this prepared report and send it to maxwellliv@gmail.com.</Text><TextInput value={fallbackText} editable={false} multiline selectTextOnFocus style={styles.fallbackText} /></View>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 10 },
  toolbarAction: { width: 78, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  toolbarTitle: { flex: 1, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  cancelText: { color: colors.muted, fontSize: 16 },
  sendText: { color: colors.lime, fontSize: 16, fontWeight: '800' },
  disabledText: { opacity: 0.5 },
  content: { padding: 20, paddingBottom: 50 },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  choiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  choiceChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  activeChoiceChip: { backgroundColor: colors.lime, borderColor: colors.lime },
  choiceChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  activeChoiceChipText: { color: colors.darkText },
  textInput: { minHeight: 44, borderRadius: 11, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, fontSize: 15 },
  feedbackInput: { minHeight: 130, paddingTop: 12, textAlignVertical: 'top' },
  stepsInput: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' },
  fallbackBox: { marginTop: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 },
  fallbackTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  fallbackHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 },
  fallbackText: { minHeight: 190, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 10, fontSize: 12, textAlignVertical: 'top' },
});
