import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-catalog-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './catalog-shell.component.html',
  styles: `
    .catalog-shell {
      display: flex;
      min-height: 100vh;
    }
    .catalog-sidebar {
      width: 220px;
      min-width: 220px;
      background: var(--surface-card);
      border-right: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      padding: 1rem 0;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem 1.25rem;
      font-weight: 700;
      font-size: 1.1rem;
      border-bottom: 1px solid var(--surface-border);
      margin-bottom: 0.75rem;
    }
    .sidebar-icon { font-size: 1.2rem; color: var(--primary-color); }
    .sidebar-nav { list-style: none; margin: 0; padding: 0; flex: 1; }
    .sidebar-nav li { margin: 0.1rem 0; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1.25rem;
      text-decoration: none;
      color: var(--text-color);
      border-radius: 0;
      transition: background 0.15s;
      font-size: 0.9375rem;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
    }
    .nav-item:hover { background: var(--surface-hover); }
    .nav-item.active {
      background: var(--primary-50, #e3f2fd);
      color: var(--primary-color);
      font-weight: 600;
    }
    .sidebar-footer {
      padding: 1rem 0 0;
      border-top: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .logout-btn { color: var(--red-500); }
    .logout-btn:hover { background: var(--red-50, #fff5f5); }
    .user-email {
      padding: 0 1.25rem;
      color: var(--text-color-secondary);
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .catalog-content {
      flex: 1;
      padding: 1.5rem;
      background: var(--surface-ground);
      overflow: auto;
    }
  `,
})
export class CatalogShellComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.logout();
  }
}
