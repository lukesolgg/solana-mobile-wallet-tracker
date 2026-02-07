import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedAddress } from '../types';

const STORAGE_KEY = '@saved_addresses';

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setAddresses(JSON.parse(raw));
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (updated: SavedAddress[]) => {
    setAddresses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const add = useCallback(
    (address: string, label?: string) => {
      const entry: SavedAddress = {
        id: Date.now().toString(),
        address,
        label: label || `Wallet ${address.slice(0, 6)}`,
        notificationsEnabled: false,
        addedAt: Date.now(),
      };
      persist([entry, ...addresses]);
    },
    [addresses, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(addresses.filter((a) => a.id !== id));
    },
    [addresses, persist],
  );

  const update = useCallback(
    (id: string, changes: Partial<SavedAddress>) => {
      persist(addresses.map((a) => (a.id === id ? { ...a, ...changes } : a)));
    },
    [addresses, persist],
  );

  const isSaved = useCallback(
    (address: string) => addresses.some((a) => a.address === address),
    [addresses],
  );

  const getLabel = useCallback(
    (address: string): string | undefined => {
      const found = addresses.find((a) => a.address === address);
      return found?.label;
    },
    [addresses],
  );

  return { addresses, loading, add, remove, update, isSaved, getLabel };
}
