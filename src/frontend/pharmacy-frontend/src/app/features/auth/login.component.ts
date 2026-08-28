import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TenantSummaryDto } from '../../core/models/auth.model';

type LoginState = 'idle' | 'resolvingTenant' | 'tenantPicker' | 'awaitingPassword' | 'submitting';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
    RadioButtonModule,
  ],
  templateUrl: './login.component.html',
  styles: `
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--surface-ground);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
    }
    .login-subtitle {
      color: var(--text-color-secondary);
      margin-bottom: 1.5rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    label {
      font-weight: 500;
      font-size: 0.875rem;
    }
    .picker-label {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin: 0;
    }
    .tenant-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .tenant-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid var(--surface-border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .tenant-option:hover {
      background-color: var(--surface-hover);
    }
    .tenant-label {
      display: flex;
      flex-direction: column;
      cursor: pointer;
      font-weight: normal;
    }
    .tenant-name {
      font-weight: 500;
      font-size: 0.9rem;
    }
    .tenant-slug {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }
    .resolved-email {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      padding: 0.5rem 0.75rem;
      background: var(--surface-50);
      border-radius: var(--border-radius);
    }
    .change-email-btn {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--primary-color);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
      text-decoration: underline;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly state = signal<LoginState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly tenants = signal<TenantSummaryDto[]>([]);
  selectedTenantId: string | null = null;

  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly passwordForm = this.fb.group({
    password: ['', Validators.required],
  });

  isEmailInvalid(): boolean {
    const control = this.emailForm.get('email');
    return !!(control?.invalid && control.touched);
  }

  isPasswordInvalid(): boolean {
    const control = this.passwordForm.get('password');
    return !!(control?.invalid && control.touched);
  }

  resolveEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.state.set('resolvingTenant');
    this.errorMessage.set(null);

    const email = this.emailForm.value.email!;

    this.authService.getTenantsByEmail(email).subscribe({
      next: (found) => {
        if (found.length === 0) {
          this.errorMessage.set('No account found for this email address.');
          this.state.set('idle');
        } else if (found.length === 1) {
          this.authService.setPendingTenantId(found[0].id);
          this.state.set('awaitingPassword');
        } else {
          this.tenants.set(found);
          this.selectedTenantId = null;
          this.state.set('tenantPicker');
        }
      },
      error: () => {
        this.errorMessage.set('Unable to resolve tenant. Please try again.');
        this.state.set('idle');
      },
    });
  }

  selectTenant(tenant: TenantSummaryDto): void {
    this.selectedTenantId = tenant.id;
  }

  confirmTenant(): void {
    if (!this.selectedTenantId) return;
    this.authService.setPendingTenantId(this.selectedTenantId);
    this.state.set('awaitingPassword');
  }

  goBack(): void {
    this.errorMessage.set(null);
    this.passwordForm.reset();
    this.authService.setPendingTenantId(null);

    if (this.state() === 'tenantPicker' || this.state() === 'awaitingPassword') {
      // If we came from tenantPicker, go back to it; otherwise go to idle
      if (this.tenants().length > 1 && this.state() === 'awaitingPassword') {
        this.state.set('tenantPicker');
      } else {
        this.tenants.set([]);
        this.selectedTenantId = null;
        this.state.set('idle');
      }
    } else {
      this.state.set('idle');
    }
  }

  submit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.state.set('submitting');
    this.errorMessage.set(null);

    const email = this.emailForm.value.email!;
    const password = this.passwordForm.value.password!;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.authService.setPendingTenantId(null);
        this.state.set('idle');
        this.router.navigate(['/catalog']);
      },
      error: (err: { userMessage?: string }) => {
        this.state.set('awaitingPassword');
        this.errorMessage.set(err.userMessage ?? 'Login failed. Please check your credentials.');
      },
    });
  }
}
