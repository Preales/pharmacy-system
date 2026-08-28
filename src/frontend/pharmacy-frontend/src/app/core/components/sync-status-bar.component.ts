import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { OfflineService } from '../offline/offline.service';

@Component({
  selector: 'app-sync-status-bar',
  standalone: true,
  imports: [CommonModule, ButtonModule, BadgeModule, TagModule],
  templateUrl: './sync-status-bar.component.html',
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
