import { useState, useEffect } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("mindforge-theme") as Theme | null;
    return saved ?? "dark";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("mindforge-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle, setTheme };
}
