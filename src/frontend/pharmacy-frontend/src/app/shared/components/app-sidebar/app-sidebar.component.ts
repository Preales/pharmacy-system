import { Component, inject, signal, effect, HostListener, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/constants/app.constants';

const SIDEBAR_KEY = 'pharmacy-sidebar';
const COLLAPSE_BREAKPOINT = 768;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  protected readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  /** Reactive computed signals for role-based visibility. */
  readonly canViewReports = computed(() =>
    this.authService.hasRole(AppRoles.Admin) || this.authService.hasRole(AppRoles.Pharmacist)
  );
  readonly canViewUsers = computed(() => this.authService.hasRole(AppRoles.Admin));

  /** Whether the sidebar is in collapsed (icon-only) state. */
  readonly isCollapsed = signal<boolean>(this.loadCollapseState());

  constructor() {
    // Persist collapse state changes to localStorage.
    effect(() => {
      localStorage.setItem(SIDEBAR_KEY, this.isCollapsed() ? 'collapsed' : 'expanded');
    });

    // Auto-collapse on initial load if viewport is narrow.
    if (window.innerWidth < COLLAPSE_BREAKPOINT) {
      this.isCollapsed.set(true);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    const target = event.target as Window;
    if (target.innerWidth < COLLAPSE_BREAKPOINT) {
      this.isCollapsed.set(true);
    }
  }

  private loadCollapseState(): boolean {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  }
}
