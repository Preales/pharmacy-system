import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    CardModule,
    ChartModule,
    TableModule,
    DatePickerModule,
    ButtonModule,
    ProgressSpinnerModule,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4">
      <!-- Date range filter -->
      <p-card [header]="'reports.salesReport.title' | translate">
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

      @if (service.loading()) {
        <div class="flex justify-center p-8">
          <p-progress-spinner />
        </div>
      } @else if (report()) {
        <!-- Summary totals -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.salesReport.totalSales' | translate }}</p>
              <p class="text-3xl font-bold text-primary m-0">{{ report()!.totalSales }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.salesReport.totalRevenue' | translate }}</p>
              <p class="text-3xl font-bold text-green-500 m-0">{{ report()!.totalRevenue | number:'1.2-2' }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.salesReport.averageTicket' | translate }}</p>
              <p class="text-3xl font-bold text-blue-500 m-0">{{ report()!.averageTicket | number:'1.2-2' }}</p>
            </div>
          </p-card>
        </div>

        <!-- Daily sales chart -->
        <p-card [header]="'reports.salesReport.dailySales' | translate">
          @if (chartData()) {
            <p-chart type="bar" [data]="chartData()!" [options]="chartOptions" height="300px" />
          }
        </p-card>

        <!-- Top products -->
        <p-card [header]="'reports.salesReport.topProducts' | translate">
          <p-table [value]="report()!.topProducts" styleClass="p-datatable-sm">
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
                <td class="text-right">{{ p.totalRevenue | number:'1.2-2' }}</td>
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
})
export class SalesReportComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly report = computed(() => this.service.salesReport());

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
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
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
