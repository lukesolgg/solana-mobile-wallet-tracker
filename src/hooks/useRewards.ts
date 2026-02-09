// src/hooks/useRewards.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RewardsData, RewardAction, RewardLevel } from '../types';
import { REWARD_LEVELS, POINTS_MAP } from '../types';

const STORAGE_KEY = '@rewards_data';

const DEFAULT_DATA: RewardsData = {
  totalPoints: 0,
  actions: [],
  dailyLoginDates: [],
};

function getLevel(points: number): { name: RewardLevel; icon: string; minPoints: number } {
  let current = REWARD_LEVELS[0];
  for (const lvl of REWARD_LEVELS) {
    if (points >= lvl.minPoints) current = lvl;
  }
  return current;
}

function getNextLevel(points: number): { name: RewardLevel; minPoints: number } | null {
  for (const lvl of REWARD_LEVELS) {
    if (points < lvl.minPoints) return lvl;
  }
  return null; // Already at max level
}

export function useRewards() {
  const [data, setData] = useState<RewardsData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as RewardsData;
            setData(parsed);
          } catch {
            setData(DEFAULT_DATA);
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Record daily login on first load — only if wallet is connected
  useEffect(() => {
    if (!loaded || !data.connectedWallet) return;
    const today = new Date().toISOString().split('T')[0];
    if (!data.dailyLoginDates.includes(today)) {
      const updated: RewardsData = {
        ...data,
        totalPoints: data.totalPoints + POINTS_MAP.daily_login,
        dailyLoginDates: [...data.dailyLoginDates, today],
        actions: [
          { type: 'daily_login', timestamp: Date.now(), points: POINTS_MAP.daily_login, label: 'Daily login' },
          ...data.actions,
        ],
      };
      setData(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [loaded, data.connectedWallet]);

  const persist = useCallback(async (updated: RewardsData) => {
    setData(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  /** Only adds points if a wallet is connected */
  const addPoints = useCallback(
    (type: RewardAction['type'], label?: string) => {
      if (!data.connectedWallet) return; // Guests don't earn points
      const pts = POINTS_MAP[type];
      const action: RewardAction = {
        type,
        timestamp: Date.now(),
        points: pts,
        label,
      };
      const updated: RewardsData = {
        ...data,
        totalPoints: data.totalPoints + pts,
        actions: [action, ...data.actions].slice(0, 100),
      };
      persist(updated);
    },
    [data, persist],
  );

  /** Set connected wallet address — enables point tracking */
  const setConnectedWallet = useCallback(
    (address: string | null) => {
      const updated: RewardsData = {
        ...data,
        connectedWallet: address ?? undefined,
      };
      persist(updated);
    },
    [data, persist],
  );

  const isConnected = !!data.connectedWallet;

  const level = useMemo(() => getLevel(data.totalPoints), [data.totalPoints]);
  const nextLevel = useMemo(() => getNextLevel(data.totalPoints), [data.totalPoints]);

  const progressToNext = useMemo(() => {
    if (!nextLevel) return 1;
    const prevMin = level.minPoints;
    const range = nextLevel.minPoints - prevMin;
    const progress = data.totalPoints - prevMin;
    return range > 0 ? Math.min(progress / range, 1) : 1;
  }, [data.totalPoints, level, nextLevel]);

  const streak = useMemo(() => {
    const sorted = [...data.dailyLoginDates].sort().reverse();
    if (sorted.length === 0) return 0;
    let count = 0;
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (sorted[i] === expectedStr) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [data.dailyLoginDates]);

  return {
    points: data.totalPoints,
    level,
    nextLevel,
    progressToNext,
    streak,
    addPoints,
    setConnectedWallet,
    isConnected,
    connectedWallet: data.connectedWallet ?? null,
    loaded,
  };
}
