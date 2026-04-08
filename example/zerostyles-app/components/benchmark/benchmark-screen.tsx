import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { createThemedStyles } from 'react-native-zerostyles';

import { appThemes } from '@/constants/theme';

import { NativewindBenchmark } from './nativewind-benchmark';
import { PlainStylesheetBenchmark } from './plain-stylesheet-benchmark';
import {
  BENCHMARK_SUITES,
  MEASURED_TOGGLES,
  WARMUP_TOGGLES,
  average,
  createAccumulator,
  formatCount,
  formatMs,
  type BenchmarkResult,
  type BenchmarkSuite,
} from './shared';
import { UnistylesBenchmark } from './unistyles-benchmark';
import { ZerostylesBenchmark } from './zerostyles-benchmark';

type ThemeName = keyof typeof appThemes;

type BenchmarkRendererProps = {
  targetTheme: ThemeName;
  phaseKey: number;
  onMounted: () => void;
  onSettled: (phaseKey: number) => void;
  onProfilerRender: React.ProfilerOnRenderCallback;
  onRowRender: () => void;
};

type Deferred = {
  resolve: () => void;
};

type SettledDeferred = Deferred & {
  phaseKey: number;
};

const renderers: Record<BenchmarkSuite, (props: BenchmarkRendererProps) => React.JSX.Element> = {
  zerostyles: ZerostylesBenchmark,
  'plain-stylesheet': PlainStylesheetBenchmark,
  unistyles: UnistylesBenchmark,
  nativewind: NativewindBenchmark,
};

function usesRuntimeOnlyUpdates(result: BenchmarkResult) {
  return result.toggleCommitCount === 0 && result.toggleRowRenderCount === 0;
}

export function BenchmarkScreen() {
  const styles = useBenchmarkScreenStyles();
  const [activeSuite, setActiveSuite] = useState<BenchmarkSuite>('zerostyles');
  const [selectedSuite, setSelectedSuite] = useState<BenchmarkSuite | null>(null);
  const [rendererKey, setRendererKey] = useState(0);
  const [targetTheme, setTargetTheme] = useState<ThemeName>('light');
  const [phaseKey, setPhaseKey] = useState(0);
  const [results, setResults] = useState<Partial<Record<BenchmarkSuite, BenchmarkResult>>>({});
  const [status, setStatus] = useState('Ready to run');
  const [isRunning, setIsRunning] = useState(false);

  const metricsRef = useRef(createAccumulator());
  const mountDeferredRef = useRef<Deferred | null>(null);
  const settledDeferredRef = useRef<SettledDeferred | null>(null);
  const phaseRef = useRef(0);
  const currentThemeRef = useRef<ThemeName>('light');

  const onProfilerRender = useCallback<React.ProfilerOnRenderCallback>(
    (_id, _phase, actualDuration) => {
      metricsRef.current.actualDurationMs += actualDuration;
      metricsRef.current.commitCount += 1;
    },
    [],
  );

  const onRowRender = useCallback(() => {
    metricsRef.current.rowRenderCount += 1;
  }, []);

  const onMounted = useCallback(() => {
    mountDeferredRef.current?.resolve();
    mountDeferredRef.current = null;
  }, []);

  const onSettled = useCallback((nextPhaseKey: number) => {
    const deferred = settledDeferredRef.current;

    if (!deferred || deferred.phaseKey !== nextPhaseKey) {
      return;
    }

    deferred.resolve();
    settledDeferredRef.current = null;
  }, []);

  const activateSuite = useCallback(async (suite: BenchmarkSuite) => {
    metricsRef.current.actualDurationMs = 0;
    metricsRef.current.commitCount = 0;
    metricsRef.current.rowRenderCount = 0;
    currentThemeRef.current = 'light';
    phaseRef.current = 0;

    const mounted = new Promise<void>((resolve) => {
      mountDeferredRef.current = { resolve };
    });

    setActiveSuite(suite);
    setTargetTheme('light');
    setPhaseKey(0);
    setRendererKey((current) => current + 1);

    await mounted;
  }, []);

  const toggleThemeAndWait = useCallback(async (nextTheme: ThemeName) => {
    const nextPhaseKey = phaseRef.current + 1;
    phaseRef.current = nextPhaseKey;

    const settled = new Promise<void>((resolve) => {
      settledDeferredRef.current = {
        phaseKey: nextPhaseKey,
        resolve,
      };
    });

    currentThemeRef.current = nextTheme;
    setTargetTheme(nextTheme);
    setPhaseKey(nextPhaseKey);

    await settled;
  }, []);

  const runSuite = useCallback(
    async (suite: BenchmarkSuite) => {
      const suiteLabel =
        BENCHMARK_SUITES.find((candidate) => candidate.id === suite)?.label ?? suite;

      setStatus(`Mounting ${suiteLabel}`);
      const mountStart = performance.now();
      await activateSuite(suite);
      const mountElapsedMs = performance.now() - mountStart;
      const mountSnapshot = { ...metricsRef.current };

      metricsRef.current.actualDurationMs = 0;
      metricsRef.current.commitCount = 0;
      metricsRef.current.rowRenderCount = 0;

      setStatus(`Warming up ${suiteLabel}`);
      let theme: ThemeName = 'light';

      for (let index = 0; index < WARMUP_TOGGLES; index += 1) {
        theme = theme === 'light' ? 'dark' : 'light';
        await toggleThemeAndWait(theme);
      }

      if (theme !== 'light') {
        await toggleThemeAndWait('light');
        theme = 'light';
      }

      metricsRef.current.actualDurationMs = 0;
      metricsRef.current.commitCount = 0;
      metricsRef.current.rowRenderCount = 0;

      setStatus(`Measuring ${suiteLabel}`);
      const toggleDurations: number[] = [];
      const toggleStart = performance.now();

      for (let index = 0; index < MEASURED_TOGGLES; index += 1) {
        theme = theme === 'light' ? 'dark' : 'light';
        const iterationStart = performance.now();
        await toggleThemeAndWait(theme);
        toggleDurations.push(performance.now() - iterationStart);
      }

      const toggleElapsedMs = performance.now() - toggleStart;
      const toggleSnapshot = { ...metricsRef.current };

      const nextResult: BenchmarkResult = {
        suite,
        mountElapsedMs,
        mountActualDurationMs: mountSnapshot.actualDurationMs,
        mountCommitCount: mountSnapshot.commitCount,
        mountRowRenderCount: mountSnapshot.rowRenderCount,
        toggleElapsedMs,
        toggleAverageMs: average(toggleDurations),
        toggleActualDurationMs: toggleSnapshot.actualDurationMs,
        toggleCommitCount: toggleSnapshot.commitCount,
        toggleRowRenderCount: toggleSnapshot.rowRenderCount,
      };

      setResults((current) => ({
        ...current,
        [suite]: nextResult,
      }));
    },
    [activateSuite, toggleThemeAndWait],
  );

  const runBenchmarks = useCallback(
    async (suite?: BenchmarkSuite) => {
      if (isRunning) {
        return;
      }

      setIsRunning(true);
      setResults((current) => (suite ? current : {}));

      try {
        if (suite) {
          await runSuite(suite);
        } else {
          for (const candidate of BENCHMARK_SUITES) {
            await runSuite(candidate.id);
          }
        }

        setStatus('Benchmark complete');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Benchmark failed';
        setStatus(message);
      } finally {
        mountDeferredRef.current = null;
        settledDeferredRef.current = null;
        setIsRunning(false);
      }
    },
    [isRunning, runSuite],
  );

  const orderedResults = useMemo(
    () =>
      BENCHMARK_SUITES.map((suite) => results[suite.id]).filter(
        (result): result is BenchmarkResult => result !== undefined,
      ),
    [results],
  );

  const ActiveRenderer = renderers[activeSuite];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Benchmark</Text>
        <Text style={styles.title}>Theme toggle workload across four styling approaches</Text>
        <Text style={styles.description}>
          This screen mounts the same 180-row workload and measures initial render plus repeated
          light/dark theme toggles for plain React Native StyleSheet builds,
          react-native-zerostyles, react-native-unistyles, and nativewind.
        </Text>
        <TouchableOpacity
          disabled={isRunning}
          onPress={() => void runBenchmarks()}
          activeOpacity={0.8}
          style={[styles.primaryButton, isRunning && styles.disabledButton]}
        >
          {isRunning ? (
            <ActivityIndicator color="#11181C" />
          ) : (
            <Text style={styles.primaryButtonText}>Run all benchmarks</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          For meaningful numbers, run this in a release build on device. Development mode and remote
          debugging distort timings.
        </Text>
      </View>

      <View style={styles.suiteGrid}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suiteRow}
        >
          {BENCHMARK_SUITES.map((suite) => {
            const result = results[suite.id];
            const isActive = suite.id === activeSuite;
            const isSelected = suite.id === selectedSuite;

            return (
              <TouchableOpacity
                key={suite.id}
                disabled={isRunning}
                onPress={() => setSelectedSuite(suite.id)}
                activeOpacity={0.8}
                style={[
                  styles.suiteCard,
                  isActive && styles.activeSuiteCard,
                  isSelected && styles.selectedSuiteCard,
                  isRunning && styles.disabledButton,
                ]}
              >
                <Text style={styles.suiteTitle}>{suite.label}</Text>
                <Text style={styles.suiteDescription}>{suite.description}</Text>
                {result ? (
                  <View style={styles.metricList}>
                    <Text style={styles.metricLine}>Mount: {formatMs(result.mountElapsedMs)}</Text>
                    <Text style={styles.metricLine}>
                      Avg toggle: {formatMs(result.toggleAverageMs)}
                    </Text>
                    <Text style={styles.metricLine}>
                      React work: {formatMs(result.toggleActualDurationMs)}
                    </Text>
                    <Text style={styles.metricLine}>
                      Row renders: {formatCount(result.toggleRowRenderCount)}
                    </Text>
                    {usesRuntimeOnlyUpdates(result) ? (
                      <Text style={styles.runtimeNote}>
                        Runtime-applied updates without React rerenders.
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.pendingText}>No run recorded yet.</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          disabled={selectedSuite === null || isRunning}
          onPress={() => {
            if (selectedSuite) {
              void runBenchmarks(selectedSuite);
            }
          }}
          activeOpacity={0.8}
          style={[
            styles.secondaryButton,
            (selectedSuite === null || isRunning) && styles.disabledButton,
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            {selectedSuite
              ? `Run ${
                  BENCHMARK_SUITES.find((suite) => suite.id === selectedSuite)?.label ??
                  selectedSuite
                }`
              : 'Select a suite to run'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.previewLabel}>Active preview</Text>
            <Text style={styles.previewTitle}>
              {BENCHMARK_SUITES.find((suite) => suite.id === activeSuite)?.label}
            </Text>
          </View>
          <Text style={styles.previewStatus}>{status}</Text>
        </View>
        <View style={styles.previewFrame}>
          <ActiveRenderer
            key={`${activeSuite}-${rendererKey}`}
            targetTheme={targetTheme}
            phaseKey={phaseKey}
            onMounted={onMounted}
            onSettled={onSettled}
            onProfilerRender={onProfilerRender}
            onRowRender={onRowRender}
          />
        </View>
      </View>

      {orderedResults.length > 0 ? (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Latest results</Text>
          {orderedResults.map((result) => {
            const label =
              BENCHMARK_SUITES.find((suite) => suite.id === result.suite)?.label ?? result.suite;

            return (
              <View key={result.suite} style={styles.resultsRow}>
                <Text style={styles.resultsSuite}>{label}</Text>
                <Text style={styles.resultsLine}>
                  Mount elapsed {formatMs(result.mountElapsedMs)}
                </Text>
                <Text style={styles.resultsLine}>
                  Mount React work {formatMs(result.mountActualDurationMs)}
                </Text>
                <Text style={styles.resultsLine}>
                  Toggle total {formatMs(result.toggleElapsedMs)} across {MEASURED_TOGGLES} toggles
                </Text>
                <Text style={styles.resultsLine}>
                  Toggle React work {formatMs(result.toggleActualDurationMs)} in{' '}
                  {formatCount(result.toggleCommitCount)} commits
                </Text>
                <Text style={styles.resultsLine}>
                  Row renders {formatCount(result.toggleRowRenderCount)}
                </Text>
                {usesRuntimeOnlyUpdates(result) ? (
                  <Text style={styles.runtimeNote}>
                    No React rerenders were detected for the measured toggles, which is expected
                    when the styling runtime updates views without React work.
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const useBenchmarkScreenStyles = createThemedStyles((theme) => ({
  screen: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
  },
  hero: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  eyebrow: {
    color: theme.colors.tint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.tint,
    borderRadius: 16,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  suiteGrid: {
    gap: 12,
  },
  suiteRow: {
    gap: 12,
    paddingRight: 16,
  },
  suiteCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    width: 280,
    minHeight: 212,
    padding: 16,
  },
  activeSuiteCard: {
    borderColor: theme.colors.tint,
  },
  selectedSuiteCard: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  suiteTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  suiteDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  metricList: {
    gap: 4,
  },
  metricLine: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  pendingText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  runtimeNote: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  previewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  previewStatus: {
    color: theme.colors.tint,
    fontSize: 13,
    fontWeight: '700',
  },
  previewFrame: {
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 360,
    overflow: 'hidden',
  },
  resultsCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  resultsTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  resultsRow: {
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  resultsSuite: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  resultsLine: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
}));
