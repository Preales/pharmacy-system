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
  templateUrl: './low-stock.component.html',
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
