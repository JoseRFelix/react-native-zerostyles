import React, { Profiler, useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet, UnistylesRuntime, type UnistylesThemes } from 'react-native-unistyles';

import { BENCHMARK_ITEMS } from './shared';

type ThemeName = Extract<keyof UnistylesThemes, string>;

type Props = {
  targetTheme: ThemeName;
  phaseKey: number;
  onMounted: () => void;
  onSettled: (phaseKey: number) => void;
  onProfilerRender: React.ProfilerOnRenderCallback;
  onRowRender: () => void;
};

function CommitSignal({
  targetTheme,
  phaseKey,
  onMounted,
  onSettled,
}: Omit<Props, 'onProfilerRender' | 'onRowRender'>) {
  const hasMountedRef = useRef(false);
  const reportedPhaseRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    UnistylesRuntime.setTheme(targetTheme);

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

function UnistylesRow({
  badge,
  coverage,
  latency,
  onRowRender,
  progress,
  subtitle,
  title,
}: {
  badge: string;
  coverage: number;
  latency: number;
  onRowRender: () => void;
  progress: number;
  subtitle: string;
  title: string;
}) {
  onRowRender();

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

function UnistylesList({ onRowRender }: Pick<Props, 'onRowRender'>) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {BENCHMARK_ITEMS.map((item) => (
        <UnistylesRow key={item.id} {...item} onRowRender={onRowRender} />
      ))}
    </ScrollView>
  );
}

export function UnistylesBenchmark(props: Props) {
  return (
    <>
      <CommitSignal
        targetTheme={props.targetTheme}
        phaseKey={props.phaseKey}
        onMounted={props.onMounted}
        onSettled={props.onSettled}
      />
      <Profiler id="unistyles-benchmark" onRender={props.onProfilerRender}>
        <UnistylesList onRowRender={props.onRowRender} />
      </Profiler>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.surface,
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 16,
  },
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
