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
import { UserModel } from '../models/user.model';
import { UserService } from '../services/user.service';
import { UserFormComponent } from '../components/user-form.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles, Pagination } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-user-list',
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
    UserFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2>Users</h2>
      @if (isAdmin()) {
        <p-button label="Add User" icon="pi pi-plus" (onClick)="openCreate()" />
      }
    </div>

    <p-table
      [value]="userService.users().items"
      [loading]="userService.loading()"
      [lazy]="true"
      [paginator]="true"
      [rows]="pageSize"
      [totalRecords]="userService.users().totalCount"
      (onPage)="onPage($event)"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="{first}–{last} of {totalRecords}"
      [rowsPerPageOptions]="pageSizeOptions"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="firstName">Name <p-sortIcon field="firstName" /></th>
          <th>Email</th>
          <th>Role</th>
          <th pSortableColumn="isActive">Status <p-sortIcon field="isActive" /></th>
          <th style="width: 140px">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-user>
        <tr>
          <td>{{ user.fullName }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>
            <p-tag
              [value]="user.isActive ? 'Active' : 'Inactive'"
              [severity]="user.isActive ? 'success' : 'danger'"
            />
          </td>
          <td>
            @if (isAdmin()) {
              <p-button
                icon="pi pi-pencil"
                [rounded]="true"
                [text]="true"
                severity="info"
                pTooltip="Edit"
                (onClick)="openEdit(user)"
              />
              <p-button
                icon="pi pi-user-edit"
                [rounded]="true"
                [text]="true"
                severity="warn"
                pTooltip="Change Role"
                (onClick)="openChangeRole(user)"
              />
              @if (user.isActive) {
                <p-button
                  icon="pi pi-ban"
                  [rounded]="true"
                  [text]="true"
                  severity="danger"
                  pTooltip="Deactivate"
                  (onClick)="confirmDeactivate(user)"
                />
              }
            }
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="empty">
        <tr><td colspan="5" class="text-center p-4">No users found.</td></tr>
      </ng-template>
    </p-table>

    <app-user-form
      [(visible)]="formVisible"
      [editTarget]="editTarget()"
      [changeRoleTarget]="changeRoleTarget()"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  `,
})
export class UserListComponent implements OnInit {
  readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly pageSizeOptions = Pagination.PageSizeOptions;

  formVisible = false;
  pageSize = Pagination.DefaultPageSize;
  currentPage = 1;

  readonly editTarget = signal<UserModel | null>(null);
  readonly changeRoleTarget = signal<UserModel | null>(null);

  isAdmin(): boolean {
    return this.authService.hasRole(AppRoles.Admin);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.loadAll(this.currentPage, this.pageSize);
  }

  onPage(event: { first: number; rows: number }): void {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.loadUsers();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.changeRoleTarget.set(null);
    this.formVisible = true;
  }

  openEdit(user: UserModel): void {
    this.editTarget.set(user);
    this.changeRoleTarget.set(null);
    this.formVisible = true;
  }

  openChangeRole(user: UserModel): void {
    this.changeRoleTarget.set(user);
    this.editTarget.set(null);
    this.formVisible = true;
  }

  onSaved(): void {
    this.loadUsers();
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'User saved successfully.' });
  }

  confirmDeactivate(user: UserModel): void {
    this.confirmService.confirm({
      message: `Deactivate user "${user.fullName}" (${user.email})?`,
      header: 'Confirm Deactivate',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.userService.deactivate(user.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deactivated', detail: `${user.fullName} has been deactivated.` });
          },
          error: (err: { userMessage?: string }) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.userMessage ?? 'Could not deactivate user.',
            }),
        });
      },
    });
  }
}
