import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DashboardReport, InventoryReport, SalesReport } from '../models/report.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  readonly dashboard = signal<DashboardReport | null>(null);
  readonly salesReport = signal<SalesReport | null>(null);
  readonly inventoryReport = signal<InventoryReport | null>(null);
  readonly loading = signal(false);

  loadDashboard(): void {
    this.loading.set(true);
    this.http.get<DashboardReport>(`${this.baseUrl}/dashboard`).subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadSalesReport(dateFrom?: string, dateTo?: string): void {
    this.loading.set(true);
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);

    this.http.get<SalesReport>(`${this.baseUrl}/sales`, { params }).subscribe({
      next: (data) => {
        this.salesReport.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadInventoryReport(): void {
    this.loading.set(true);
    this.http.get<InventoryReport>(`${this.baseUrl}/inventory`).subscribe({
      next: (data) => {
        this.inventoryReport.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
