import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Exercise, ExerciseInput, ExerciseType, MuscleGroup, TrackingMethod,
  exerciseTypes, muscleGroups, recommendedTracking, trackingMethods, useAppData,
} from '../data/AppDataContext';
import { colors } from '../theme';

const groupIcons: Record<MuscleGroup, keyof typeof Ionicons.glyphMap> = {
  Chest: 'barbell-outline', Back: 'body-outline', Legs: 'footsteps-outline',
  Shoulders: 'body-outline', Arms: 'fitness-outline', Core: 'accessibility-outline',
  'Full Body': 'body-outline',
};
const typeIcons: Record<ExerciseType, keyof typeof Ionicons.glyphMap> = {
  Strength: 'barbell-outline', Bodyweight: 'body-outline', Cardio: 'walk-outline',
  Yoga: 'flower-outline', Pilates: 'accessibility-outline', Mobility: 'git-compare-outline',
  Stretching: 'body-outline', Custom: 'options-outline',
};

export function ExercisesScreen() {
  const { exercises, addExercise, updateExercise, deleteExercise } = useAppData();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExerciseType | 'All'>('All');

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = exercises.filter((exercise) =>
      (typeFilter === 'All' || exercise.exerciseType === typeFilter) &&
      (!query || exercise.name.toLowerCase().includes(query)),
    );
    const groups = typeFilter === 'All'
      ? exerciseTypes.map((type) => ({
          title: type,
          icon: typeIcons[type],
          data: filtered.filter((exercise) => exercise.exerciseType === type).sort((a, b) => a.name.localeCompare(b.name)),
        }))
      : muscleGroups.map((group) => ({
          title: group,
          icon: groupIcons[group],
          data: filtered.filter((exercise) => exercise.muscleGroup === group).sort((a, b) => a.name.localeCompare(b.name)),
        }));
    return groups.filter((section) => section.data.length);
  }, [exercises, search, typeFilter]);

  const visibleCount = sections.reduce((total, section) => total + section.data.length, 0);

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(exercise: Exercise) { setEditing(exercise); setFormOpen(true); }
  function confirmDelete(exercise: Exercise) {
    Alert.alert('Delete exercise?', `${exercise.name} will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const deleted = deleteExercise(exercise.id);
        if (!deleted) Alert.alert('Exercise is in use', 'Remove this exercise from every workout plan before deleting it.');
      } },
    ]);
  }
  function save(input: ExerciseInput) {
    editing ? updateExercise(editing.id, input) : addExercise(input);
    setFormOpen(false);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>MOVEMENT LIBRARY</Text><Text style={styles.title}>Exercises</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={openAdd} style={styles.addButton}><Ionicons name="add" size={24} color={colors.darkText} /></Pressable>
      </View>
      <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search exercises" placeholderTextColor={colors.muted} style={styles.searchInput} clearButtonMode="while-editing" /></View>
      <ScrollView horizontal style={styles.filterScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(['All', ...exerciseTypes] as const).map((type) => <Pressable key={type} accessibilityRole="tab" accessibilityState={{ selected: typeFilter === type }} onPress={() => setTypeFilter(type)} style={[styles.filterChip, typeFilter === type ? styles.activeFilter : styles.inactiveFilter]}><Text style={[styles.filterText, typeFilter === type && styles.activeFilterText]}>{type}</Text></Pressable>)}
      </ScrollView>
      <Text style={styles.count}>
        {typeFilter === 'All'
          ? `${visibleCount} ${visibleCount === 1 ? 'exercise' : 'exercises'} · grouped by type`
          : `${visibleCount} ${typeFilter} ${visibleCount === 1 ? 'exercise' : 'exercises'} · grouped by muscle`}
      </Text>
      <SectionList
        style={styles.exerciseList}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !sections.length && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Ionicons name={section.icon} size={18} color={colors.lime} /><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.sectionCount}>{section.data.length}</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.exerciseIcon}><Ionicons name={typeIcons[item.exerciseType]} size={21} color={colors.green} /></View>
            <Pressable style={styles.cardBody} onPress={() => openEdit(item)}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMeta}>{item.exerciseType} · {item.equipment || 'No equipment'}</Text>
              <View style={styles.methodBadge}><Text style={styles.methodBadgeText}>{trackingMethods.find((method) => method.id === item.trackingMethod)?.label}</Text></View>
            </Pressable>
            <Pressable accessibilityLabel={`Edit ${item.name}`} onPress={() => openEdit(item)} style={styles.iconButton}><Ionicons name="pencil-outline" size={19} color={colors.darkMuted} /></Pressable>
            <Pressable accessibilityLabel={`Delete ${item.name}`} onPress={() => confirmDelete(item)} style={styles.iconButton}><Ionicons name="trash-outline" size={19} color="#a94f3d" /></Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="search-outline" size={42} color={colors.green} /><Text style={styles.emptyTitle}>No matches</Text><Text style={styles.emptyText}>Try another search or exercise-type filter.</Text></View>}
      />
      <ExerciseForm visible={formOpen} exercise={editing} allExercises={exercises} onCancel={() => setFormOpen(false)} onSave={save} />
    </SafeAreaView>
  );
}

type FormProps = { visible: boolean; exercise: Exercise | null; allExercises: Exercise[]; onCancel: () => void; onSave: (input: ExerciseInput) => void };
function ExerciseForm({ visible, exercise, allExercises, onCancel, onSave }: FormProps) {
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
      <SafeAreaView style={formStyles.safeArea}>
        <KeyboardAvoidingView style={formStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={formStyles.toolbar}><Pressable accessibilityRole="button" onPress={onCancel} style={formStyles.toolbarAction}><Text style={formStyles.cancel}>Cancel</Text></Pressable><Text style={formStyles.formTitle}>{exercise ? 'Edit Exercise' : 'New Exercise'}</Text><Pressable accessibilityRole="button" onPress={submit} style={formStyles.toolbarAction}><Text style={formStyles.save}>Save</Text></Pressable></View>
          <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
            <FormLabel text="EXERCISE NAME" />
            <TextInput value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="e.g. Romanian Deadlift" placeholderTextColor="#747c70" autoFocus={!exercise} style={[formStyles.input, !!error && formStyles.inputError]} />
            {!!error && <Text style={formStyles.error}>{error}</Text>}
            <FormLabel text="EXERCISE TYPE" />
            <View style={formStyles.chips}>{exerciseTypes.map((type) => <ChoiceChip key={type} label={type} selected={exerciseType === type} onPress={() => chooseType(type)} />)}</View>
            <Text style={formStyles.recommendation}>Type selection recommends a tracking method. You can override it below.</Text>
            <FormLabel text="PRIMARY MUSCLE GROUP" />
            <View style={formStyles.chips}>{muscleGroups.map((group) => <ChoiceChip key={group} label={group} selected={muscleGroup === group} onPress={() => setMuscleGroup(group)} />)}</View>
            <FormLabel text="TRACKING METHOD" />
            <View style={formStyles.methodList}>{trackingMethods.map((method) => <Pressable key={method.id} onPress={() => setTrackingMethod(method.id)} style={[formStyles.methodOption, trackingMethod === method.id && formStyles.activeMethod]}><View style={formStyles.radio}>{trackingMethod === method.id && <View style={formStyles.radioDot} />}</View><View style={formStyles.methodCopy}><Text style={formStyles.methodTitle}>{method.label}</Text><Text style={formStyles.methodDescription}>{method.description}</Text></View></Pressable>)}</View>
            <FormLabel text="EQUIPMENT" optional />
            <TextInput value={equipment} onChangeText={setEquipment} placeholder="e.g. Dumbbells, yoga mat" placeholderTextColor="#747c70" style={formStyles.input} />
            <FormLabel text="NOTES" optional />
            <TextInput value={notes} onChangeText={setNotes} placeholder="Setup, technique cues, or variations" placeholderTextColor="#747c70" style={[formStyles.input, formStyles.notes]} multiline textAlignVertical="top" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FormLabel({ text, optional = false }: { text: string; optional?: boolean }) { return <Text style={formStyles.label}>{text}{optional && <Text style={formStyles.optional}>  OPTIONAL</Text>}</Text>; }
function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[formStyles.chip, selected && formStyles.activeChip]}><Text style={[formStyles.chipText, selected && formStyles.activeChipText]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 22, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 5 }, addButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  searchBox: { marginHorizontal: 22, marginTop: 15, height: 44, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, searchInput: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 9 }, filterScroll: { flexGrow: 0, height: 44, marginTop: 12 }, filters: { paddingHorizontal: 22, gap: 8 }, filterChip: { width: 96, height: 44, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, inactiveFilter: { backgroundColor: colors.surface, borderColor: colors.border }, activeFilter: { backgroundColor: colors.lime, borderColor: colors.lime }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 15 }, activeFilterText: { color: colors.darkText }, count: { color: colors.muted, marginHorizontal: 22, marginTop: 10, marginBottom: 3, fontSize: 12 },
  exerciseList: { flex: 1 },
  list: { paddingHorizontal: 22, paddingBottom: 30 }, emptyList: { flexGrow: 1, justifyContent: 'center' }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 17, paddingBottom: 9 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, sectionCount: { color: colors.muted, fontSize: 12, marginLeft: 'auto' }, card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 15, padding: 12, gap: 8 }, itemGap: { height: 9 }, exerciseIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e4ecd9', alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, paddingVertical: 2 }, exerciseName: { color: colors.darkText, fontSize: 15, fontWeight: '800' }, exerciseMeta: { color: colors.darkMuted, fontSize: 11, marginTop: 3 }, methodBadge: { alignSelf: 'flex-start', backgroundColor: '#e9eee3', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, marginTop: 5 }, methodBadgeText: { color: '#4d5d46', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, empty: { alignItems: 'center', padding: 30 }, emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 16 }, emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 7 },
});

const formStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, toolbar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, toolbarAction: { width: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancel: { color: colors.muted, fontSize: 16 }, save: { color: colors.lime, fontSize: 16, fontWeight: '800' }, formTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, content: { padding: 22, paddingBottom: 60 }, label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 21, marginBottom: 8 }, optional: { fontWeight: '500', color: '#6f786b' }, input: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 13, fontSize: 16, paddingHorizontal: 15, paddingVertical: 14 }, notes: { minHeight: 90 }, inputError: { borderColor: '#d56c55' }, error: { color: '#e98570', fontSize: 12, marginTop: 6 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, activeChip: { backgroundColor: colors.lime, borderColor: colors.lime }, chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, activeChipText: { color: colors.darkText }, recommendation: { color: '#778072', fontSize: 11, lineHeight: 16, marginTop: 9 }, methodList: { gap: 8 }, methodOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, activeMethod: { borderColor: colors.lime }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }, methodCopy: { flex: 1 }, methodTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, methodDescription: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
