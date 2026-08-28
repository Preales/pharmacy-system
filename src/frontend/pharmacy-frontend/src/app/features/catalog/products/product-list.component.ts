import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Product, ProductFilter } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { SupplierService } from '../services/supplier.service';
import { ProductFormComponent } from './product-form.component';
import { AppCurrency, LowStockThreshold, Pagination } from '../../../core/constants/app.constants';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectModule,
    ConfirmDialogModule,
    ToastModule,
    ProductFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2>Products</h2>
      <p-button label="New Product" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="filter-bar">
      <input pInputText [(ngModel)]="searchTerm" placeholder="Search by name, SKU..." (ngModelChange)="onSearchChange()" class="filter-input" />
      <p-select
        [(ngModel)]="selectedCategory"
        [options]="categoryOptions()"
        optionLabel="label"
        optionValue="value"
        placeholder="All Categories"
        [showClear]="true"
        (ngModelChange)="applyFilter()"
        styleClass="filter-select"
      />
      <p-button icon="pi pi-refresh" severity="secondary" [text]="true" (onClick)="resetFilters()" pTooltip="Clear filters" />
    </div>

    <p-table
      [value]="productService.products().items"
      [loading]="productService.loading()"
      [lazy]="true"
      [paginator]="true"
      [rows]="pageSize"
      [totalRecords]="productService.products().totalCount"
      (onPage)="onPage($event)"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="{first}–{last} of {totalRecords}"
      [rowsPerPageOptions]="pageSizeOptions"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th>Category</th>
          <th>Unit Price</th>
          <th>Cost Price</th>
          <th>Unit</th>
          <th>Stock</th>
          <th pSortableColumn="isActive">Status <p-sortIcon field="isActive" /></th>
          <th style="width: 120px">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-product>
        <tr>
          <td><code>{{ product.sku }}</code></td>
          <td>{{ product.name }}</td>
          <td>{{ product.categoryName }}</td>
          <td>{{ product.unitPrice | currency:currencyCode:'symbol':'1.0-0' }}</td>
          <td>{{ product.costPrice | currency:currencyCode:'symbol':'1.0-0' }}</td>
          <td>{{ product.unit }}</td>
          <td>
            <span [class]="product.stockQuantity < lowStockThreshold ? 'stock-low' : 'stock-ok'">
              {{ product.stockQuantity }}
            </span>
          </td>
          <td>
            <p-tag [value]="product.isActive ? 'Active' : 'Inactive'" [severity]="product.isActive ? 'success' : 'danger'" />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openEdit(product)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(product)" />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr><td colspan="9" class="text-center p-4">No products found.</td></tr>
      </ng-template>
    </p-table>

    <app-product-form
      [(visible)]="formVisible"
      [editTarget]="editTarget()"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
    .filter-input { flex: 1; }
    .filter-select { min-width: 200px; }
    code { font-family: monospace; font-size: 0.85rem; background: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .stock-low { color: var(--red-500); font-weight: 600; }
    .stock-ok { color: var(--green-600); }
  `,
})
export class ProductListComponent implements OnInit {
  readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly supplierService = inject(SupplierService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  /** Exposed constants for template binding */
  readonly pageSizeOptions = Pagination.PageSizeOptions;
  readonly currencyCode = AppCurrency.COP;
  readonly lowStockThreshold = LowStockThreshold;

  formVisible = false;
  searchTerm = '';
  selectedCategory: string | null = null;
  pageSize = 20;
  currentPage = 1;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly editTarget = signal<Product | null>(null);

  readonly categoryOptions = (): SelectOption[] => [
    ...this.categoryService.categories()
      .filter((c: Category) => c.isActive)
      .map((c: Category) => ({ label: c.name, value: c.id })),
  ];

  ngOnInit(): void {
    this.categoryService.loadAll();
    this.supplierService.loadAll();
    this.loadProducts();
  }

  private loadProducts(): void {
    const filter: ProductFilter = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchTerm || undefined,
      categoryId: this.selectedCategory ?? undefined,
    };
    this.productService.loadPage(filter);
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadProducts();
    }, 350);
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.currentPage = 1;
    this.loadProducts();
  }

  onPage(event: { first: number; rows: number }): void {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.loadProducts();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.formVisible = true;
  }

  openEdit(product: Product): void {
    this.editTarget.set(product);
    this.formVisible = true;
  }

  onSaved(): void {
    this.loadProducts();
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Product saved successfully.' });
  }

  confirmDelete(product: Product): void {
    this.confirmService.confirm({
      message: `Delete product "${product.name}" (${product.sku})?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productService.delete(product.id).subscribe({
          next: () => {
            this.loadProducts();
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Product deleted.' });
          },
          error: (err: { userMessage?: string }) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.userMessage ?? 'Could not delete product.',
            }),
        });
      },
    });
  }
}
