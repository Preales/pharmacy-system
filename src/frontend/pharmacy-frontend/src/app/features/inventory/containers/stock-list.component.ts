import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InventoryService } from '../services/inventory.service';
import { IngressFormComponent } from '../components/ingress-form.component';
import { AdjustmentFormComponent } from '../components/adjustment-form.component';
import { InventoryItem, StockStatus } from '../models/inventory-item.model';
import { Pagination } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TranslateModule,
    IngressFormComponent,
    AdjustmentFormComponent,
  ],
  providers: [MessageService],
  templateUrl: './stock-list.component.html',
  styles: `
    .header-actions { display: flex; gap: 0.5rem; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
    .filter-input { flex: 1; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--color-card); padding: 0.1rem 0.3rem; border-radius: 4px; }
    :host ::ng-deep .row-critical td { background: color-mix(in srgb, var(--color-destructive) 10%, transparent) !important; }
    :host ::ng-deep .row-low td { background: color-mix(in srgb, var(--color-accent) 10%, transparent) !important; }
  `,
})
export class StockListComponent implements OnInit {
  readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  /** Exposed constants for template binding */
  readonly pageSizeOptions = Pagination.PageSizeOptions;

  searchTerm = '';
  pageSize = 20;
  currentPage = 1;
  ingressVisible = false;
  adjustmentVisible = false;

  readonly preselectedProductId = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadStock();
  }

  private loadStock(): void {
    this.inventoryService.loadStock(this.currentPage, this.pageSize, this.searchTerm || undefined);
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadStock();
    }, 350);
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadStock();
  }

  onPage(event: { first: number; rows: number }): void {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.loadStock();
  }

  viewMovements(item: InventoryItem): void {
    this.router.navigate(['/inventory/movements'], {
      queryParams: { productId: item.productId, productName: item.productName },
    });
  }

  openIngress(): void {
    this.preselectedProductId.set(null);
    this.ingressVisible = true;
  }

  openIngressFor(item: InventoryItem): void {
    this.preselectedProductId.set(item.productId);
    this.ingressVisible = true;
  }

  openAdjustment(): void {
    this.adjustmentVisible = true;
  }

  getStatusLabel(status: StockStatus): string {
    const keyMap: Record<StockStatus, string> = {
      OK: 'inventory.stock.normal',
      Low: 'inventory.stock.low',
      Critical: 'inventory.stock.critical',
    };
    return this.translate.instant(keyMap[status] ?? status);
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' {
    if (status === 'Critical') return 'danger';
    if (status === 'Low') return 'warn';
    return 'success';
  }

  onIngressSaved(): void {
    this.preselectedProductId.set(null);
    this.loadStock();
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('inventory.stock.ingressRecorded'),
      detail: this.translate.instant('inventory.stock.stockUpdated'),
    });
  }

  onAdjustmentSaved(): void {
    this.loadStock();
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('inventory.stock.adjustmentApplied'),
      detail: this.translate.instant('inventory.stock.stockAdjusted'),
    });
  }
}
