"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/chat", label: "Chat" },
  { path: "/library", label: "Library" },
  { path: "/eval", label: "Evaluation" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b w-full h-16 px-4">
      <div className="w-1/4">
        <div className="font-bold text-xl">RAG UI</div>
      </div>
      <div className="w-2/4 flex justify-center">
        <div className="flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "text-base font-bold transition-colors hover:text-primary",
                pathname === item.path
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="w-1/4 flex justify-end">
        <ThemeSwitcher />
      </div>
    </nav>
  );
} 