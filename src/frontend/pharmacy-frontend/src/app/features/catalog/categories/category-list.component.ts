import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Category } from '../models/category.model';
import { CategoryService } from '../services/category.service';
import { CategoryFormComponent } from './category-form.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    CategoryFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2>Categories</h2>
      <p-button label="New Category" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="search-bar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input
          pInputText
          [(ngModel)]="searchTerm"
          placeholder="Search categories..."
          class="w-full"
        />
      </span>
    </div>

    <p-table
      [value]="filtered()"
      [loading]="categoryService.loading()"
      [paginator]="true"
      [rows]="10"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="{first}–{last} of {totalRecords}"
      [rowsPerPageOptions]="[10, 25, 50]"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
          <th>Description</th>
          <th pSortableColumn="isActive">Status <p-sortIcon field="isActive" /></th>
          <th style="width: 120px">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-cat>
        <tr>
          <td>{{ cat.name }}</td>
          <td>{{ cat.description ?? '—' }}</td>
          <td>
            <p-tag
              [value]="cat.isActive ? 'Active' : 'Inactive'"
              [severity]="cat.isActive ? 'success' : 'danger'"
            />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openEdit(cat)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(cat)" />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr><td colspan="4" class="text-center p-4">No categories found.</td></tr>
      </ng-template>
    </p-table>

    <app-category-form
      [(visible)]="formVisible"
      [editTarget]="editTarget()"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .search-bar { margin-bottom: 1rem; }
  `,
})
export class CategoryListComponent implements OnInit {
  readonly categoryService = inject(CategoryService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  formVisible = false;
  searchTerm = '';
  readonly editTarget = signal<Category | null>(null);

  filtered(): Category[] {
    const term = this.searchTerm.toLowerCase();
    return term
      ? this.categoryService.categories().filter((c) => c.name.toLowerCase().includes(term))
      : this.categoryService.categories();
  }

  ngOnInit(): void {
    this.categoryService.loadAll();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.formVisible = true;
  }

  openEdit(cat: Category): void {
    this.editTarget.set(cat);
    this.formVisible = true;
  }

  onSaved(): void {
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Category saved successfully.' });
  }

  confirmDelete(cat: Category): void {
    this.confirmService.confirm({
      message: `Delete category "${cat.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.categoryService.delete(cat.id).subscribe({
          next: () =>
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Category deleted.' }),
          error: (err: { userMessage?: string }) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.userMessage ?? 'Could not delete category.',
            }),
        });
      },
    });
  }
}
