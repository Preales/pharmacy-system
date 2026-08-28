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
  templateUrl: './category-list.component.html',
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
