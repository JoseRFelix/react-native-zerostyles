import React, { Profiler, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { appThemes, type ExampleTheme } from '@/constants/theme';

import { BENCHMARK_ITEMS } from './shared';

type ThemeName = keyof typeof appThemes;

type Props = {
  targetTheme: ThemeName;
  phaseKey: number;
  onMounted: () => void;
  onSettled: (phaseKey: number) => void;
  onProfilerRender: React.ProfilerOnRenderCallback;
  onRowRender: () => void;
};

function CommitSignal({
  phaseKey,
  targetTheme,
  onMounted,
  onSettled,
}: Omit<Props, 'onProfilerRender' | 'onRowRender'>) {
  const hasMountedRef = useRef(false);
  const reportedPhaseRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function report() {
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
  }, [onMounted, onSettled, phaseKey, targetTheme]);

  return null;
}

function PlainStylesheetRow({
  badge,
  coverage,
  latency,
  onRowRender,
  progress,
  subtitle,
  theme,
  title,
}: {
  badge: string;
  coverage: number;
  latency: number;
  onRowRender: () => void;
  progress: number;
  subtitle: string;
  theme: ExampleTheme;
  title: string;
}) {
  onRowRender();
  const styles = useMemo(() => createRowStyles(theme), [theme]);

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

function PlainStylesheetList({
  onRowRender,
  theme,
}: Pick<Props, 'onRowRender'> & { theme: ExampleTheme }) {
  const styles = useMemo(() => createListStyles(theme), [theme]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {BENCHMARK_ITEMS.map((item) => (
        <PlainStylesheetRow key={item.id} {...item} theme={theme} onRowRender={onRowRender} />
      ))}
    </ScrollView>
  );
}

export function PlainStylesheetBenchmark(props: Props) {
  const theme = appThemes[props.targetTheme];

  return (
    <>
      <CommitSignal
        targetTheme={props.targetTheme}
        phaseKey={props.phaseKey}
        onMounted={props.onMounted}
        onSettled={props.onSettled}
      />
      <Profiler id="plain-stylesheet-benchmark" onRender={props.onProfilerRender}>
        <PlainStylesheetList theme={theme} onRowRender={props.onRowRender} />
      </Profiler>
    </>
  );
}

function createListStyles(theme: ExampleTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    content: {
      gap: 12,
      padding: 16,
    },
  });
}

function createRowStyles(theme: ExampleTheme) {
  return StyleSheet.create({
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
  });
}
