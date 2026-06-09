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
  templateUrl: './product-form.component.html',
  styles: `
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field-checkbox { display: flex; align-items: center; gap: 0.5rem; }
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
