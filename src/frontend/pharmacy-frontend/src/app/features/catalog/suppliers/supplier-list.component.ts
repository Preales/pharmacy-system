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
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
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
    TranslatePipe,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2>{{ 'catalog.suppliers.title' | translate }}</h2>
      <p-button [label]="'catalog.suppliers.add' | translate" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="search-bar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input pInputText [(ngModel)]="searchTerm" [placeholder]="'common.search' | translate" class="w-full" />
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
          <th pSortableColumn="name">{{ 'catalog.suppliers.name' | translate }} <p-sortIcon field="name" /></th>
          <th>Contact</th>
          <th>{{ 'catalog.suppliers.email' | translate }}</th>
          <th>{{ 'catalog.suppliers.phone' | translate }}</th>
          <th pSortableColumn="isActive">{{ 'common.status' | translate }} <p-sortIcon field="isActive" /></th>
          <th style="width: 120px">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-sup>
        <tr>
          <td>{{ sup.name }}</td>
          <td>{{ sup.contactName ?? '—' }}</td>
          <td>{{ sup.contactEmail ?? '—' }}</td>
          <td>{{ sup.phone ?? '—' }}</td>
          <td>
            <p-tag
              [value]="sup.isActive ? ('common.active' | translate) : ('common.inactive' | translate)"
              [severity]="sup.isActive ? 'success' : 'danger'"
            />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openEdit(sup)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(sup)" />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr><td colspan="6" class="text-center p-4">{{ 'common.noResults' | translate }}</td></tr>
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
  private readonly translate = inject(TranslateService);

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
    this.messageService.add({ severity: 'success', summary: this.translate.instant('catalog.suppliers.saved'), detail: this.translate.instant('catalog.suppliers.saved') });
  }

  confirmDelete(sup: Supplier): void {
    this.confirmService.confirm({
      message: this.translate.instant('catalog.suppliers.deleteConfirm'),
      header: this.translate.instant('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.supplierService.delete(sup.id).subscribe({
          next: () =>
            this.messageService.add({ severity: 'success', summary: this.translate.instant('catalog.suppliers.deleted'), detail: this.translate.instant('catalog.suppliers.deleted') }),
          error: (err: { userMessage?: string }) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.userMessage ?? this.translate.instant('catalog.suppliers.deleted'),
            }),
        });
      },
    });
  }
}
