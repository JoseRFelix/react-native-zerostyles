export type BenchmarkSuite = 'zerostyles' | 'plain-stylesheet' | 'unistyles' | 'nativewind';

export type BenchmarkItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  progress: number;
  latency: number;
  coverage: number;
};

export type BenchmarkAccumulator = {
  actualDurationMs: number;
  commitCount: number;
  rowRenderCount: number;
};

export type BenchmarkResult = {
  suite: BenchmarkSuite;
  mountElapsedMs: number;
  mountActualDurationMs: number;
  mountCommitCount: number;
  mountRowRenderCount: number;
  toggleElapsedMs: number;
  toggleAverageMs: number;
  toggleActualDurationMs: number;
  toggleCommitCount: number;
  toggleRowRenderCount: number;
};

export const WARMUP_TOGGLES = 4;
export const MEASURED_TOGGLES = 12;

export const BENCHMARK_SUITES: {
  id: BenchmarkSuite;
  label: string;
  description: string;
}[] = [
  {
    id: 'zerostyles',
    label: 'react-native-zerostyles',
    description: 'Selector-based theme subscriptions with StyleSheet caching.',
  },
  {
    id: 'plain-stylesheet',
    label: 'React Native StyleSheet',
    description: 'Plain theme-driven StyleSheet.create(...) builds on rerender.',
  },
  {
    id: 'unistyles',
    label: 'react-native-unistyles',
    description: 'Native runtime themes with the Unistyles Babel transform.',
  },
  {
    id: 'nativewind',
    label: 'nativewind',
    description: 'Tailwind-style className rendering through NativeWind.',
  },
];

export const BENCHMARK_ITEMS: BenchmarkItem[] = Array.from({ length: 180 }, (_, index) => ({
  id: `benchmark-row-${index + 1}`,
  title: `Benchmark row ${index + 1}`,
  subtitle:
    index % 2 === 0
      ? 'Theme-driven style recalculation'
      : 'Shared list workload for repeated toggles',
  badge: ['cold', 'warm', 'hot'][index % 3] ?? 'warm',
  progress: 28 + ((index * 17) % 63),
  latency: 10 + ((index * 7) % 31),
  coverage: 54 + ((index * 9) % 39),
}));

export function createAccumulator(): BenchmarkAccumulator {
  return {
    actualDurationMs: 0,
    commitCount: 0,
    rowRenderCount: 0,
  };
}

export function resetAccumulator(accumulator: BenchmarkAccumulator) {
  accumulator.actualDurationMs = 0;
  accumulator.commitCount = 0;
  accumulator.rowRenderCount = 0;
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatMs(value: number) {
  return `${value.toFixed(2)} ms`;
}

export function formatCount(value: number) {
  return value.toLocaleString();
}

export function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export async function afterPaint() {
  await nextFrame();
  await nextFrame();
}
