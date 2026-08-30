import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    TranslateModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h2>{{ 'sales.conflicts.title' | translate }}</h2>
      <div class="header-controls">
        <label class="toggle-label">
          <p-toggleswitch [(ngModel)]="showUnresolvedOnly" (onChange)="loadAlerts()" />
          <span>{{ 'sales.conflicts.unresolvedOnly' | translate }}</span>
        </label>
      </div>
    </div>

    <p-table
      [value]="alertsService.alerts().items"
      [loading]="alertsService.loading()"
      [rows]="pageSize"
      [totalRecords]="alertsService.alerts().totalCount"
      [lazy]="true"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      styleClass="p-datatable-striped p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>{{ 'sales.conflicts.product' | translate }}</th>
          <th>{{ 'sales.conflicts.saleNumber' | translate }}</th>
          <th style="text-align:right">{{ 'sales.conflicts.expectedStock' | translate }}</th>
          <th style="text-align:right">{{ 'sales.conflicts.actualStock' | translate }}</th>
          <th>{{ 'sales.conflicts.detectedAt' | translate }}</th>
          <th>{{ 'sales.conflicts.status' | translate }}</th>
          <th>{{ 'sales.conflicts.actions' | translate }}</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-alert>
        <tr>
          <td>{{ alert.productName }}</td>
          <td><code>{{ alert.saleNumber }}</code></td>
          <td style="text-align:right">{{ alert.expectedStock }}</td>
          <td style="text-align:right" [class]="alert.actualStock < 0 ? 'text-red-600 font-bold' : ''">
            {{ alert.actualStock }}
          </td>
          <td>{{ alert.detectedAt | date:'short' }}</td>
          <td>
            <p-tag
              [value]="alert.isResolved ? ('sales.conflicts.resolved' | translate) : ('sales.conflicts.unresolved' | translate)"
              [severity]="alert.isResolved ? 'success' : 'danger'"
            />
          </td>
          <td>
            @if (!alert.isResolved && isAdmin()) {
              <p-button
                icon="pi pi-check"
                [label]="'sales.conflicts.resolve' | translate"
                size="small"
                severity="success"
                [outlined]="true"
                (onClick)="resolveAlert(alert)"
              />
            }
            @if (alert.isResolved) {
              <span class="resolved-by text-secondary text-sm">
                {{ alert.resolvedBy ?? AppRoles.Admin }}
              </span>
            }
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr>
          <td colspan="7" class="text-center p-4">
            <i class="pi pi-check-circle text-green-500"></i>
            {{ 'sales.conflicts.noAlerts' | translate }}
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
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
  private readonly translate = inject(TranslateService);

  readonly AppRoles = AppRoles;
  pageSize = 20;
  currentPage = 1;
  showUnresolvedOnly = true;

  readonly isAdmin = () => (this.authService.currentUser()?.roles ?? []).includes(AppRoles.Admin);

  constructor() {
    // Load alerts reactively once tenantId is available (guards against cold start / page refresh)
    effect(() => {
      const tenantId = this.authService.currentTenantId();
      if (tenantId) {
        this.loadAlerts();
      }
    });
  }

  ngOnInit(): void {
    // Initial load only if tenantId is already available; otherwise the effect above handles it
    if (this.authService.currentTenantId()) {
      this.loadAlerts();
    }
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
          summary: this.translate.instant('sales.conflicts.alertResolved'),
          detail: this.translate.instant('sales.conflicts.alertResolvedDetail', { product: alert.productName }),
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('sales.conflicts.error'),
          detail: this.translate.instant('sales.conflicts.errorDetail'),
        });
      },
    });
  }
}
