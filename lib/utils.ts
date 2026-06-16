import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals = 0): string {
  if (value == null || isNaN(value)) return 'S$0';
  if (value < 0) return `-${formatCurrency(Math.abs(value), decimals)}`;
  return `S$${value.toLocaleString('en-SG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (value == null || isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function inflateValue(
  currentValue: number,
  inflationRate: number,
  years: number
): number {
  return currentValue * Math.pow(1 + inflationRate / 100, years);
}

export function presentValue(
  futureValue: number,
  discountRate: number,
  years: number
): number {
  return futureValue / Math.pow(1 + discountRate / 100, years);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ageToYear(currentAge: number, targetAge: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear + (targetAge - currentAge);
}

export function yearToAge(currentAge: number, targetYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentAge + (targetYear - currentYear);
}

export const CURRENT_YEAR = new Date().getFullYear();
