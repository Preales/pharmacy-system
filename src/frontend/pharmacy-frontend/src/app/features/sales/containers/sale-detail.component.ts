import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SalesService } from '../services/sales.service';
import { AuthService } from '../../../core/services/auth.service';
import { SaleStatus, VoidSaleRequest } from '../models/sale.model';
import { AppRoles, AppCurrency } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-sale-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TagModule,
    TableModule,
    ToastModule,
    DialogModule,
    InputTextModule,
  ],
  providers: [MessageService],
  templateUrl: './sale-detail.component.html',
  styles: `
    .sale-detail { max-width: 700px; margin: 0 auto; }
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .header-actions { display: flex; gap: 0.5rem; }
    .receipt-content {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1.5rem;
    }
    .receipt-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .receipt-title h2 { margin: 0; }
    .receipt-meta { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .meta-row { display: flex; gap: 1rem; }
    .meta-label { font-size: 0.875rem; color: var(--text-color-secondary); min-width: 120px; }
    .meta-value { font-size: 0.875rem; font-weight: 500; }
    .receipt-divider { border-top: 1px dashed var(--surface-border); margin: 1rem 0; }
    .receipt-total { display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; font-weight: 700; margin-top: 0.5rem; }
    .total-value { font-size: 1.5rem; color: var(--primary-color); }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .loading-state { text-align: center; padding: 3rem; color: var(--text-color-secondary); }
    .text-sm { font-size: 0.875rem; }
    .text-secondary { color: var(--text-color-secondary); }
    .form-field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 1rem; }
    .form-field label { font-size: 0.875rem; font-weight: 500; }
    @media print {
      .no-print { display: none !important; }
      .receipt-content { border: none; padding: 0; }
    }
  `,
})
export class SaleDetailComponent implements OnInit {
  readonly salesService = inject(SalesService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  /** Exposed constants for template binding */
  readonly currencyCode = AppCurrency.COP;

  voidDialogVisible = false;
  voidReason = '';

  readonly isAdmin = () => (this.authService.currentUser()?.roles ?? []).includes(AppRoles.Admin);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.salesService.getSaleById(id);
  }

  printReceipt(): void {
    window.print();
  }

  confirmVoid(): void {
    const sale = this.salesService.currentSale();
    if (!sale || !this.voidReason.trim()) return;
    const request: VoidSaleRequest = { reason: this.voidReason.trim() };
    this.salesService.voidSale(sale.id, request).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Voided', detail: 'Sale has been voided.' });
        this.voidDialogVisible = false;
        this.salesService.getSaleById(sale.id);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not void sale.' });
      },
    });
  }

  getStatusSeverity(status: SaleStatus): 'success' | 'danger' | 'secondary' {
    if (status === 'Completed') return 'success';
    if (status === 'Voided') return 'danger';
    return 'secondary';
  }
}
