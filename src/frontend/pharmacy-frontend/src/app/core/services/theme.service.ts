import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'pharmacy-theme';
const DARK_CLASS = 'dark-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** True when dark mode is active. Initialized from localStorage. */
  readonly isDarkMode = signal<boolean>(this.loadPreference());

  constructor() {
    this.applyToDOM(this.isDarkMode());
  }

  /** Toggle dark/light mode, persist preference and update the DOM class. */
  toggle(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    this.applyToDOM(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  }

  private applyToDOM(dark: boolean): void {
    const root = document.documentElement;
    if (dark) {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }
  }

  private loadPreference(): boolean {
    return localStorage.getItem(THEME_KEY) === 'dark';
  }
}
