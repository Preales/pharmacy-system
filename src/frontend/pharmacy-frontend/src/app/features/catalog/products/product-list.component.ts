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
  templateUrl: './product-list.component.html',
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

  /** Exposed constants for template binding — cast to any[] to satisfy PrimeNG rowsPerPageOptions typing (NG4) */
  readonly pageSizeOptions: any[] = Pagination.PageSizeOptions as unknown as any[];
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
