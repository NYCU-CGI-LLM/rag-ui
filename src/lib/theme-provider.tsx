"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type ThemeMode = "original" | "neobrutalism"
type ColorMode = "light" | "dark"

interface ThemeContextType {
  themeMode: ThemeMode
  colorMode: ColorMode
  setThemeMode: (mode: ThemeMode) => void
  setColorMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("original")
  const [colorMode, setColorMode] = useState<ColorMode>("light")

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedThemeMode = localStorage.getItem("themeMode") as ThemeMode
    const savedColorMode = localStorage.getItem("colorMode") as ColorMode
    
    if (savedThemeMode) {
      setThemeMode(savedThemeMode)
    }
    
    if (savedColorMode) {
      setColorMode(savedColorMode)
      document.documentElement.classList.toggle("dark", savedColorMode === "dark")
    } else {
      // Check system preference if no saved theme
      const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
      setColorMode(isDarkMode ? "dark" : "light")
      document.documentElement.classList.toggle("dark", isDarkMode)
    }
  }, [])

  // Update localStorage and class when theme changes
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode)
    document.documentElement.classList.remove("neobrutalism-theme", "original-theme")
    document.documentElement.classList.add(`${themeMode}-theme`)
  }, [themeMode])

  // Update localStorage and class when color mode changes
  useEffect(() => {
    localStorage.setItem("colorMode", colorMode)
    document.documentElement.classList.toggle("dark", colorMode === "dark")
  }, [colorMode])

  const value = {
    themeMode,
    colorMode,
    setThemeMode,
    setColorMode,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
} 