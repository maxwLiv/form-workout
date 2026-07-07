import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentType, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { PlansScreen } from '../screens/PlansScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { colors } from '../theme';

type TabName = 'Today' | 'Exercises' | 'Plans' | 'Schedule' | 'Progress';
type TabDefinition = {
  name: TabName;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  component: ComponentType;
};

const tabs: TabDefinition[] = [
  { name: 'Today', icon: 'barbell-outline', activeIcon: 'barbell', component: TodayScreen },
  { name: 'Exercises', icon: 'fitness-outline', activeIcon: 'fitness', component: ExercisesScreen },
  { name: 'Plans', icon: 'list-outline', activeIcon: 'list', component: PlansScreen },
  { name: 'Schedule', icon: 'calendar-outline', activeIcon: 'calendar', component: ScheduleScreen },
  { name: 'Progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart', component: ProgressScreen },
];

export function AppNavigator() {
  const [activeTab, setActiveTab] = useState<TabName>('Today');
  const insets = useSafeAreaInsets();
  const ActiveScreen = tabs.find((tab) => tab.name === activeTab)!.component;

  return (
    <View style={styles.app}>
      <View style={styles.screen}><ActiveScreen /></View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((tab) => {
          const active = tab.name === activeTab;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.name} tab`}
              onPress={() => setActiveTab(tab.name)}
              style={styles.tab}
            >
              <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? colors.lime : colors.muted} />
              <Text style={[styles.label, active && styles.activeLabel]}>{tab.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: { flex: 1, minHeight: 51, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeLabel: { color: colors.lime },
});
