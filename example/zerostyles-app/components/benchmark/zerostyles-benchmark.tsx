import React, { Profiler, useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ThemeProvider, createThemedStyles, useThemeSelector } from 'react-native-zerostyles';

import { appThemes } from '@/constants/theme';

import { BENCHMARK_ITEMS } from './shared';

type Props = {
  targetTheme: keyof typeof appThemes;
  phaseKey: number;
  onMounted: () => void;
  onSettled: (phaseKey: number) => void;
  onProfilerRender: React.ProfilerOnRenderCallback;
  onRowRender: () => void;
};

function ThemeSync({ targetTheme }: { targetTheme: keyof typeof appThemes }) {
  const currentThemeName = useThemeSelector((context) => context.themeName);
  const setThemeName = useThemeSelector((context) => context.setThemeName);

  useEffect(() => {
    if (currentThemeName === targetTheme) {
      return;
    }

    setThemeName(targetTheme);
  }, [currentThemeName, setThemeName, targetTheme]);

  return null;
}

function CommitSignal({
  targetTheme,
  phaseKey,
  onMounted,
  onSettled,
}: Omit<Props, 'onProfilerRender' | 'onRowRender'>) {
  const currentThemeName = useThemeSelector((context) => context.themeName);
  const hasMountedRef = useRef(false);
  const reportedPhaseRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function report() {
      if (currentThemeName !== targetTheme) {
        return;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (cancelled) {
        return;
      }

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        onMounted();
        return;
      }

      if (reportedPhaseRef.current === phaseKey) {
        return;
      }

      reportedPhaseRef.current = phaseKey;
      onSettled(phaseKey);
    }

    void report();

    return () => {
      cancelled = true;
    };
  }, [currentThemeName, onMounted, onSettled, phaseKey, targetTheme]);

  return null;
}

function ZeroStylesRow({
  title,
  subtitle,
  badge,
  progress,
  latency,
  coverage,
  onRowRender,
}: {
  title: string;
  subtitle: string;
  badge: string;
  progress: number;
  latency: number;
  coverage: number;
  onRowRender: () => void;
}) {
  onRowRender();
  const styles = useZeroStylesRowStyles();

  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge.toUpperCase()}</Text>
        </View>
        <Text style={styles.metaText}>{latency} ms</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Coverage {coverage}%</Text>
        <Text style={styles.footerText}>Phase {progress}%</Text>
      </View>
    </View>
  );
}

function ZeroStylesList({ onRowRender }: Pick<Props, 'onRowRender'>) {
  const styles = useZeroStylesListStyles();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {BENCHMARK_ITEMS.map((item) => (
        <ZeroStylesRow key={item.id} {...item} onRowRender={onRowRender} />
      ))}
    </ScrollView>
  );
}

export function ZerostylesBenchmark(props: Props) {
  return (
    <ThemeProvider themes={appThemes} initialTheme="light">
      <ThemeSync targetTheme={props.targetTheme} />
      <CommitSignal
        targetTheme={props.targetTheme}
        phaseKey={props.phaseKey}
        onMounted={props.onMounted}
        onSettled={props.onSettled}
      />
      <Profiler id="zerostyles-benchmark" onRender={props.onProfilerRender}>
        <ZeroStylesList onRowRender={props.onRowRender} />
      </Profiler>
    </ThemeProvider>
  );
}

const useZeroStylesListStyles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    gap: 12,
    padding: 16,
  },
}));

const useZeroStylesRowStyles = createThemedStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: theme.colors.tintMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: theme.colors.tint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    backgroundColor: theme.colors.border,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: theme.colors.tint,
    borderRadius: 999,
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
}));
