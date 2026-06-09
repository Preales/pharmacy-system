import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../../catalog/services/product.service';
import { SupplierService } from '../../catalog/services/supplier.service';
import { Product } from '../../catalog/models/product.model';
import { Supplier } from '../../catalog/models/supplier.model';
import { RecordIngressRequest } from '../models/inventory-request.models';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-ingress-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
  ],
  template: `
    <p-dialog
      header="Record Stock Ingress"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '520px' }"
      [draggable]="false"
      (onHide)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-body">

        <div class="field">
          <label for="iProduct">Product *</label>
          <p-select
            inputId="iProduct"
            formControlName="productId"
            [options]="productOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Select product"
            styleClass="w-full"
            [filter]="true"
            filterPlaceholder="Search products..."
            [class.ng-invalid]="isInvalid('productId')"
            appendTo="body"
          />
          @if (isInvalid('productId')) { <small class="p-error">Product is required.</small> }
        </div>

        <div class="form-row">
          <div class="field">
            <label for="iQty">Quantity *</label>
            <p-inputNumber
              inputId="iQty"
              formControlName="quantity"
              [min]="1"
              styleClass="w-full"
              [class.ng-invalid]="isInvalid('quantity')"
            />
            @if (isInvalid('quantity')) { <small class="p-error">Quantity must be at least 1.</small> }
          </div>
          <div class="field">
            <label for="iCost">Unit Cost *</label>
            <p-inputNumber
              inputId="iCost"
              formControlName="unitCost"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              mode="currency"
              currency="COP"
              styleClass="w-full"
              [class.ng-invalid]="isInvalid('unitCost')"
            />
            @if (isInvalid('unitCost')) { <small class="p-error">Unit cost is required.</small> }
          </div>
        </div>

        <div class="field">
          <label for="iSupplier">Supplier</label>
          <p-select
            inputId="iSupplier"
            formControlName="supplierId"
            [options]="supplierOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="None (optional)"
            styleClass="w-full"
            [showClear]="true"
            [filter]="true"
            appendTo="body"
          />
        </div>

        <div class="field">
          <label for="iBatch">Batch Number</label>
          <input id="iBatch" pInputText formControlName="batchNumber" placeholder="e.g. LOT-2026-001" class="w-full" />
        </div>

        <div class="field">
          <label for="iNotes">Notes</label>
          <textarea id="iNotes" pTextarea formControlName="reason" rows="2" class="w-full" placeholder="Optional notes"></textarea>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button
          label="Record Ingress"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="form.invalid || saving()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 500; font-size: 0.875rem; }
  `,
})
export class IngressFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() preselectedProductId: string | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly supplierService = inject(SupplierService);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    supplierId: [null as string | null],
    batchNumber: [''],
    reason: [''],
  });

  ngOnInit(): void {
    if (this.productService.products().items.length === 0) {
      this.productService.loadPage({ pageNumber: 1, pageSize: 200 });
    }
    if (this.supplierService.suppliers().length === 0) {
      this.supplierService.loadAll();
    }
  }

  ngOnChanges(): void {
    if (this.preselectedProductId && this.visible) {
      this.form.patchValue({ productId: this.preselectedProductId });
    }
  }

  productOptions(): SelectOption[] {
    return this.productService.products().items
      .filter((p: Product) => p.isActive)
      .map((p: Product) => ({ label: `${p.name} (${p.sku})`, value: p.id }));
  }

  supplierOptions(): SelectOption[] {
    return this.supplierService.suppliers()
      .filter((s: Supplier) => s.isActive)
      .map((s: Supplier) => ({ label: s.name, value: s.id }));
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

    const request: RecordIngressRequest = {
      productId: v.productId!,
      quantity: v.quantity!,
      unitCost: v.unitCost!,
      supplierId: v.supplierId ?? null,
      batchNumber: v.batchNumber || null,
      reason: v.reason || null,
    };

    this.inventoryService.recordIngress(request).subscribe({
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
    this.form.reset({ productId: '', quantity: 1, unitCost: 0, supplierId: null, batchNumber: '', reason: '' });
  }
}
