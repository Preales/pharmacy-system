import { Component, OnInit, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, CardModule, ChartModule, TableModule, ProgressSpinnerModule, RouterLink],
  template: `
    @if (service.loading()) {
      <div class="flex justify-center p-8">
        <p-progress-spinner />
      </div>
    } @else if (dashboard()) {
      <div class="p-4 flex flex-col gap-4">
        <!-- Summary cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.salesToday' | translate }}</p>
              <p class="text-3xl font-bold text-primary m-0">{{ dashboard()!.totalSalesToday }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.revenueToday' | translate }}</p>
              <p class="text-3xl font-bold text-green-500 m-0">
                {{ dashboard()!.totalRevenueToday | number:'1.2-2' }}
              </p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.salesThisMonth' | translate }}</p>
              <p class="text-3xl font-bold text-primary m-0">{{ dashboard()!.totalSalesThisMonth }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.avgTicket' | translate }}</p>
              <p class="text-3xl font-bold text-blue-500 m-0">
                {{ dashboard()!.averageTicket | number:'1.2-2' }}
              </p>
            </div>
          </p-card>
        </div>

        <!-- Alert cards row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p-card>
            <div class="flex justify-between items-center">
              <div>
                <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.lowStockProducts' | translate }}</p>
                <p class="text-2xl font-bold text-orange-500 m-0">{{ dashboard()!.lowStockProductsCount }}</p>
              </div>
              <a routerLink="/inventory/low-stock" class="text-primary text-sm">{{ 'reports.dashboard.viewConflicts' | translate }}</a>
            </div>
          </p-card>
          <p-card>
            <div class="flex justify-between items-center">
              <div>
                <p class="text-surface-500 text-sm m-0">{{ 'reports.dashboard.pendingConflicts' | translate }}</p>
                <p class="text-2xl font-bold text-red-500 m-0">{{ dashboard()!.pendingConflictAlertsCount }}</p>
              </div>
              <a routerLink="/sales/conflict-alerts" class="text-primary text-sm">{{ 'reports.dashboard.viewConflicts' | translate }}</a>
            </div>
          </p-card>
        </div>

        <!-- Top 5 products table -->
        <p-card [header]="'reports.dashboard.top5Title' | translate">
          <p-table [value]="dashboard()!.topProductsThisMonth" [rows]="5" styleClass="p-datatable-sm">
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
                <td class="text-right">{{ p.totalRevenue | number:'1.2-2' }}</td>
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
})
export class ReportsDashboardComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly dashboard = computed(() => this.service.dashboard());

  ngOnInit(): void {
    this.service.loadDashboard();
  }
}
