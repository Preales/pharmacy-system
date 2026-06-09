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
import { Supplier } from '../models/supplier.model';
import { SupplierService } from '../services/supplier.service';
import { SupplierFormComponent } from './supplier-form.component';

@Component({
  selector: 'app-supplier-list',
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
    SupplierFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2>Suppliers</h2>
      <p-button label="New Supplier" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="search-bar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input pInputText [(ngModel)]="searchTerm" placeholder="Search suppliers..." class="w-full" />
      </span>
    </div>

    <p-table
      [value]="filtered()"
      [loading]="supplierService.loading()"
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
          <th>Contact</th>
          <th>Email</th>
          <th>Phone</th>
          <th pSortableColumn="isActive">Status <p-sortIcon field="isActive" /></th>
          <th style="width: 120px">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-sup>
        <tr>
          <td>{{ sup.name }}</td>
          <td>{{ sup.contactName ?? '—' }}</td>
          <td>{{ sup.contactEmail ?? '—' }}</td>
          <td>{{ sup.phone ?? '—' }}</td>
          <td>
            <p-tag [value]="sup.isActive ? 'Active' : 'Inactive'" [severity]="sup.isActive ? 'success' : 'danger'" />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openEdit(sup)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(sup)" />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr><td colspan="6" class="text-center p-4">No suppliers found.</td></tr>
      </ng-template>
    </p-table>

    <app-supplier-form
      [(visible)]="formVisible"
      [editTarget]="editTarget()"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .search-bar { margin-bottom: 1rem; }
  `,
})
export class SupplierListComponent implements OnInit {
  readonly supplierService = inject(SupplierService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  formVisible = false;
  searchTerm = '';
  readonly editTarget = signal<Supplier | null>(null);

  filtered(): Supplier[] {
    const term = this.searchTerm.toLowerCase();
    return term
      ? this.supplierService.suppliers().filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.contactEmail ?? '').toLowerCase().includes(term)
        )
      : this.supplierService.suppliers();
  }

  ngOnInit(): void {
    this.supplierService.loadAll();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.formVisible = true;
  }

  openEdit(sup: Supplier): void {
    this.editTarget.set(sup);
    this.formVisible = true;
  }

  onSaved(): void {
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Supplier saved successfully.' });
  }

  confirmDelete(sup: Supplier): void {
    this.confirmService.confirm({
      message: `Delete supplier "${sup.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.supplierService.delete(sup.id).subscribe({
          next: () =>
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Supplier deleted.' }),
          error: (err: { userMessage?: string }) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.userMessage ?? 'Could not delete supplier.',
            }),
        });
      },
    });
  }
}
