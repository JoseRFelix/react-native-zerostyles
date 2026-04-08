import React, { Profiler, useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

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

function NativewindRow({
  badge,
  coverage,
  latency,
  onRowRender,
  progress,
  subtitle,
  targetTheme,
  title,
}: {
  badge: string;
  coverage: number;
  latency: number;
  onRowRender: () => void;
  progress: number;
  subtitle: string;
  targetTheme: keyof typeof appThemes;
  title: string;
}) {
  onRowRender();
  const isDark = targetTheme === 'dark';

  return (
    <View
      className={`rounded-[18px] border p-4 ${
        isDark ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white'
      }`}
    >
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className={`rounded-full px-2.5 py-1 ${isDark ? 'bg-cyan-950' : 'bg-cyan-100'}`}>
          <Text
            className={`text-[11px] font-bold tracking-[0.6px] ${
              isDark ? 'text-cyan-200' : 'text-cyan-700'
            }`}
          >
            {badge.toUpperCase()}
          </Text>
        </View>
        <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          {latency} ms
        </Text>
      </View>
      <Text className={`mb-1 text-base font-bold ${isDark ? 'text-zinc-50' : 'text-slate-950'}`}>
        {title}
      </Text>
      <Text
        className={`mb-3 text-[13px] leading-[18px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
      >
        {subtitle}
      </Text>
      <View
        className={`mb-3 h-2 overflow-hidden rounded-full ${
          isDark ? 'bg-zinc-700' : 'bg-slate-200'
        }`}
      >
        <View
          className={isDark ? 'h-full rounded-full bg-white' : 'h-full rounded-full bg-sky-600'}
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
          Coverage {coverage}%
        </Text>
        <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
          Phase {progress}%
        </Text>
      </View>
    </View>
  );
}

function NativewindList({ onRowRender, targetTheme }: Pick<Props, 'onRowRender' | 'targetTheme'>) {
  const isDark = targetTheme === 'dark';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#1D2125' : '#F5F9FC' }}
      contentContainerStyle={{ gap: 12, padding: 16 }}
    >
      {BENCHMARK_ITEMS.map((item) => (
        <NativewindRow
          key={item.id}
          {...item}
          onRowRender={onRowRender}
          targetTheme={targetTheme}
        />
      ))}
    </ScrollView>
  );
}

export function NativewindBenchmark(props: Props) {
  return (
    <>
      <CommitSignal
        targetTheme={props.targetTheme}
        phaseKey={props.phaseKey}
        onMounted={props.onMounted}
        onSettled={props.onSettled}
      />
      <Profiler id="nativewind-benchmark" onRender={props.onProfilerRender}>
        <NativewindList targetTheme={props.targetTheme} onRowRender={props.onRowRender} />
      </Profiler>
    </>
  );
}
