import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.model';
import { CategoryService } from '../services/category.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
  ],
  template: `
    <p-dialog
      [header]="editTarget ? 'Edit Category' : 'New Category'"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      (onHide)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-body">
        <div class="field">
          <label for="catName">Name *</label>
          <input
            id="catName"
            pInputText
            formControlName="name"
            placeholder="e.g. Analgesics"
            class="w-full"
            [class.ng-invalid]="isInvalid('name')"
          />
          @if (isInvalid('name')) {
            <small class="p-error">Name is required.</small>
          }
        </div>

        <div class="field">
          <label for="catDesc">Description</label>
          <textarea
            id="catDesc"
            pTextarea
            formControlName="description"
            placeholder="Optional description"
            class="w-full"
            rows="3"
          ></textarea>
        </div>

        @if (editTarget) {
          <div class="field-checkbox">
            <p-checkbox formControlName="isActive" [binary]="true" inputId="catActive" />
            <label for="catActive">Active</label>
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
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .field-checkbox { display: flex; align-items: center; gap: 0.5rem; }
    label { font-weight: 500; font-size: 0.875rem; }
  `,
})
export class CategoryFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() editTarget: Category | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly categoryService: CategoryService = inject(CategoryService);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    isActive: [true],
  });

  ngOnChanges(): void {
    if (this.editTarget) {
      this.form.patchValue({
        name: this.editTarget.name,
        description: this.editTarget.description ?? '',
        isActive: this.editTarget.isActive,
      });
    } else {
      this.form.reset({ name: '', description: '', isActive: true });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
    this.form.reset({ name: '', description: '', isActive: true });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const { name, description, isActive } = this.form.getRawValue();

    const obs = this.editTarget
      ? this.categoryService.update(this.editTarget.id, {
          name: name!,
          description: description ?? null,
          parentCategoryId: this.editTarget.parentCategoryId,
          isActive: isActive!,
        } as UpdateCategoryRequest)
      : this.categoryService.create({
          name: name!,
          description: description ?? null,
          parentCategoryId: null,
        } as CreateCategoryRequest);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.visibleChange.emit(false);
        this.form.reset({ name: '', description: '', isActive: true });
      },
      error: () => this.saving.set(false),
    });
  }
}
