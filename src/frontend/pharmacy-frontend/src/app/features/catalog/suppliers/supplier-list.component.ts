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
  templateUrl: './supplier-list.component.html',
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
