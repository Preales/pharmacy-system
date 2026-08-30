import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { InventoryService } from '../services/inventory.service';
import { IngressFormComponent } from '../components/ingress-form.component';
import { AdjustmentFormComponent } from '../components/adjustment-form.component';
import { StockStatus } from '../models/inventory-item.model';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TooltipModule,
    IngressFormComponent,
    AdjustmentFormComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- Summary cards -->
    <div class="summary-grid">
      <p-card styleClass="summary-card">
        <div class="summary-content">
          <i class="pi pi-box summary-icon"></i>
          <div>
            <div class="summary-label">{{ 'inventory.dashboard.totalProducts' | translate }}</div>
            <div class="summary-value">{{ inventoryService.items().totalCount }}</div>
          </div>
        </div>
      </p-card>

      <p-card styleClass="summary-card">
        <div class="summary-content">
          <i class="pi pi-exclamation-triangle summary-icon"></i>
          <div>
            <div class="summary-label">{{ 'inventory.dashboard.lowStockAlerts' | translate }}</div>
            <div class="summary-value text-orange-500">{{ inventoryService.lowStockCount() }}</div>
          </div>
        </div>
      </p-card>

      <p-card styleClass="summary-card">
        <div class="summary-content">
          <i class="pi pi-history summary-icon"></i>
          <div>
            <div class="summary-label">{{ 'inventory.dashboard.todayMovements' | translate }}</div>
            <div class="summary-value">{{ todayMovements }}</div>
          </div>
        </div>
      </p-card>
    </div>

    <!-- Quick actions -->
    <div class="actions-bar">
      <p-button
        [label]="'inventory.dashboard.recordIngress' | translate"
        icon="pi pi-arrow-down"
        (onClick)="ingressVisible = true"
      />
      <p-button
        [label]="'inventory.dashboard.recordAdjustment' | translate"
        icon="pi pi-pencil"
        severity="secondary"
        (onClick)="adjustmentVisible = true"
      />
      <p-button
        [label]="'inventory.dashboard.viewAllStock' | translate"
        icon="pi pi-list"
        severity="info"
        [text]="true"
        routerLink="../stock"
      />
    </div>

    <!-- Low stock alerts table -->
    <div class="section-header">
      <h3>{{ 'inventory.dashboard.lowStockSection' | translate }}</h3>
      <small class="text-secondary">{{ 'inventory.dashboard.lowStockSubtitle' | translate }}</small>
    </div>

    <p-table
      [value]="inventoryService.lowStockItems()"
      [loading]="inventoryService.loading()"
      styleClass="p-datatable-striped p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>{{ 'inventory.dashboard.product' | translate }}</th>
          <th>{{ 'inventory.dashboard.sku' | translate }}</th>
          <th>{{ 'inventory.dashboard.category' | translate }}</th>
          <th style="text-align:right">{{ 'inventory.dashboard.currentStock' | translate }}</th>
          <th style="text-align:right">{{ 'inventory.dashboard.threshold' | translate }}</th>
          <th>{{ 'inventory.dashboard.status' | translate }}</th>
          <th>{{ 'inventory.dashboard.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-item>
        <tr>
          <td>{{ item.productName }}</td>
          <td><code>{{ item.sku }}</code></td>
          <td>{{ item.categoryName }}</td>
          <td style="text-align:right" [class]="item.currentStock <= 0 ? 'text-red-600 font-bold' : 'text-orange-500 font-semibold'">
            {{ item.currentStock }}
          </td>
          <td style="text-align:right">{{ item.lowStockThreshold }}</td>
          <td>
            <p-tag
              [value]="getStatusLabel(item.status)"
              [severity]="getStatusSeverity(item.status)"
            />
          </td>
          <td>
            <p-button
              icon="pi pi-arrow-down"
              [rounded]="true"
              [text]="true"
              severity="success"
              [pTooltip]="'inventory.dashboard.tooltipIngress' | translate"
              (onClick)="openIngressFor(item.productId)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="empty">
        <tr>
          <td colspan="7" class="text-center p-4">
            <i class="pi pi-check-circle text-green-500"></i>
            {{ 'inventory.dashboard.allStocked' | translate }}
          </td>
        </tr>
      </ng-template>
    </p-table>

    <app-ingress-form
      [(visible)]="ingressVisible"
      [preselectedProductId]="preselectedProductId"
      (saved)="onIngressSaved()"
    />
    <app-adjustment-form
      [(visible)]="adjustmentVisible"
      (saved)="onAdjustmentSaved()"
    />
  `,
  styles: `
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card { border-radius: 8px; background: var(--color-card); }
    .summary-content { display: flex; align-items: center; gap: 1rem; }
    .summary-icon { font-size: 2rem; color: var(--color-primary); }
    .summary-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .summary-value { font-size: 1.75rem; font-weight: 700; line-height: 1; }
    .actions-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .section-header { margin-bottom: 0.5rem; }
    .section-header h3 { margin: 0 0 0.15rem; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--color-card); padding: 0.1rem 0.3rem; border-radius: 4px; }
  `,
})
export class InventoryDashboardComponent implements OnInit {
  readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  ingressVisible = false;
  adjustmentVisible = false;
  preselectedProductId: string | null = null;
  readonly todayMovements = 0; // populated from movements API in a future slice

  ngOnInit(): void {
    this.inventoryService.loadStock();
    this.inventoryService.loadLowStock();
  }

  openIngressFor(productId: string): void {
    this.preselectedProductId = productId;
    this.ingressVisible = true;
  }

  getStatusLabel(status: StockStatus): string {
    const labels: Record<StockStatus, string> = {
      OK: 'OK',
      Low: 'Low',
      Critical: 'Critical',
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' {
    if (status === 'Critical') return 'danger';
    if (status === 'Low') return 'warn';
    return 'success';
  }

  onIngressSaved(): void {
    this.preselectedProductId = null;
    this.inventoryService.loadLowStock();
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('inventory.stock.ingressRecorded'),
      detail: this.translate.instant('inventory.stock.stockUpdated'),
    });
  }

  onAdjustmentSaved(): void {
    this.inventoryService.loadLowStock();
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('inventory.stock.adjustmentApplied'),
      detail: this.translate.instant('inventory.stock.stockAdjusted'),
    });
  }
}
