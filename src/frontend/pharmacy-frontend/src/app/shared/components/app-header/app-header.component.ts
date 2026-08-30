import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, TranslateModule],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  private readonly translateService = inject(TranslateService);

  /** Computed tenant display: use tenantId as the identifier available on AuthUser. */
  get tenantDisplay(): string {
    return this.authService.currentUser()?.tenantId ?? '—';
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  /** Returns the language code opposite to the current active language. */
  get toggleLangLabel(): string {
    return this.translateService.currentLang === 'es' ? 'EN' : 'ES';
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  /**
   * Switches the active language and persists the choice to localStorage
   * so it survives page reloads.
   */
  setLanguage(lang: string): void {
    this.translateService.use(lang);
    localStorage.setItem('pharmacy-lang', lang);
  }

  toggleLanguage(): void {
    const next = this.translateService.currentLang === 'es' ? 'en' : 'es';
    this.setLanguage(next);
  }
}
