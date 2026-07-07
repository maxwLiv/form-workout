import type { ExerciseLog, WorkoutSession } from '../data/AppDataContext';
import type { UserPreferences } from '../data/AppDataContext';
import { displayDistance, displayVolume, displayWeight, formatMeasurement } from './units';

export function isToday(isoDate: string) {
  const value = new Date(isoDate);
  const today = new Date();
  return value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() && value.getDate() === today.getDate();
}

export function completedSessionToday(sessions: WorkoutSession[], planId?: string) {
  if (!planId) return undefined;
  return [...sessions]
    .filter((session) => session.planId === planId && isToday(session.completedAt))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
}

function compact(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

export function summarizeExerciseLog(log: ExerciseLog, preferences: UserPreferences = { weightUnit: 'lb', distanceUnit: 'mi' }) {
  const sets = log.sets;
  const prefix = `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`;
  if (log.trackingMethod === 'weight_reps') {
    const volume = sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
    const best = sets.reduce((winner, set) => (set.weight ?? 0) > (winner.weight ?? 0) ? set : winner, sets[0]);
    return `${prefix} - ${formatMeasurement(displayVolume(volume, preferences))} ${preferences.weightUnit} volume${best ? ` - best ${formatMeasurement(displayWeight(best.weight ?? 0, preferences))} ${preferences.weightUnit} x ${best.reps ?? 0}` : ''}`;
  }
  if (log.trackingMethod === 'reps_only' || log.trackingMethod === 'assisted_weight') return `${prefix} · ${sets.reduce((sum, set) => sum + (set.reps ?? 0), 0)} total reps`;
  if (log.trackingMethod === 'timed_sets' || log.trackingMethod === 'duration') return `${prefix} · ${compact(sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0) / 60)} min`;
  if (log.trackingMethod === 'distance_duration') return `${formatMeasurement(displayDistance(sets.reduce((sum, set) => sum + (set.distance ?? 0), 0), preferences))} ${preferences.distanceUnit} - ${compact(sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0) / 60)} min`;
  if (log.trackingMethod === 'intervals') return `${prefix} · ${compact(sets.reduce((sum, set) => sum + (set.workSeconds ?? 0), 0) / 60)} min work`;
  return `${prefix} · ${sets.reduce((sum, set) => sum + (set.count ?? 0), 0)} total count`;
}

export function completedSetCount(session: WorkoutSession) {
  return session.exerciseLogs.reduce((total, log) => total + log.sets.length, 0);
}
