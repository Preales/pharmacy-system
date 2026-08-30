import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CardModule, ButtonModule, RouterLink, TranslatePipe],
  template: `
    <div class="flex justify-center items-center min-h-screen bg-surface-100">
      <p-card styleClass="w-full max-w-md text-center p-6">
        <div class="flex flex-col align-items-center gap-4">
          <i class="pi pi-lock text-red-500" style="font-size: 4rem;"></i>
          <h1 class="text-3xl font-bold text-surface-900 m-0">{{ 'core.unauthorized.title' | translate }}</h1>
          <p class="text-surface-600 m-0">
            {{ 'core.unauthorized.message' | translate }}
          </p>
          <div class="flex gap-2 mt-2">
            <a routerLink="/catalog">
              <p-button [label]="'core.unauthorized.goToCatalog' | translate" icon="pi pi-home" severity="secondary" />
            </a>
            <a routerLink="/sales/pos">
              <p-button [label]="'core.unauthorized.goToPos' | translate" icon="pi pi-shopping-cart" />
            </a>
          </div>
        </div>
      </p-card>
    </div>
  `,
})
export class UnauthorizedComponent {}
