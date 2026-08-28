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
import { AppCurrency } from '../../../core/constants/app.constants';
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
  templateUrl: './ingress-form.component.html',
  styles: `
    .form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 500; font-size: 0.875rem; }
  `,
})
export class IngressFormComponent implements OnInit, OnChanges {
  readonly currencyCode = AppCurrency.COP;
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
