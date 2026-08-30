import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { SalesService } from '../services/sales.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sale, SaleStatus, SaleFilter, VoidSaleRequest } from '../models/sale.model';
import { AppRoles, AppCurrency } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    DatePickerModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    TranslateModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './sales-history.component.html',
  styles: `
    .filters-bar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .expanded-lines { padding: 0.75rem 1rem; }
    .lines-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.875rem; }
    .lines-table th { text-align: left; padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--surface-border); font-weight: 600; }
    .lines-table td { padding: 0.3rem 0.5rem; }
    .form-field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 1rem; }
    .form-field label { font-size: 0.875rem; font-weight: 500; }
    .text-sm { font-size: 0.875rem; }
    .text-secondary { color: var(--text-color-secondary); }
  `,
})
export class SalesHistoryComponent implements OnInit {
  readonly salesService = inject(SalesService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  /** Exposed constants for template binding */
  readonly currencyCode = AppCurrency.COP;

  pageSize = 20;
  currentPage = 1;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  statusFilter: SaleStatus | null = null;
  expandedRows: Record<string, boolean> = {};

  voidDialogVisible = false;
  selectedSale: Sale | null = null;
  voidReason = '';

  readonly isAdmin = this.authService.currentUser
    ? () => (this.authService.currentUser()?.roles ?? []).includes(AppRoles.Admin)
    : () => false;

  get statusOptions() {
    return [
      { label: this.translate.instant('sales.history.completed'), value: 'Completed' },
      { label: this.translate.instant('sales.history.voided'), value: 'Voided' },
    ];
  }

  ngOnInit(): void {
    this.loadSales();
  }

  loadSales(): void {
    const filter: SaleFilter = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      dateFrom: this.dateFrom?.toISOString().split('T')[0],
      dateTo: this.dateTo?.toISOString().split('T')[0],
      status: this.statusFilter ?? undefined,
    };
    this.salesService.loadSales(filter);
  }

  onLazyLoad(event: { first?: number | null; rows?: number | null }): void {
    this.currentPage = Math.floor((event.first ?? 0) / (event.rows ?? this.pageSize)) + 1;
    this.loadSales();
  }

  clearFilters(): void {
    this.dateFrom = null;
    this.dateTo = null;
    this.statusFilter = null;
    this.currentPage = 1;
    this.loadSales();
  }

  toggleRow(sale: Sale): void {
    if (this.expandedRows[sale.id]) {
      delete this.expandedRows[sale.id];
    } else {
      this.expandedRows = { ...this.expandedRows, [sale.id]: true };
    }
  }

  openVoidDialog(sale: Sale): void {
    this.selectedSale = sale;
    this.voidReason = '';
    this.voidDialogVisible = true;
  }

  confirmVoid(): void {
    if (!this.selectedSale || !this.voidReason.trim()) return;
    const request: VoidSaleRequest = { reason: this.voidReason.trim() };
    this.salesService.voidSale(this.selectedSale.id, request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('sales.history.voidSuccess'),
          detail: this.translate.instant('sales.history.voidSuccessDetail'),
        });
        this.voidDialogVisible = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('sales.history.voidError'),
          detail: this.translate.instant('sales.history.voidErrorDetail'),
        });
      },
    });
  }

  getStatusSeverity(status: SaleStatus): 'success' | 'danger' | 'secondary' {
    if (status === 'Completed') return 'success';
    if (status === 'Voided') return 'danger';
    return 'secondary';
  }
}
