import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';
import { AppCurrency } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    TranslateModule,
    CardModule,
    ChartModule,
    TableModule,
    DatePickerModule,
    ButtonModule,
    ProgressSpinnerModule,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4">
      <!-- Date range filter bar -->
      <div class="filter-bar">
        <p-card>
          <div class="flex gap-3 align-items-end flex-wrap">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-surface-600">{{ 'reports.salesReport.from' | translate }}</label>
              <p-datepicker [(ngModel)]="dateFrom" dateFormat="yy-mm-dd" [showIcon]="true" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-surface-600">{{ 'reports.salesReport.to' | translate }}</label>
              <p-datepicker [(ngModel)]="dateTo" dateFormat="yy-mm-dd" [showIcon]="true" />
            </div>
            <p-button [label]="'reports.salesReport.loadReport' | translate" icon="pi pi-chart-bar" (onClick)="load()" />
          </div>
        </p-card>
      </div>

      @if (service.loading()) {
        <div class="flex justify-center p-8">
          <p-progress-spinner />
        </div>
      } @else if (report()) {
        <!-- KPI cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-shopping-cart kpi-icon text-primary"></i>
              <div>
                <p class="kpi-label">{{ 'reports.salesReport.totalSales' | translate }}</p>
                <p class="kpi-value text-primary">{{ report()!.totalSales }}</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-dollar kpi-icon text-green-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.salesReport.totalRevenue' | translate }}</p>
                <p class="kpi-value text-green-500">{{ report()!.totalRevenue | currency:cop:'symbol':'1.0-0' }}</p>
                <p class="kpi-subtitle">COP</p>
              </div>
            </div>
          </p-card>
          <p-card styleClass="kpi-card">
            <div class="kpi-content">
              <i class="pi pi-ticket kpi-icon text-blue-500"></i>
              <div>
                <p class="kpi-label">{{ 'reports.salesReport.averageTicket' | translate }}</p>
                <p class="kpi-value text-blue-500">{{ report()!.averageTicket | currency:cop:'symbol':'1.0-0' }}</p>
                <p class="kpi-subtitle">COP</p>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Daily sales chart -->
        <p-card [header]="'reports.salesReport.dailySales' | translate">
          @if (chartData()) {
            <p-chart type="bar" [data]="chartData()!" [options]="chartOptions" height="300px" />
          }
        </p-card>

        <!-- Top products table -->
        <p-card [header]="'reports.salesReport.topProducts' | translate">
          <p-table [value]="report()!.topProducts" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'reports.salesReport.product' | translate }}</th>
                <th class="text-right">{{ 'reports.salesReport.qtySold' | translate }}</th>
                <th class="text-right">{{ 'reports.salesReport.revenue' | translate }}</th>
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
              <tr><td colspan="3" class="text-center text-surface-400 p-4">{{ 'reports.salesReport.noData' | translate }}</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      }
    </div>
  `,
  styles: `
    .filter-bar { background: var(--color-card, var(--surface-card)); border-radius: 8px; }
    :host ::ng-deep .kpi-card .p-card-body { padding: 1rem; }
    .kpi-content { display: flex; align-items: center; gap: 1rem; }
    .kpi-icon { font-size: 2rem; opacity: 0.85; }
    .kpi-label { font-size: 0.8rem; color: var(--text-color-secondary); margin: 0; }
    .kpi-value { font-size: 1.75rem; font-weight: 700; margin: 0.1rem 0; }
    .kpi-subtitle { font-size: 0.75rem; color: var(--text-color-secondary); margin: 0; }
  `,
})
export class SalesReportComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly report = computed(() => this.service.salesReport());
  protected readonly cop = AppCurrency.COP;

  dateFrom: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  dateTo: Date = new Date();

  readonly chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  protected readonly chartData = computed(() => {
    const r = this.service.salesReport();
    if (!r) return null;
    return {
      labels: r.dailySales.map((d) => d.date.substring(0, 10)),
      datasets: [
        {
          label: 'Revenue',
          data: r.dailySales.map((d) => d.revenue),
          backgroundColor: 'rgba(var(--primary-color-rgb, 30, 64, 175), 0.6)',
          borderColor: 'rgb(var(--primary-color-rgb, 30, 64, 175))',
          borderWidth: 1,
        },
      ],
    };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const from = this.dateFrom.toISOString().substring(0, 10);
    const to = this.dateTo.toISOString().substring(0, 10);
    this.service.loadSalesReport(from, to);
  }
}
