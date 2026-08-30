import { Component, OnInit, inject, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';
import { LowStockProduct } from '../models/report.model';
import { AppCurrency } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CurrencyPipe, TranslateModule, CardModule, TableModule, TagModule, ButtonModule, ProgressSpinnerModule, RouterLink],
  template: `
    @if (service.loading()) {
      <div class="flex justify-center p-8">
        <p-progress-spinner />
      </div>
    } @else if (report()) {
      <div class="p-4 flex flex-col gap-4">
        <!-- KPI cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-box kpi-icon text-primary"></i>
              <div>
                <p class="kpi-label">{{ 'reports.inventoryReport.totalProducts' | translate }}</p>
                <p class="kpi-value text-primary">{{ report()!.totalProducts }}</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-exclamation-triangle kpi-icon text-orange-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.inventoryReport.lowStock' | translate }}</p>
                <p class="kpi-value text-orange-500">{{ report()!.lowStockProducts }}</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-ban kpi-icon text-red-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.inventoryReport.zeroStock' | translate }}</p>
                <p class="kpi-value text-red-500">{{ report()!.zeroStockProducts }}</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-dollar kpi-icon text-green-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.inventoryReport.totalStockValue' | translate }}</p>
                <p class="kpi-value text-green-500">{{ report()!.totalStockValue | currency:cop:'symbol':'1.0-0' }}</p>
                <p class="kpi-subtitle">COP</p>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Low/zero stock products table -->
        <p-card [header]="'reports.inventoryReport.tableTitle' | translate">
          <p-table
            [value]="report()!.lowStockItems"
            [paginator]="true"
            [rows]="20"
            styleClass="p-datatable-sm p-datatable-striped"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'reports.inventoryReport.product' | translate }}</th>
                <th>{{ 'reports.inventoryReport.sku' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.currentStock' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.threshold' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.costPrice' | translate }}</th>
                <th>{{ 'reports.inventoryReport.status' | translate }}</th>
                <th></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.productName }}</td>
                <td><code>{{ item.sku }}</code></td>
                <td class="text-right font-bold" [class.text-red-500]="item.currentStock <= 0" [class.text-orange-500]="item.currentStock > 0 && item.currentStock <= item.lowStockThreshold">
                  {{ item.currentStock }}
                </td>
                <td class="text-right">{{ item.lowStockThreshold }}</td>
                <td class="text-right">{{ item.costPrice | currency:cop:'symbol':'1.0-0' }}</td>
                <td>
                  @if (item.currentStock <= 0) {
                    <p-tag severity="danger" [value]="'reports.inventoryReport.tagZeroStock' | translate" />
                  } @else {
                    <p-tag severity="warn" [value]="'reports.inventoryReport.tagLowStock' | translate" />
                  }
                </td>
                <td>
                  <a routerLink="/inventory">
                    <p-button icon="pi pi-arrow-right" size="small" severity="secondary" [text]="true" />
                  </a>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center text-surface-400 p-4">{{ 'reports.inventoryReport.allHealthy' | translate }}</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    } @else {
      <div class="p-8 text-center text-surface-400">{{ 'reports.inventoryReport.noData' | translate }}</div>
    }
  `,
  styles: `
    :host ::ng-deep .kpi-card .p-card-body { padding: 1rem; }
    .kpi-content { display: flex; align-items: center; gap: 1rem; }
    .kpi-icon { font-size: 2rem; opacity: 0.85; }
    .kpi-label { font-size: 0.8rem; color: var(--text-color-secondary); margin: 0; }
    .kpi-value { font-size: 1.75rem; font-weight: 700; margin: 0.1rem 0; }
    .kpi-subtitle { font-size: 0.75rem; color: var(--text-color-secondary); margin: 0; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
  `,
})
export class InventoryReportComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly report = computed(() => this.service.inventoryReport());
  protected readonly cop = AppCurrency.COP;

  ngOnInit(): void {
    this.service.loadInventoryReport();
  }
}
