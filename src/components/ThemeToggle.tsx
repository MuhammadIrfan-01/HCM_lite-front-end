"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("hcm-theme");
    const activeTheme: Theme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = activeTheme;
    setTheme(activeTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("hcm-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span aria-hidden="true">{theme === "light" ? "◐" : "☀"}</span>
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
