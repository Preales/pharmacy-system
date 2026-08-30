import { Component, OnInit, inject, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';
import { AppCurrency } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CurrencyPipe, TranslateModule, CardModule, ChartModule, TableModule, ProgressSpinnerModule, RouterLink],
  template: `
    @if (service.loading()) {
      <div class="flex justify-center p-8">
        <p-progress-spinner />
      </div>
    } @else if (dashboard()) {
      <div class="p-4 flex flex-col gap-4">
        <!-- KPI cards — top row -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-shopping-cart kpi-icon text-primary"></i>
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.salesToday' | translate }}</p>
                <p class="kpi-value text-primary">{{ dashboard()!.totalSalesToday }}</p>
                <p class="kpi-subtitle">{{ 'reports.dashboard.salesThisMonth' | translate }}: {{ dashboard()!.totalSalesThisMonth }}</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-dollar kpi-icon text-green-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.revenueToday' | translate }}</p>
                <p class="kpi-value text-green-500">{{ dashboard()!.totalRevenueToday | currency:cop:'symbol':'1.0-0' }}</p>
                <p class="kpi-subtitle">COP</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-chart-line kpi-icon text-primary"></i>
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.salesThisMonth' | translate }}</p>
                <p class="kpi-value text-primary">{{ dashboard()!.totalSalesThisMonth }}</p>
                <p class="kpi-subtitle">&nbsp;</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-ticket kpi-icon text-blue-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.avgTicket' | translate }}</p>
                <p class="kpi-value text-blue-500">{{ dashboard()!.averageTicket | currency:cop:'symbol':'1.0-0' }}</p>
                <p class="kpi-subtitle">COP</p>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Alert cards — middle row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p-card styleClass="alert-card">
            <div class="flex justify-between items-center">
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.lowStockProducts' | translate }}</p>
                <p class="kpi-value text-orange-500">{{ dashboard()!.lowStockProductsCount }}</p>
              </div>
              <a routerLink="/inventory/low-stock" class="text-primary text-sm">{{ 'reports.dashboard.viewConflicts' | translate }}</a>
            </div>
          </p-card>
          <p-card styleClass="alert-card">
            <div class="flex justify-between items-center">
              <div>
                <p class="kpi-label">{{ 'reports.dashboard.pendingConflicts' | translate }}</p>
                <p class="kpi-value text-red-500">{{ dashboard()!.pendingConflictAlertsCount }}</p>
              </div>
              <a routerLink="/sales/conflict-alerts" class="text-primary text-sm">{{ 'reports.dashboard.viewConflicts' | translate }}</a>
            </div>
          </p-card>
        </div>

        <!-- Top 5 products — bottom -->
        <p-card [header]="'reports.dashboard.top5Title' | translate">
          <p-table [value]="dashboard()!.topProductsThisMonth" [rows]="5" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'reports.dashboard.product' | translate }}</th>
                <th class="text-right">{{ 'reports.dashboard.qtySold' | translate }}</th>
                <th class="text-right">{{ 'reports.dashboard.revenue' | translate }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr>
                <td>{{ p.productName }}</td>
                <td class="text-right">{{ p.totalQuantity }}</td>
                <td class="text-right">{{ p.totalRevenue | currency:cop:'symbol':'1.0-0' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="3" class="text-center text-surface-400 p-4">{{ 'reports.dashboard.noSales' | translate }}</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    } @else {
      <div class="p-8 text-center text-surface-400">{{ 'reports.dashboard.noData' | translate }}</div>
    }
  `,
  styles: `
    :host ::ng-deep .kpi-card .p-card-body { padding: 1rem; }
    :host ::ng-deep .alert-card .p-card-body { padding: 1rem; border-left: 3px solid #D97706; }
    .kpi-content { display: flex; align-items: center; gap: 1rem; }
    .kpi-icon { font-size: 2rem; opacity: 0.85; }
    .kpi-label { font-size: 0.8rem; color: var(--text-color-secondary); margin: 0; }
    .kpi-value { font-size: 1.75rem; font-weight: 700; margin: 0.1rem 0; }
    .kpi-subtitle { font-size: 0.75rem; color: var(--text-color-secondary); margin: 0; }
  `,
})
export class ReportsDashboardComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly dashboard = computed(() => this.service.dashboard());
  protected readonly cop = AppCurrency.COP;

  ngOnInit(): void {
    this.service.loadDashboard();
  }
}
