import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../../catalog/models/product.model';
import { CartItem } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  private readonly _customerName = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly customerName = this._customerName.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.subtotal, 0)
  );

  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  addItem(product: Product, quantity = 1): void {
    const existing = this._items().find((i) => i.product.id === product.id);
    if (existing) {
      this.updateQuantity(product.id, existing.quantity + quantity);
    } else {
      this._items.update((items) => [
        ...items,
        {
          product,
          quantity,
          unitPrice: product.unitPrice,
          subtotal: product.unitPrice * quantity,
        },
      ]);
    }
  }

  removeItem(productId: string): void {
    this._items.update((items) => items.filter((i) => i.product.id !== productId));
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._items.update((items) =>
      items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity, subtotal: i.unitPrice * quantity }
          : i
      )
    );
  }

  setCustomerName(name: string | null): void {
    this._customerName.set(name);
  }

  clear(): void {
    this._items.set([]);
    this._customerName.set(null);
  }
}
