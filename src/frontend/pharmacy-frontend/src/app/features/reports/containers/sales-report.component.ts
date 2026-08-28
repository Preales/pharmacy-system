import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    CardModule,
    ChartModule,
    TableModule,
    DatePickerModule,
    ButtonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './sales-report.component.html',
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
