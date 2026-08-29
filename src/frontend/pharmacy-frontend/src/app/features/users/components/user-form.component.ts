import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { UserModel, CreateUserRequest, UpdateUserRequest, ChangeRoleRequest } from '../models/user.model';
import { UserService } from '../services/user.service';
import { AppRoles } from '../../../core/constants/app.constants';

interface RoleOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
  ],
  template: `
    <p-dialog
      [header]="dialogHeader"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      (onHide)="onCancel()"
    >
      <!-- Create / Edit form -->
      @if (!changeRoleTarget) {
        <form [formGroup]="userForm" (ngSubmit)="submit()" class="form-body">
          <div class="field">
            <label for="firstName">First Name *</label>
            <input
              id="firstName"
              pInputText
              formControlName="firstName"
              placeholder="e.g. Jane"
              class="w-full"
              [class.ng-invalid]="isInvalid('firstName')"
            />
            @if (isInvalid('firstName')) {
              <small class="p-error">First name is required.</small>
            }
          </div>

          <div class="field">
            <label for="lastName">Last Name *</label>
            <input
              id="lastName"
              pInputText
              formControlName="lastName"
              placeholder="e.g. Doe"
              class="w-full"
              [class.ng-invalid]="isInvalid('lastName')"
            />
            @if (isInvalid('lastName')) {
              <small class="p-error">Last name is required.</small>
            }
          </div>

          <!-- Email — create only -->
          @if (!editTarget) {
            <div class="field">
              <label for="email">Email *</label>
              <input
                id="email"
                pInputText
                formControlName="email"
                placeholder="user@example.com"
                class="w-full"
                type="email"
                [class.ng-invalid]="isInvalid('email')"
              />
              @if (isInvalid('email')) {
                <small class="p-error">A valid email is required.</small>
              }
            </div>

            <div class="field">
              <label for="password">Password *</label>
              <p-password
                id="password"
                formControlName="password"
                placeholder="Minimum 8 characters"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                [class.ng-invalid]="isInvalid('password')"
              />
              @if (isInvalid('password')) {
                <small class="p-error">Password is required (min 8 characters).</small>
              }
            </div>
          }

          <div class="field">
            <label for="role">Role *</label>
            <p-select
              id="role"
              formControlName="role"
              [options]="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select role"
              styleClass="w-full"
              [class.ng-invalid]="isInvalid('role')"
            />
            @if (isInvalid('role')) {
              <small class="p-error">Role is required.</small>
            }
          </div>
        </form>
      }

      <!-- Change Role form -->
      @if (changeRoleTarget) {
        <form [formGroup]="roleForm" (ngSubmit)="submitRoleChange()" class="form-body">
          <p class="change-role-info">
            Change role for <strong>{{ changeRoleTarget.fullName }}</strong>
            (current: <em>{{ changeRoleTarget.role }}</em>).
          </p>
          <div class="field">
            <label for="newRole">New Role *</label>
            <p-select
              id="newRole"
              formControlName="newRole"
              [options]="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select new role"
              styleClass="w-full"
              [class.ng-invalid]="isRoleFormInvalid('newRole')"
            />
            @if (isRoleFormInvalid('newRole')) {
              <small class="p-error">Role is required.</small>
            }
          </div>
        </form>
      }

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button
          [label]="editTarget ? 'Update' : (changeRoleTarget ? 'Change Role' : 'Create')"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
          (onClick)="changeRoleTarget ? submitRoleChange() : submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-weight: 500; font-size: 0.875rem; }
    .change-role-info { margin: 0; color: var(--text-color-secondary); font-size: 0.875rem; }
  `,
})
export class UserFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() editTarget: UserModel | null = null;
  @Input() changeRoleTarget: UserModel | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly saving = signal(false);

  readonly roleOptions: RoleOption[] = [
    { label: 'Admin', value: AppRoles.Admin },
    { label: 'Pharmacist', value: AppRoles.Pharmacist },
    { label: 'Cashier', value: AppRoles.Cashier },
  ];

  readonly userForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['', Validators.required],
  });

  readonly roleForm = this.fb.group({
    newRole: ['', Validators.required],
  });

  get dialogHeader(): string {
    if (this.changeRoleTarget) return 'Change User Role';
    return this.editTarget ? 'Edit User' : 'New User';
  }

  ngOnChanges(): void {
    if (this.changeRoleTarget) {
      this.roleForm.reset({ newRole: this.changeRoleTarget.role });
      return;
    }

    if (this.editTarget) {
      // Email and password are not editable
      this.userForm.get('email')?.disable();
      this.userForm.get('password')?.disable();
      this.userForm.patchValue({
        firstName: this.editTarget.firstName,
        lastName: this.editTarget.lastName,
        role: this.editTarget.role,
      });
    } else {
      this.userForm.get('email')?.enable();
      this.userForm.get('password')?.enable();
      this.userForm.reset({ firstName: '', lastName: '', email: '', password: '', role: '' });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.userForm.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  isRoleFormInvalid(field: string): boolean {
    const ctrl = this.roleForm.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
    this.resetForms();
  }

  submit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.userForm.getRawValue();

    if (this.editTarget) {
      const request: UpdateUserRequest = {
        firstName: raw.firstName!,
        lastName: raw.lastName!,
      };
      this.userService.update(this.editTarget.id, request).subscribe({
        next: () => this.onSuccess(),
        error: () => this.saving.set(false),
      });
    } else {
      const request: CreateUserRequest = {
        firstName: raw.firstName!,
        lastName: raw.lastName!,
        email: raw.email!,
        password: raw.password!,
        role: raw.role!,
      };
      this.userService.create(request).subscribe({
        next: () => this.onSuccess(),
        error: () => this.saving.set(false),
      });
    }
  }

  submitRoleChange(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const { newRole } = this.roleForm.getRawValue();
    const request: ChangeRoleRequest = { newRole: newRole! };

    this.userService.changeRole(this.changeRoleTarget!.id, request).subscribe({
      next: () => this.onSuccess(),
      error: () => this.saving.set(false),
    });
  }

  private onSuccess(): void {
    this.saving.set(false);
    this.saved.emit();
    this.visibleChange.emit(false);
    this.resetForms();
  }

  private resetForms(): void {
    this.userForm.reset({ firstName: '', lastName: '', email: '', password: '', role: '' });
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.enable();
    this.roleForm.reset({ newRole: '' });
  }
}
