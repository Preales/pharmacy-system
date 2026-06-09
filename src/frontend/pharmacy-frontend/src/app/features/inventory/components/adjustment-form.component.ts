import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../../catalog/services/product.service';
import { Product } from '../../catalog/models/product.model';
import { CreateAdjustmentRequest } from '../models/inventory-request.models';

interface SelectOption { label: string; value: string; }

function minLength(min: number) {
  return (control: { value: string | null }) => {
    const v = control.value ?? '';
    return v.length >= min ? null : { minlength: { requiredLength: min, actualLength: v.length } };
  };
}

@Component({
  selector: 'app-adjustment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    TagModule,
  ],
  template: `
    <p-dialog
      header="Record Stock Adjustment"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      (onHide)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-body">

        <div class="field">
          <label for="aProduct">Product *</label>
          <p-select
            inputId="aProduct"
            formControlName="productId"
            [options]="productOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Select product"
            styleClass="w-full"
            [filter]="true"
            filterPlaceholder="Search products..."
            [class.ng-invalid]="isInvalid('productId')"
            (ngModelChange)="onProductChange($event)"
            appendTo="body"
          />
          @if (isInvalid('productId')) { <small class="p-error">Product is required.</small> }

          @if (currentStockDisplay()) {
            <small class="current-stock-hint">
              Current stock:
              <strong [class]="currentStockDisplay()!.isLow ? 'text-orange-500' : 'text-green-600'">
                {{ currentStockDisplay()!.stock }} units
              </strong>
            </small>
          }
        </div>

        <div class="field">
          <label for="aQty">New Quantity (signed) *</label>
          <p-inputNumber
            inputId="aQty"
            formControlName="quantity"
            styleClass="w-full"
            [class.ng-invalid]="isInvalid('quantity')"
          />
          <small class="text-secondary">Use a negative value to reduce stock (e.g. -5 for damaged goods).</small>
          @if (isInvalid('quantity')) { <small class="p-error">Quantity is required.</small> }
        </div>

        <div class="field">
          <label for="aReason">Reason *</label>
          <textarea
            id="aReason"
            pTextarea
            formControlName="reason"
            rows="3"
            class="w-full"
            placeholder="Describe the reason (min. 10 characters)..."
            [class.ng-invalid]="isInvalid('reason')"
          ></textarea>
          @if (isInvalid('reason')) {
            <small class="p-error">
              @if (form.get('reason')?.errors?.['required']) { Reason is required. }
              @else { Reason must be at least 10 characters. }
            </small>
          }
        </div>
      </form>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button
          label="Apply Adjustment"
          icon="pi pi-check"
          severity="warn"
          [loading]="saving()"
          [disabled]="form.invalid || saving()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 500; font-size: 0.875rem; }
    .current-stock-hint { color: var(--text-color-secondary); margin-top: 0.1rem; }
  `,
})
export class AdjustmentFormComponent implements OnInit {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);

  readonly saving = signal(false);

  readonly selectedProductId = signal<string | null>(null);

  readonly currentStockDisplay = computed(() => {
    const pid = this.selectedProductId();
    if (!pid) return null;
    const item = this.inventoryService.items().items.find((i) => i.productId === pid);
    if (!item) return null;
    return { stock: item.currentStock, isLow: item.isLowStock };
  });

  readonly form = this.fb.group({
    productId: ['', Validators.required],
    quantity: [0, Validators.required],
    reason: ['', [Validators.required, minLength(10)]],
  });

  ngOnInit(): void {
    if (this.productService.products().items.length === 0) {
      this.productService.loadPage({ pageNumber: 1, pageSize: 200 });
    }
    if (this.inventoryService.items().items.length === 0) {
      this.inventoryService.loadStock(1, 200);
    }
  }

  productOptions(): SelectOption[] {
    return this.productService.products().items
      .filter((p: Product) => p.isActive)
      .map((p: Product) => ({ label: `${p.name} (${p.sku})`, value: p.id }));
  }

  onProductChange(productId: string): void {
    this.selectedProductId.set(productId);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onCancel(): void {
    this.resetForm();
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const v = this.form.getRawValue();

    const request: CreateAdjustmentRequest = {
      productId: v.productId!,
      quantity: v.quantity!,
      reason: v.reason!,
    };

    this.inventoryService.createAdjustment(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.visibleChange.emit(false);
        this.resetForm();
      },
      error: () => this.saving.set(false),
    });
  }

  private resetForm(): void {
    this.selectedProductId.set(null);
    this.form.reset({ productId: '', quantity: 0, reason: '' });
  }
}
