import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'ar' | 'en';

const SUPPORTED: Language[] = ['ar', 'en'];

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'voltyks-language';
  private translate = inject(TranslateService);

  private languageSubject: BehaviorSubject<Language>;
  public language$: Observable<Language>;

  constructor() {
    const saved = this.getSavedLanguage();
    this.languageSubject = new BehaviorSubject<Language>(saved);
    this.language$ = this.languageSubject.asObservable();

    this.translate.addLangs(SUPPORTED);
    this.translate.setFallbackLang('ar');
    // Set HTML lang/dir synchronously so the inline boot script's effect
    // is preserved. The actual translate.use(lang) call is owned by the
    // app initializer (see app.config.ts) so bootstrap blocks on it.
    document.documentElement.lang = saved;
    document.documentElement.dir = this.getDirectionFor(saved);
  }

  private getSavedLanguage(): Language {
    const saved = localStorage.getItem(this.LANG_KEY) as Language;
    return SUPPORTED.includes(saved) ? saved : 'ar';
  }

  private saveLanguage(lang: Language): void {
    localStorage.setItem(this.LANG_KEY, lang);
  }

  private applyLanguage(lang: Language): void {
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = this.getDirectionFor(lang);
  }

  /** Direction string for a given language. */
  getDirectionFor(lang: Language): 'rtl' | 'ltr' {
    return lang === 'ar' ? 'rtl' : 'ltr';
  }

  /** BCP-47 locale tag used by Angular's date/number pipes. */
  getLocaleFor(lang: Language): string {
    return lang === 'ar' ? 'ar-EG' : 'en-US';
  }

  get currentLanguage(): Language {
    return this.languageSubject.value;
  }

  get currentLocale(): string {
    return this.getLocaleFor(this.currentLanguage);
  }

  get currentDirection(): 'rtl' | 'ltr' {
    return this.getDirectionFor(this.currentLanguage);
  }

  toggleLanguage(): void {
    const next: Language = this.currentLanguage === 'ar' ? 'en' : 'ar';
    this.setLanguage(next);
  }

  setLanguage(lang: Language): void {
    if (!SUPPORTED.includes(lang)) return;
    this.languageSubject.next(lang);
    this.saveLanguage(lang);
    this.applyLanguage(lang);
  }
}
