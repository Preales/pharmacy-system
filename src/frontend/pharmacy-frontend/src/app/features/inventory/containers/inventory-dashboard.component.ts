import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InventoryService } from '../services/inventory.service';
import { IngressFormComponent } from '../components/ingress-form.component';
import { AdjustmentFormComponent } from '../components/adjustment-form.component';
import { StockStatus } from '../models/inventory-item.model';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    IngressFormComponent,
    AdjustmentFormComponent,
  ],
  providers: [MessageService],
  templateUrl: './inventory-dashboard.component.html',
  styles: `
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card { border-radius: 8px; }
    .summary-content { display: flex; align-items: center; gap: 1rem; }
    .summary-icon { font-size: 2rem; }
    .summary-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .summary-value { font-size: 1.75rem; font-weight: 700; line-height: 1; }
    .actions-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .section-header { margin-bottom: 0.5rem; }
    .section-header h3 { margin: 0 0 0.15rem; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
  `,
})
export class InventoryDashboardComponent implements OnInit {
  readonly inventoryService = inject(InventoryService);
  private readonly messageService = inject(MessageService);

  ingressVisible = false;
  adjustmentVisible = false;
  preselectedProductId: string | null = null;
  readonly todayMovements = 0; // populated from movements API in a future slice

  ngOnInit(): void {
    this.inventoryService.loadStock();
    this.inventoryService.loadLowStock();
  }

  openIngressFor(productId: string): void {
    this.preselectedProductId = productId;
    this.ingressVisible = true;
  }

  getStatusLabel(status: StockStatus): string {
    const labels: Record<StockStatus, string> = {
      OK: 'OK',
      Low: 'Low',
      Critical: 'Critical',
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' {
    if (status === 'Critical') return 'danger';
    if (status === 'Low') return 'warn';
    return 'success';
  }

  onIngressSaved(): void {
    this.preselectedProductId = null;
    this.inventoryService.loadLowStock();
    this.messageService.add({ severity: 'success', summary: 'Ingress Recorded', detail: 'Stock updated successfully.' });
  }

  onAdjustmentSaved(): void {
    this.inventoryService.loadLowStock();
    this.messageService.add({ severity: 'success', summary: 'Adjustment Applied', detail: 'Stock adjusted successfully.' });
  }
}
