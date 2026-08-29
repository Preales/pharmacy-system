import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Product } from '../../catalog/models/product.model';
import { PagedResult } from '../../../core/models/shared.models';
import { CartService } from '../services/cart.service';
import { SalesService } from '../services/sales.service';
import { OfflineService } from '../../../core/offline/offline.service';
import { CreateSaleRequest } from '../models/sale.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    TableModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './pos.component.html',
  styles: `
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--orange-100, #fff3cd);
      border: 1px solid var(--orange-300);
      border-radius: 6px;
      padding: 0.625rem 1rem;
      margin-bottom: 1rem;
      color: var(--orange-700, #856404);
      font-size: 0.9rem;
    }
    .pos-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.25rem;
      height: calc(100vh - 120px);
    }
    .product-panel {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow: hidden;
    }
    .search-bar { flex-shrink: 0; }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.75rem;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .product-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.875rem;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .product-card:hover { background: var(--brand-primary-subtle); border-color: var(--color-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .product-card.out-of-stock { opacity: 0.5; cursor: not-allowed; }
    .product-name { font-weight: 600; font-size: 0.9rem; line-height: 1.2; }
    .product-sku { font-size: 0.75rem; color: var(--text-color-secondary); }
    .product-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
    .product-price { font-weight: 700; color: var(--color-primary); font-size: 1rem; }
    .stock-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 12px; background: var(--green-50); color: var(--green-700); }
    .stock-badge.low { background: var(--orange-50); color: var(--orange-700); }
    .stock-badge.empty { background: var(--red-50); color: var(--red-700); }
    .empty-products {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-color-secondary);
    }
    .cart-panel {
      display: flex;
      flex-direction: column;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .cart-header h3 { margin: 0; font-size: 1.1rem; }
    .item-count { font-size: 0.8rem; color: var(--text-color-secondary); }
    .customer-field {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .customer-field label { font-size: 0.8rem; color: var(--text-color-secondary); }
    .cart-items { flex: 1; overflow-y: auto; padding: 0.5rem; }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .cart-item:last-child { border-bottom: none; }
    .cart-item-info { flex: 1; min-width: 0; }
    .cart-item-name { font-size: 0.875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cart-item-price { font-size: 0.75rem; color: var(--text-color-secondary); }
    .cart-item-controls { display: flex; align-items: center; gap: 0.15rem; }
    .qty-display { font-weight: 600; min-width: 1.5rem; text-align: center; font-size: 0.9rem; }
    .cart-item-subtotal { font-weight: 600; font-size: 0.875rem; min-width: 4rem; text-align: right; }
    .empty-cart { text-align: center; padding: 2rem 1rem; color: var(--text-color-secondary); }
    .empty-cart i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .cart-footer {
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .cart-total { display: flex; justify-content: space-between; align-items: center; font-size: 1rem; margin-bottom: 0.25rem; }
    .total-amount { font-size: 1.5rem; font-weight: 700; color: var(--color-primary); }
    .mt-2 { margin-top: 0.5rem; }
  `,
})
export class PosComponent implements OnInit {
  readonly cartService = inject(CartService);
  readonly offlineService = inject(OfflineService);
  private readonly salesService = inject(SalesService);
  private readonly messageService = inject(MessageService);
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${environment.apiBaseUrl}/products`;

  private readonly _products = signal<Product[]>([]);
  searchTerm = '';
  customerName = '';
  private readonly _submitting = signal(false);
  readonly submitting = this._submitting.asReadonly();

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this._products();
    return this._products().filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    const params = new HttpParams()
      .set('pageNumber', '1')
      .set('pageSize', '100')
      .set('isActive', 'true');

    this.http.get<PagedResult<Product>>(this.productsUrl, { params }).subscribe({
      next: (data) => this._products.set(data.items),
      error: () => {},
    });
  }

  onSearch(): void {
    // filteredProducts computed signal handles filtering reactively
  }

  addToCart(product: Product): void {
    if (product.stockQuantity <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Out of Stock',
        detail: `${product.name} is out of stock.`,
      });
      return;
    }
    this.cartService.addItem(product);
  }

  increaseQty(productId: string): void {
    const item = this.cartService.items().find((i) => i.product.id === productId);
    if (item) this.cartService.updateQuantity(productId, item.quantity + 1);
  }

  decreaseQty(productId: string): void {
    const item = this.cartService.items().find((i) => i.product.id === productId);
    if (item) this.cartService.updateQuantity(productId, item.quantity - 1);
  }

  clearCart(): void {
    this.cartService.clear();
    this.customerName = '';
  }

  async completeSale(): Promise<void> {
    if (this.cartService.items().length === 0) return;
    this._submitting.set(true);

    const request: CreateSaleRequest = {
      customerId: undefined,
      lines: this.cartService.items().map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    try {
      const result = await this.salesService.createSale(request);

      if (result) {
        // Online: subscribe to the Observable
        result.subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Sale Completed',
              detail: 'Sale processed successfully.',
            });
            this.cartService.clear();
            this.customerName = '';
            this._submitting.set(false);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Sale Failed',
              detail: 'Could not process sale. Please try again.',
            });
            this._submitting.set(false);
          },
        });
      } else {
        // Offline: queued
        this.messageService.add({
          severity: 'info',
          summary: 'Sale Queued',
          detail: 'You are offline. Sale will sync when connection restores.',
          life: 6000,
        });
        this.cartService.clear();
        this.customerName = '';
        this._submitting.set(false);
      }
    } catch {
      this._submitting.set(false);
    }
  }
}
