import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppSettings = {
  defaultSortKey: 'rank' | 'profit' | 'spread' | 'price' | 'tmv' | 'velocity' | 'confidence';
  defaultSortDirection: 'asc' | 'desc';
  minConfidence: number;
  compactMode: boolean;
  autoRefreshSec: number;
};

export const SETTINGS_KEY = 'deal-hunter-settings-v1';

const defaultSettings: AppSettings = {
  defaultSortKey: 'rank',
  defaultSortDirection: 'desc',
  minConfidence: 0.6,
  compactMode: false,
  autoRefreshSec: 60,
};

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      setSettings((current) => ({ ...current, ...parsed }));
    } catch {
      // Ignore malformed persisted settings.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.body.classList.toggle('compact-mode', settings.compactMode);
  }, [settings]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (updates) => setSettings((current) => ({ ...current, ...updates })),
      resetSettings: () => setSettings(defaultSettings),
    }),
    [settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
