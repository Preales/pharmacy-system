import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { ConflictAlertsService } from '../services/conflict-alerts.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConflictAlert, ConflictAlertFilter } from '../models/conflict-alert.model';
import { AppRoles } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-conflict-alerts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ToggleSwitchModule,
  ],
  providers: [MessageService],
  templateUrl: './conflict-alerts.component.html',
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .page-header h2 { margin: 0; }
    .header-controls { display: flex; align-items: center; gap: 1rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .text-sm { font-size: 0.875rem; }
    .text-secondary { color: var(--text-color-secondary); }
    .resolved-by { font-size: 0.8rem; }
  `,
})
export class ConflictAlertsComponent implements OnInit {
  readonly alertsService = inject(ConflictAlertsService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly AppRoles = AppRoles;
  pageSize = 20;
  currentPage = 1;
  showUnresolvedOnly = true;

  readonly isAdmin = () => (this.authService.currentUser()?.roles ?? []).includes(AppRoles.Admin);

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    const filter: ConflictAlertFilter = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      isResolved: this.showUnresolvedOnly ? false : undefined,
    };
    this.alertsService.loadAlerts(filter);
  }

  onLazyLoad(event: { first?: number | null; rows?: number | null }): void {
    this.currentPage = Math.floor((event.first ?? 0) / (event.rows ?? this.pageSize)) + 1;
    this.loadAlerts();
  }

  resolveAlert(alert: ConflictAlert): void {
    this.alertsService.resolveAlert(alert.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Alert Resolved',
          detail: `Stock conflict for ${alert.productName} has been resolved.`,
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not resolve alert.' });
      },
    });
  }
}
