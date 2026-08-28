import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { InventoryService } from '../services/inventory.service';
import { MovementType } from '../models/inventory-item.model';
import { Pagination } from '../../../core/constants/app.constants';

interface SelectOption { label: string; value: string | null; }

@Component({
  selector: 'app-movement-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    CalendarModule,
  ],
  templateUrl: './movement-history.component.html',
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.1rem; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
    .filter-select { min-width: 160px; }
    .qty-positive { color: var(--green-600); font-weight: 600; }
    .qty-negative { color: var(--red-500); font-weight: 600; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem 0; color: var(--text-color-secondary); }
    .empty-state a { color: var(--primary-color); }
  `,
})
export class MovementHistoryComponent implements OnInit {
  readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);

  /** Exposed constants for template binding — cast to any[] to satisfy PrimeNG rowsPerPageOptions typing (NG4) */
  readonly pageSizeOptions: any[] = Pagination.PageSizeOptions as unknown as any[];

  productId: string | null = null;
  productName: string | null = null;
  selectedType: string | null = null;
  pageSize = 20;
  currentPage = 1;

  readonly typeOptions: SelectOption[] = [
    { label: 'Ingress', value: 'Ingress' },
    { label: 'Sale', value: 'Sale' },
    { label: 'Adjustment', value: 'Adjustment' },
    { label: 'Loss', value: 'Loss' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.productId = params.get('productId');
      this.productName = params.get('productName');
      if (this.productId) {
        this.inventoryService.loadMovements(this.productId, 1, this.pageSize);
      }
    });
  }

  filteredMovements() {
    const items = this.inventoryService.movements().items;
    if (!this.selectedType) return items;
    return items.filter((m) => m.movementType === this.selectedType);
  }

  applyFilter(): void {
    // server-side filtering by type would be ideal; client-side filter applied here
    // for a full implementation a `type` query param would be sent to the API
  }

  onPage(event: { first: number; rows: number }): void {
    if (!this.productId) return;
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.inventoryService.loadMovements(this.productId, this.currentPage, this.pageSize);
  }

  getTypeSeverity(type: MovementType): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (type) {
      case 'Ingress': return 'success';
      case 'Sale': return 'info';
      case 'Adjustment': return 'warn';
      case 'Loss': return 'danger';
      default: return 'secondary';
    }
  }
}
