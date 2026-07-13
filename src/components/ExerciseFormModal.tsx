import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Exercise, ExerciseInput, ExerciseType, MuscleGroup, TrackingMethod,
  exerciseTypes, muscleGroups, recommendedTracking, trackingMethods,
} from '../data/AppDataContext';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  allExercises: Exercise[];
  title?: string;
  onCancel: () => void;
  onSave: (input: ExerciseInput) => void;
};

export function ExerciseFormModal({ visible, exercise, allExercises, title, onCancel, onSave }: Props) {
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('Strength');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Chest');
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('weight_reps');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function loadForm() {
    setName(exercise?.name ?? ''); setExerciseType(exercise?.exerciseType ?? 'Strength');
    setMuscleGroup(exercise?.muscleGroup ?? 'Chest'); setTrackingMethod(exercise?.trackingMethod ?? 'weight_reps');
    setEquipment(exercise?.equipment ?? ''); setNotes(exercise?.notes ?? ''); setError('');
  }
  function chooseType(type: ExerciseType) {
    setExerciseType(type); setTrackingMethod(recommendedTracking[type]);
    if (type === 'Cardio') setMuscleGroup('Legs');
    if (['Yoga', 'Mobility', 'Stretching'].includes(type)) setMuscleGroup('Full Body');
    if (type === 'Pilates') setMuscleGroup('Core');
  }
  function submit() {
    const cleanName = name.trim();
    if (!cleanName) { setError('Exercise name is required.'); return; }
    const duplicate = allExercises.some((item) => item.id !== exercise?.id && item.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (duplicate) { setError('An exercise with this name already exists.'); return; }
    onSave({ name: cleanName, exerciseType, muscleGroup, trackingMethod, equipment: equipment.trim(), notes: notes.trim() });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={loadForm} onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.toolbarAction}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Text style={styles.formTitle}>{title ?? (exercise ? 'Edit Exercise' : 'New Exercise')}</Text>
            <Pressable accessibilityRole="button" onPress={submit} style={styles.toolbarAction}><Text style={styles.save}>Save</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <FormLabel text="EXERCISE NAME" />
            <TextInput value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="e.g. Romanian Deadlift" placeholderTextColor="#747c70" autoFocus={!exercise} style={[styles.input, !!error && styles.inputError]} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <FormLabel text="EXERCISE TYPE" />
            <View style={styles.chips}>{exerciseTypes.map((type) => <ChoiceChip key={type} label={type} selected={exerciseType === type} onPress={() => chooseType(type)} />)}</View>
            <Text style={styles.recommendation}>Type selection recommends a tracking method. You can override it below.</Text>
            <FormLabel text="PRIMARY MUSCLE GROUP" />
            <View style={styles.chips}>{muscleGroups.map((group) => <ChoiceChip key={group} label={group} selected={muscleGroup === group} onPress={() => setMuscleGroup(group)} />)}</View>
            <FormLabel text="TRACKING METHOD" />
            <View style={styles.methodList}>{trackingMethods.map((method) => <Pressable key={method.id} onPress={() => setTrackingMethod(method.id)} style={[styles.methodOption, trackingMethod === method.id && styles.activeMethod]}><View style={styles.radio}>{trackingMethod === method.id && <View style={styles.radioDot} />}</View><View style={styles.methodCopy}><Text style={styles.methodTitle}>{method.label}</Text><Text style={styles.methodDescription}>{method.description}</Text></View></Pressable>)}</View>
            <FormLabel text="EQUIPMENT" optional />
            <TextInput value={equipment} onChangeText={setEquipment} placeholder="e.g. Dumbbells, yoga mat" placeholderTextColor="#747c70" style={styles.input} />
            <FormLabel text="NOTES" optional />
            <TextInput value={notes} onChangeText={setNotes} placeholder="Setup, technique cues, or variations" placeholderTextColor="#747c70" style={[styles.input, styles.notes]} multiline textAlignVertical="top" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FormLabel({ text, optional = false }: { text: string; optional?: boolean }) { return <Text style={styles.label}>{text}{optional && <Text style={styles.optional}>  OPTIONAL</Text>}</Text>; }
function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, selected && styles.activeChip]}><Text style={[styles.chipText, selected && styles.activeChipText]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, save: { color: colors.lime, fontSize: 16, fontWeight: '800' }, formTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 22, paddingBottom: 60 }, label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 21, marginBottom: 8 }, optional: { fontWeight: '500', color: '#6f786b' }, input: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 13, fontSize: 16, paddingHorizontal: 15, paddingVertical: 14 }, notes: { minHeight: 90 }, inputError: { borderColor: '#d56c55' }, error: { color: '#e98570', fontSize: 12, marginTop: 6 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, activeChip: { backgroundColor: colors.lime, borderColor: colors.lime }, chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, activeChipText: { color: colors.darkText }, recommendation: { color: '#778072', fontSize: 11, lineHeight: 16, marginTop: 9 }, methodList: { gap: 8 }, methodOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, activeMethod: { borderColor: colors.lime }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }, methodCopy: { flex: 1 }, methodTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, methodDescription: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
