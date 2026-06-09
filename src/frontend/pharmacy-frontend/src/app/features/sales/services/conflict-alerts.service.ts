import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ConflictAlert, ConflictAlertFilter } from '../models/conflict-alert.model';
import { PagedResult } from '../../../core/models/shared.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConflictAlertsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/conflict-alerts`;

  readonly alerts = signal<PagedResult<ConflictAlert>>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
    totalPages: 0,
  });

  readonly loading = signal(false);

  readonly unresolvedCount = computed(
    () => this.alerts().items.filter((a) => !a.isResolved).length
  );

  loadAlerts(filter: ConflictAlertFilter = { pageNumber: 1, pageSize: 20 }): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.isResolved !== undefined) {
      params = params.set('isResolved', filter.isResolved.toString());
    }

    this.http.get<PagedResult<ConflictAlert>>(this.baseUrl, { params }).subscribe({
      next: (data) => {
        this.alerts.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resolveAlert(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/resolve`, {}).pipe(
      tap(() => this.loadAlerts())
    );
  }
}
