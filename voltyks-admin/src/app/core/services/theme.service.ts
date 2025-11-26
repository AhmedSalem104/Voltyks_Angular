import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'voltyks-theme';
  private themeSubject: BehaviorSubject<Theme>;
  public theme$: Observable<Theme>;

  constructor() {
    const savedTheme = this.getSavedTheme();
    this.themeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.theme$ = this.themeSubject.asObservable();

    // Apply theme on initialization
    this.applyTheme(savedTheme);
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    return saved || 'dark'; // Default to dark
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  toggleTheme(): void {
    const newTheme: Theme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    this.saveTheme(theme);
    this.applyTheme(theme);
  }
}
