import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { OfflineService } from '../offline/offline.service';

@Component({
  selector: 'app-sync-status-bar',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ButtonModule, BadgeModule, TagModule],
  template: `
    <div class="sync-status-bar" [class.offline]="!offlineService.isOnline()">
      <div class="status-indicator">
        <i
          class="pi"
          [class.pi-wifi]="offlineService.isOnline()"
          [class.pi-wifi-off]="!offlineService.isOnline()"
          [class.text-green-500]="offlineService.isOnline()"
          [class.text-orange-500]="!offlineService.isOnline()"
        ></i>
        <span class="status-label">
          {{ offlineService.isOnline() ? ('core.sync.online' | translate) : ('core.sync.offline' | translate) }}
        </span>
      </div>

      @if (offlineService.pendingCount() > 0) {
        <div class="pending-badge">
          <i class="pi pi-clock text-orange-500"></i>
          <span>{{ offlineService.pendingCount() }} {{ 'core.sync.pending' | translate }}</span>
        </div>
        <p-button
          [label]="'core.sync.syncNow' | translate"
          icon="pi pi-refresh"
          size="small"
          severity="warn"
          [outlined]="true"
          (onClick)="syncNow()"
        />
      }
    </div>
  `,
  styles: `
    .sync-status-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.375rem 0.75rem;
      background: var(--surface-card);
      border-radius: 6px;
      border: 1px solid var(--surface-border);
      font-size: 0.875rem;
    }
    .sync-status-bar.offline {
      border-color: var(--orange-300);
      background: var(--orange-50, #fff8f0);
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 500;
    }
    .pending-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--orange-600);
    }
  `,
})
export class SyncStatusBarComponent {
  readonly offlineService = inject(OfflineService);

  syncNow(): void {
    this.offlineService.syncPending();
  }
}
