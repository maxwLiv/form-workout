import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppDataProvider } from './src/data/AppDataContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppDataProvider>
        <AppNavigator />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
