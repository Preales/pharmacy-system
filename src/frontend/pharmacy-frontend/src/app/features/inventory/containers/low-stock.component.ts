import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InventoryService } from '../services/inventory.service';
import { IngressFormComponent } from '../components/ingress-form.component';
import { InventoryItem } from '../models/inventory-item.model';

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    IngressFormComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <div>
        <h2>Low Stock Alerts</h2>
        <small class="text-secondary">{{ inventoryService.lowStockItems().length }} product(s) require attention</small>
      </div>
      <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" [text]="true" (onClick)="refresh()" />
    </div>

    <p-table
      [value]="inventoryService.lowStockItems()"
      [loading]="inventoryService.loading()"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="productName">Product <p-sortIcon field="productName" /></th>
          <th>SKU</th>
          <th>Category</th>
          <th style="text-align:right" pSortableColumn="currentStock">
            Current Stock <p-sortIcon field="currentStock" />
          </th>
          <th style="text-align:right">Threshold</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-item>
        <tr>
          <td>{{ item.productName }}</td>
          <td><code>{{ item.sku }}</code></td>
          <td>{{ item.categoryName }}</td>
          <td style="text-align:right" [class]="item.currentStock <= 0 ? 'text-red-600 font-bold' : 'text-orange-500 font-semibold'">
            {{ item.currentStock }}
          </td>
          <td style="text-align:right" class="text-secondary">{{ item.lowStockThreshold }}</td>
          <td>
            <p-tag
              [value]="item.currentStock <= 0 ? 'Critical' : 'Low'"
              [severity]="item.currentStock <= 0 ? 'danger' : 'warn'"
            />
          </td>
          <td>
            <p-button
              icon="pi pi-arrow-down"
              [rounded]="true"
              [text]="true"
              severity="success"
              pTooltip="Record Ingress"
              (onClick)="openIngress(item)"
            />
            <p-button
              icon="pi pi-list"
              [rounded]="true"
              [text]="true"
              severity="info"
              pTooltip="View Movements"
              (onClick)="viewMovements(item)"
            />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr>
          <td colspan="7" class="text-center p-4">
            <i class="pi pi-check-circle text-green-500" style="font-size: 1.5rem"></i>
            <p>All products are adequately stocked.</p>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <app-ingress-form
      [(visible)]="ingressVisible"
      [preselectedProductId]="preselectedProductId"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.1rem; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
  `,
})
export class LowStockComponent implements OnInit {
  readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  ingressVisible = false;
  preselectedProductId: string | null = null;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.inventoryService.loadLowStock();
  }

  openIngress(item: InventoryItem): void {
    this.preselectedProductId = item.productId;
    this.ingressVisible = true;
  }

  viewMovements(item: InventoryItem): void {
    this.router.navigate(['/inventory/movements'], {
      queryParams: { productId: item.productId, productName: item.productName },
    });
  }

  onSaved(): void {
    this.preselectedProductId = null;
    this.inventoryService.loadLowStock();
    this.messageService.add({ severity: 'success', summary: 'Ingress Recorded', detail: 'Stock updated successfully.' });
  }
}
