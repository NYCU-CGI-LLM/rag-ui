"use client"

import React from "react"
import { useTheme } from "@/lib/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Palette } from "lucide-react"

export function ThemeSwitcher() {
  const { themeMode, colorMode, setThemeMode, setColorMode } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() =>
          setThemeMode(themeMode === "original" ? "neobrutalism" : "original")
        }
      >
        <Palette className="h-4 w-4" />
        <span className="sr-only md:not-sr-only md:ml-1">
          {themeMode === "original" ? "Neobrutalism" : "Original"}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setColorMode(colorMode === "light" ? "dark" : "light")}
      >
        {colorMode === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
} 