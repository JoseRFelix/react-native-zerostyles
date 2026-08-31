import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  createThemedStyles,
  ThemeProvider,
  useThemeSelector,
} from 'react-native-zerostyles';

import { appThemes } from '@/constants/theme';

const CONSUMER_COUNT = 1_000;
const MOUNT_SAMPLES = 12;
const UPDATE_SAMPLES = 30;

type Variant = 'cached' | 'per-instance';
type Summary = { min: number; median: number; p75: number };
type VariantResult = { mount: Summary; update: Summary };
type Results = Record<Variant, VariantResult>;
type PendingCommit = {
  startedAt: number;
  resolve: (duration: number) => void;
};

const useBenchmarkStyles = createThemedStyles(
  (theme) => theme.colors.background,
  (backgroundColor) => ({
    container: { backgroundColor, padding: 8 },
    label: { color: backgroundColor },
  }),
);

const CachedConsumer = memo(function CachedConsumer() {
  useBenchmarkStyles();
  return null;
});

const PerInstanceConsumer = memo(function PerInstanceConsumer() {
  const backgroundColor = useThemeSelector(
    (context) => context.theme.colors.background,
  );

  useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor, padding: 8 },
        label: { color: backgroundColor },
      }),
    [backgroundColor],
  );

  return null;
});

const cachedConsumers = Array.from({ length: CONSUMER_COUNT }, (_, index) => (
  <CachedConsumer key={index} />
));
const perInstanceConsumers = Array.from(
  { length: CONSUMER_COUNT },
  (_, index) => <PerInstanceConsumer key={index} />,
);

function CommitProbe({ onCommit }: { onCommit: () => void }) {
  const themeName = useThemeSelector((context) => context.themeName);

  useLayoutEffect(onCommit, [onCommit, themeName]);
  return null;
}

function ToggleSource({ onReady }: { onReady: (toggle: () => void) => void }) {
  const toggle = useThemeSelector((context) => context.toggleTheme);

  useLayoutEffect(() => {
    onReady(toggle);
  }, [onReady, toggle]);

  return null;
}

function BenchmarkFixture({
  variant,
  onCommit,
  onToggleReady,
}: {
  variant: Variant;
  onCommit: () => void;
  onToggleReady: (toggle: () => void) => void;
}) {
  return (
    <ThemeProvider themes={appThemes} initialTheme="light">
      {variant === 'cached' ? cachedConsumers : perInstanceConsumers}
      <ToggleSource onReady={onToggleReady} />
      <CommitProbe onCommit={onCommit} />
    </ThemeProvider>
  );
}

function now() {
  return globalThis.performance?.now() ?? Date.now();
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index]!;
}

function summarize(values: number[]): Summary {
  return {
    min: Math.min(...values),
    median: percentile(values, 0.5),
    p75: percentile(values, 0.75),
  };
}

function formatSummary(summary: Summary) {
  return `${summary.median.toFixed(2)} ms median (${summary.min.toFixed(2)} min, ${summary.p75.toFixed(2)} p75)`;
}

export default function BenchmarkScreen() {
  const [fixture, setFixture] = useState<{
    key: number;
    variant: Variant;
  } | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const toggleRef = useRef<(() => void) | null>(null);
  const pendingCommitRef = useRef<PendingCommit | null>(null);

  const onCommit = useCallback(() => {
    const pending = pendingCommitRef.current;

    if (!pending) {
      return;
    }

    pendingCommitRef.current = null;
    pending.resolve(now() - pending.startedAt);
  }, []);

  const onToggleReady = useCallback((toggle: () => void) => {
    toggleRef.current = toggle;
  }, []);

  const measureCommit = useCallback(async (action: () => void) => {
    await nextFrame();

    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingCommitRef.current = null;
        reject(new Error('Timed out waiting for a benchmark commit'));
      }, 10_000);

      pendingCommitRef.current = {
        startedAt: now(),
        resolve: (duration) => {
          clearTimeout(timeout);
          resolve(duration);
        },
      };
      action();
    });
  }, []);

  const measureMount = useCallback(
    async (variant: Variant) => {
      setFixture(null);
      toggleRef.current = null;
      await nextFrame();

      generationRef.current += 1;
      return measureCommit(() => {
        setFixture({ key: generationRef.current, variant });
      });
    },
    [measureCommit],
  );

  const measureUpdate = useCallback(async () => {
    const toggle = toggleRef.current;

    if (!toggle) {
      throw new Error('Theme toggle was not ready');
    }

    return measureCommit(toggle);
  }, [measureCommit]);

  const runVariant = useCallback(
    async (variant: Variant): Promise<VariantResult> => {
      await measureMount(variant);

      const mountSamples: number[] = [];
      for (let index = 0; index < MOUNT_SAMPLES; index += 1) {
        mountSamples.push(await measureMount(variant));
      }

      await measureUpdate();
      await measureUpdate();

      const updateSamples: number[] = [];
      for (let index = 0; index < UPDATE_SAMPLES; index += 1) {
        updateSamples.push(await measureUpdate());
      }

      return {
        mount: summarize(mountSamples),
        update: summarize(updateSamples),
      };
    },
    [measureMount, measureUpdate],
  );

  const run = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setError(null);

    try {
      const cached = await runVariant('cached');
      const perInstance = await runVariant('per-instance');
      setResults({ cached, 'per-instance': perInstance });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      pendingCommitRef.current = null;
      setFixture(null);
      setRunning(false);
    }
  }, [runVariant]);

  return (
    <View style={screenStyles.screen}>
      {fixture ? (
        <BenchmarkFixture
          key={fixture.key}
          variant={fixture.variant}
          onCommit={onCommit}
          onToggleReady={onToggleReady}
        />
      ) : null}
      <ScrollView contentContainerStyle={screenStyles.content}>
        <Text style={screenStyles.title}>Release Hermes benchmark</Text>
        <Text style={screenStyles.body}>
          Measures committed wall-clock time for 1,000 consumers. Build the app
          in Release mode; development results include React diagnostics and are
          not comparable.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={running}
          onPress={run}
          style={({ pressed }) => [
            screenStyles.button,
            pressed && screenStyles.buttonPressed,
            running && screenStyles.buttonDisabled,
          ]}
        >
          <Text style={screenStyles.buttonText}>
            {running ? 'Running…' : 'Run benchmark'}
          </Text>
        </Pressable>
        {error ? <Text style={screenStyles.error}>{error}</Text> : null}
        {results ? (
          <View style={screenStyles.results}>
            <Text style={screenStyles.resultTitle}>Shared cached hook</Text>
            <Text style={screenStyles.resultText}>
              Mount: {formatSummary(results.cached.mount)}
            </Text>
            <Text style={screenStyles.resultText}>
              Update: {formatSummary(results.cached.update)}
            </Text>
            <Text style={screenStyles.resultTitle}>Per-instance styles</Text>
            <Text style={screenStyles.resultText}>
              Mount: {formatSummary(results['per-instance'].mount)}
            </Text>
            <Text style={screenStyles.resultText}>
              Update: {formatSummary(results['per-instance'].update)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { gap: 16, padding: 24 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '700' },
  body: { color: '#475569', fontSize: 16, lineHeight: 24 },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  error: { color: '#b91c1c', fontSize: 15 },
  results: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    gap: 8,
    padding: 18,
  },
  resultTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  resultText: { color: '#334155', fontSize: 15 },
});
