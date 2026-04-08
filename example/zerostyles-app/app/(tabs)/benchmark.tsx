import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeSelector } from 'react-native-zerostyles';

import { BenchmarkScreen } from '@/components/benchmark/benchmark-screen';

export default function BenchmarkRoute() {
  const backgroundColor = useThemeSelector((context) => context.theme.colors.background);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top']}>
      <BenchmarkScreen />
    </SafeAreaView>
  );
}
