import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize budget item name for matching (remove page suffix, trim spaces) */
export function normalizeBudgetItemName(name: string): string {
  return name
    .replace(/\s*\(\s*page\s*\d+\s*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
