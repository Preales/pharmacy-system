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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { Product, CreateProductRequest, UpdateProductRequest, ProductUnit } from '../models/product.model';
import { Category } from '../models/category.model';
import { Supplier } from '../models/supplier.model';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { SupplierService } from '../services/supplier.service';

interface SelectOption {
  label: string;
  value: string;
}

const UNIT_OPTIONS: SelectOption[] = [
  { label: 'Unit', value: 'Unit' },
  { label: 'Box', value: 'Box' },
  { label: 'Blister', value: 'Blister' },
  { label: 'Bottle', value: 'Bottle' },
];

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    TextareaModule,
  ],
  template: `
    <p-dialog
      [header]="editTarget ? 'Edit Product' : 'New Product'"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '580px' }"
      [draggable]="false"
      (onHide)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-body">
        <div class="form-row">
          <div class="field">
            <label for="pName">Name *</label>
            <input id="pName" pInputText formControlName="name" placeholder="Product name" class="w-full" [class.ng-invalid]="isInvalid('name')" />
            @if (isInvalid('name')) { <small class="p-error">Name is required.</small> }
          </div>
          <div class="field">
            <label for="pSku">SKU *</label>
            <input id="pSku" pInputText formControlName="sku" placeholder="MED-001" class="w-full" [class.ng-invalid]="isInvalid('sku')" [readonly]="!!editTarget" />
            @if (isInvalid('sku')) { <small class="p-error">SKU is required.</small> }
          </div>
        </div>

        <div class="field">
          <label for="pDesc">Description</label>
          <textarea id="pDesc" pTextarea formControlName="description" rows="2" class="w-full" placeholder="Optional description"></textarea>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="pUnitPrice">Unit Price *</label>
            <p-inputNumber inputId="pUnitPrice" formControlName="unitPrice" [minFractionDigits]="2" [maxFractionDigits]="2" mode="currency" currency="USD" styleClass="w-full" />
            @if (isInvalid('unitPrice')) { <small class="p-error">Unit price is required.</small> }
          </div>
          <div class="field">
            <label for="pCostPrice">Cost Price *</label>
            <p-inputNumber inputId="pCostPrice" formControlName="costPrice" [minFractionDigits]="2" [maxFractionDigits]="2" mode="currency" currency="USD" styleClass="w-full" />
            @if (isInvalid('costPrice')) { <small class="p-error">Cost price is required.</small> }
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="pUnit">Unit *</label>
            <p-select inputId="pUnit" formControlName="unit" [options]="unitOptions" optionLabel="label" optionValue="value" placeholder="Select unit" styleClass="w-full" appendTo="body" />
            @if (isInvalid('unit')) { <small class="p-error">Unit is required.</small> }
          </div>
          <div class="field">
            <label for="pBarcode">Barcode</label>
            <input id="pBarcode" pInputText formControlName="barcode" placeholder="EAN-13" class="w-full" />
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="pCategory">Category *</label>
            <p-select inputId="pCategory" formControlName="categoryId" [options]="categoryOptions()" optionLabel="label" optionValue="value" placeholder="Select category" styleClass="w-full" [filter]="true" appendTo="body" />
            @if (isInvalid('categoryId')) { <small class="p-error">Category is required.</small> }
          </div>
          <div class="field">
            <label for="pSupplier">Supplier</label>
            <p-select inputId="pSupplier" formControlName="supplierId" [options]="supplierOptions()" optionLabel="label" optionValue="value" placeholder="None" styleClass="w-full" [showClear]="true" [filter]="true" appendTo="body" />
          </div>
        </div>

        @if (editTarget) {
          <div class="field-checkbox">
            <p-checkbox formControlName="isActive" [binary]="true" inputId="pActive" />
            <label for="pActive">Active</label>
          </div>
        }
      </form>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button
          [label]="editTarget ? 'Update' : 'Create'"
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
    .field-checkbox { display: flex; align-items: center; gap: 0.5rem; }
    label { font-weight: 500; font-size: 0.875rem; }
  `,
})
export class ProductFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() editTarget: Product | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly productService: ProductService = inject(ProductService);
  private readonly categoryService: CategoryService = inject(CategoryService);
  private readonly supplierService: SupplierService = inject(SupplierService);

  readonly saving = signal(false);
  readonly unitOptions = UNIT_OPTIONS;

  categoryOptions(): SelectOption[] {
    return this.categoryService.categories()
      .filter((c: Category) => c.isActive)
      .map((c: Category) => ({ label: c.name, value: c.id }));
  }

  supplierOptions(): SelectOption[] {
    return this.supplierService.suppliers()
      .filter((s: Supplier) => s.isActive)
      .map((s: Supplier) => ({ label: s.name, value: s.id }));
  }

  readonly form = this.fb.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    description: [''],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    unit: ['Unit' as ProductUnit, Validators.required],
    barcode: [''],
    categoryId: ['', Validators.required],
    supplierId: [null as string | null],
    isActive: [true],
  });

  ngOnInit(): void {
    if (this.categoryService.categories().length === 0) this.categoryService.loadAll();
    if (this.supplierService.suppliers().length === 0) this.supplierService.loadAll();
  }

  ngOnChanges(): void {
    if (this.editTarget) {
      this.form.patchValue({
        name: this.editTarget.name,
        sku: this.editTarget.sku,
        description: this.editTarget.description ?? '',
        unitPrice: this.editTarget.unitPrice,
        costPrice: this.editTarget.costPrice,
        unit: this.editTarget.unit,
        barcode: this.editTarget.barcode ?? '',
        categoryId: this.editTarget.categoryId,
        supplierId: this.editTarget.supplierId,
        isActive: this.editTarget.isActive,
      });
    } else {
      this.form.reset({
        name: '', sku: '', description: '', unitPrice: 0, costPrice: 0,
        unit: 'Unit', barcode: '', categoryId: '', supplierId: null, isActive: true,
      });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
    this.form.reset({ name: '', sku: '', description: '', unitPrice: 0, costPrice: 0, unit: 'Unit', barcode: '', categoryId: '', supplierId: null, isActive: true });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const v = this.form.getRawValue();

    const obs = this.editTarget
      ? this.productService.update(this.editTarget.id, {
          name: v.name!,
          description: v.description ?? null,
          unitPrice: v.unitPrice!,
          costPrice: v.costPrice!,
          unit: v.unit as ProductUnit,
          barcode: v.barcode ?? null,
          isActive: v.isActive!,
          categoryId: v.categoryId!,
          supplierId: v.supplierId ?? null,
        } as UpdateProductRequest)
      : this.productService.create({
          name: v.name!,
          sku: v.sku!,
          description: v.description ?? null,
          unitPrice: v.unitPrice!,
          costPrice: v.costPrice!,
          unit: v.unit as ProductUnit,
          barcode: v.barcode ?? null,
          categoryId: v.categoryId!,
          supplierId: v.supplierId ?? null,
        } as CreateProductRequest);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.visibleChange.emit(false);
        this.form.reset({ name: '', sku: '', description: '', unitPrice: 0, costPrice: 0, unit: 'Unit', barcode: '', categoryId: '', supplierId: null, isActive: true });
      },
      error: () => this.saving.set(false),
    });
  }
}
