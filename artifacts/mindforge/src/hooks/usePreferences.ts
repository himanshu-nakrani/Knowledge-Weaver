import { useState, useCallback } from "react";

export interface Preferences {
  retrievalTopK: number;
  webSearchEnabled: boolean;
  cardsPerDeck: number;
  compactView: boolean;
}

const DEFAULTS: Preferences = {
  retrievalTopK: 8,
  webSearchEnabled: true,
  cardsPerDeck: 8,
  compactView: false,
};

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem("mindforge:preferences");
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function usePreferences() {
  const [prefs, setPrefsState] = useState<Preferences>(loadPrefs);

  const setPrefs = useCallback((updates: Partial<Preferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("mindforge:preferences", JSON.stringify(next));
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    localStorage.removeItem("mindforge:preferences");
    setPrefsState(DEFAULTS);
  }, []);

  return { prefs, setPrefs, resetPrefs };
}
