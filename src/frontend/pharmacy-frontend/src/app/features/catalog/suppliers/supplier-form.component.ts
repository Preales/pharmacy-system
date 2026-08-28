import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../models/supplier.model';
import { SupplierService } from '../services/supplier.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
  ],
  templateUrl: './supplier-form.component.html',
  styles: `
    .form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .field-checkbox { display: flex; align-items: center; gap: 0.5rem; }
    label { font-weight: 500; font-size: 0.875rem; }
  `,
})
export class SupplierFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() editTarget: Supplier | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly supplierService: SupplierService = inject(SupplierService);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    contactName: [''],
    contactEmail: ['', Validators.email],
    phone: [''],
    isActive: [true],
  });

  ngOnChanges(): void {
    if (this.editTarget) {
      this.form.patchValue({
        name: this.editTarget.name,
        contactName: this.editTarget.contactName ?? '',
        contactEmail: this.editTarget.contactEmail ?? '',
        phone: this.editTarget.phone ?? '',
        isActive: this.editTarget.isActive,
      });
    } else {
      this.form.reset({ name: '', contactName: '', contactEmail: '', phone: '', isActive: true });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
    this.form.reset({ name: '', contactName: '', contactEmail: '', phone: '', isActive: true });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const { name, contactName, contactEmail, phone, isActive } = this.form.getRawValue();

    const obs = this.editTarget
      ? this.supplierService.update(this.editTarget.id, {
          name: name!,
          contactName: contactName ?? null,
          contactEmail: contactEmail ?? null,
          phone: phone ?? null,
          isActive: isActive!,
        } as UpdateSupplierRequest)
      : this.supplierService.create({
          name: name!,
          contactName: contactName ?? null,
          contactEmail: contactEmail ?? null,
          phone: phone ?? null,
        } as CreateSupplierRequest);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.visibleChange.emit(false);
        this.form.reset({ name: '', contactName: '', contactEmail: '', phone: '', isActive: true });
      },
      error: () => this.saving.set(false),
    });
  }
}
