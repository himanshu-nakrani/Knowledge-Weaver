import { useState, useCallback } from "react";

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", badge: "Best quality" },
  { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B", badge: "Fastest" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8×7B", badge: "32k context" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", badge: "Efficient" },
] as const;

export type GroqModelId = (typeof GROQ_MODELS)[number]["id"];

export interface Preferences {
  retrievalTopK: number;
  webSearchEnabled: boolean;
  cardsPerDeck: number;
  compactView: boolean;
  llmModel: GroqModelId;
}

const DEFAULTS: Preferences = {
  retrievalTopK: 8,
  webSearchEnabled: true,
  cardsPerDeck: 8,
  compactView: false,
  llmModel: "llama-3.3-70b-versatile",
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
