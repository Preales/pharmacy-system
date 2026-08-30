import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
    TranslateModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>{{ 'inventory.movements.title' | translate }}</h2>
        <small *ngIf="productName" class="text-secondary">{{ productName }}</small>
      </div>
      <p-button [label]="'inventory.movements.backToStock' | translate" icon="pi pi-arrow-left" severity="secondary" [text]="true" routerLink="../stock" />
    </div>

    <div class="filter-bar" *ngIf="productId">
      <p-select
        [(ngModel)]="selectedType"
        [options]="typeOptions"
        optionLabel="label"
        optionValue="value"
        [placeholder]="'inventory.movements.allTypes' | translate"
        [showClear]="true"
        (ngModelChange)="applyFilter()"
        styleClass="filter-select"
      />
    </div>

    <div *ngIf="!productId" class="empty-state">
      <i class="pi pi-info-circle text-blue-400" style="font-size: 2rem"></i>
      <p>{{ 'inventory.movements.selectProduct' | translate }}</p>
    </div>

    <p-table
      *ngIf="productId"
      [value]="filteredMovements()"
      [loading]="inventoryService.movementsLoading()"
      [lazy]="true"
      [paginator]="true"
      [rows]="pageSize"
      [totalRecords]="inventoryService.movements().totalCount"
      (onPage)="onPage($event)"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="{first}–{last} of {totalRecords}"
      [rowsPerPageOptions]="pageSizeOptions"
      styleClass="p-datatable-striped p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="timestamp">{{ 'inventory.movements.date' | translate }} <p-sortIcon field="timestamp" /></th>
          <th>{{ 'inventory.movements.type' | translate }}</th>
          <th style="text-align:right">{{ 'inventory.movements.quantity' | translate }}</th>
          <th>{{ 'inventory.movements.batchSupplier' | translate }}</th>
          <th>{{ 'inventory.movements.reason' | translate }}</th>
          <th>{{ 'inventory.movements.user' | translate }}</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-mov>
        <tr>
          <td>{{ mov.timestamp | date:'yyyy-MM-dd HH:mm' }}</td>
          <td>
            <p-tag
              [value]="mov.movementType"
              [severity]="getTypeSeverity(mov.movementType)"
            />
          </td>
          <td style="text-align:right" [class]="mov.quantity >= 0 ? 'qty-positive' : 'qty-negative'">
            {{ mov.quantity >= 0 ? '+' : '' }}{{ mov.quantity }}
          </td>
          <td>
            <span *ngIf="mov.batchNumber"><code>{{ mov.batchNumber }}</code></span>
            <span *ngIf="mov.supplierName" class="text-secondary"> · {{ mov.supplierName }}</span>
            <span *ngIf="!mov.batchNumber && !mov.supplierName" class="text-secondary">—</span>
          </td>
          <td>{{ mov.reason ?? '—' }}</td>
          <td>{{ mov.userEmail ?? mov.userId }}</td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr>
          <td colspan="6" class="text-center p-4">{{ 'inventory.movements.noMovements' | translate }}</td>
        </tr>
      </ng-template>
    </p-table>
  `,
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
export class MovementHistoryComponent implements OnInit, OnDestroy {
  readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private langSub?: Subscription;

  /** Exposed constants for template binding */
  readonly pageSizeOptions = Pagination.PageSizeOptions;

  productId: string | null = null;
  productName: string | null = null;
  selectedType: string | null = null;
  pageSize = 20;
  currentPage = 1;
  typeOptions: SelectOption[] = [];

  private buildTypeOptions(): void {
    this.typeOptions = [
      { label: this.translate.instant('inventory.movements.ingress'), value: 'Ingress' },
      { label: this.translate.instant('inventory.movements.sale'), value: 'Sale' },
      { label: this.translate.instant('inventory.movements.adjustment'), value: 'Adjustment' },
      { label: this.translate.instant('inventory.movements.loss'), value: 'Loss' },
    ];
  }

  ngOnInit(): void {
    this.buildTypeOptions();
    this.langSub = this.translate.onLangChange.subscribe(() => this.buildTypeOptions());
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

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
