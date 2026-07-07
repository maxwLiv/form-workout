import type { UserPreferences } from '../data/AppDataContext';

const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;

export function displayWeight(pounds: number, preferences: UserPreferences) {
  return preferences.weightUnit === 'kg' ? pounds * KG_PER_LB : pounds;
}
export function storeWeight(value: number, preferences: UserPreferences) {
  return preferences.weightUnit === 'kg' ? value / KG_PER_LB : value;
}
export function displayDistance(miles: number, preferences: UserPreferences) {
  return preferences.distanceUnit === 'km' ? miles * KM_PER_MI : miles;
}
export function storeDistance(value: number, preferences: UserPreferences) {
  return preferences.distanceUnit === 'km' ? value / KM_PER_MI : value;
}
export function displayVolume(poundVolume: number, preferences: UserPreferences) {
  return preferences.weightUnit === 'kg' ? poundVolume * KG_PER_LB : poundVolume;
}
export function formatMeasurement(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
