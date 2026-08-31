import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-reports-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="reports-shell">
      <nav class="subnav-sidebar">
        <div class="sidebar-header">
          <span class="pi pi-chart-bar sidebar-icon"></span>
          <span class="sidebar-title">Reports</span>
        </div>

        <ul class="sidebar-nav">
          <li>
            <a routerLink="dashboard" routerLinkActive="active" class="nav-item">
              <i class="pi pi-chart-line"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a routerLink="sales" routerLinkActive="active" class="nav-item">
              <i class="pi pi-chart-bar"></i>
              <span>Sales Report</span>
            </a>
          </li>
          <li>
            <a routerLink="inventory" routerLinkActive="active" class="nav-item">
              <i class="pi pi-box"></i>
              <span>Inventory Report</span>
            </a>
          </li>
        </ul>
      </nav>

      <main class="reports-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .reports-shell {
      display: flex;
      min-height: 100vh;
    }
    .subnav-sidebar {
      width: 220px;
      min-width: 220px;
      background: var(--color-card, var(--surface-card));
      border-right: 1px solid var(--color-border, var(--surface-border));
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
      border-bottom: 1px solid var(--color-border, var(--surface-border));
      margin-bottom: 0.75rem;
    }
    .sidebar-icon { font-size: 1.2rem; color: var(--color-primary, var(--primary-color)); }
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
      background: var(--brand-primary-subtle);
      color: var(--color-primary, var(--primary-color));
      font-weight: 600;
    }
    .reports-content {
      flex: 1;
      padding: 1.5rem;
      background: var(--surface-ground);
      overflow: auto;
    }
  `,
})
export class ReportsShellComponent {}

