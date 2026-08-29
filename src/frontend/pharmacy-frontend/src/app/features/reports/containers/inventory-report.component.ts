import { Component, OnInit, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';
import { LowStockProduct } from '../models/report.model';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, CardModule, TableModule, TagModule, ButtonModule, ProgressSpinnerModule, RouterLink],
  template: `
    @if (service.loading()) {
      <div class="flex justify-center p-8">
        <p-progress-spinner />
      </div>
    } @else if (report()) {
      <div class="p-4 flex flex-col gap-4">
        <!-- Summary cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.inventoryReport.totalProducts' | translate }}</p>
              <p class="text-3xl font-bold text-primary m-0">{{ report()!.totalProducts }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.inventoryReport.lowStock' | translate }}</p>
              <p class="text-3xl font-bold text-orange-500 m-0">{{ report()!.lowStockProducts }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.inventoryReport.zeroStock' | translate }}</p>
              <p class="text-3xl font-bold text-red-500 m-0">{{ report()!.zeroStockProducts }}</p>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <p class="text-surface-500 text-sm m-0">{{ 'reports.inventoryReport.totalStockValue' | translate }}</p>
              <p class="text-2xl font-bold text-green-500 m-0">
                {{ report()!.totalStockValue | number:'1.2-2' }}
              </p>
            </div>
          </p-card>
        </div>

        <!-- Low/zero stock products table -->
        <p-card [header]="'reports.inventoryReport.tableTitle' | translate">
          <p-table
            [value]="report()!.lowStockItems"
            [paginator]="true"
            [rows]="20"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'reports.inventoryReport.product' | translate }}</th>
                <th>{{ 'reports.inventoryReport.sku' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.currentStock' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.threshold' | translate }}</th>
                <th class="text-right">{{ 'reports.inventoryReport.costPrice' | translate }}</th>
                <th>{{ 'reports.inventoryReport.status' | translate }}</th>
                <th></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.productName }}</td>
                <td><code>{{ item.sku }}</code></td>
                <td class="text-right font-bold" [class.text-red-500]="item.currentStock <= 0" [class.text-orange-500]="item.currentStock > 0 && item.currentStock <= item.lowStockThreshold">
                  {{ item.currentStock }}
                </td>
                <td class="text-right">{{ item.lowStockThreshold }}</td>
                <td class="text-right">{{ item.costPrice | number:'1.2-2' }}</td>
                <td>
                  @if (item.currentStock <= 0) {
                    <p-tag severity="danger" [value]="'reports.inventoryReport.tagZeroStock' | translate" />
                  } @else {
                    <p-tag severity="warn" [value]="'reports.inventoryReport.tagLowStock' | translate" />
                  }
                </td>
                <td>
                  <a routerLink="/inventory">
                    <p-button icon="pi pi-arrow-right" size="small" severity="secondary" [text]="true" />
                  </a>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center text-surface-400 p-4">{{ 'reports.inventoryReport.allHealthy' | translate }}</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    } @else {
      <div class="p-8 text-center text-surface-400">{{ 'reports.inventoryReport.noData' | translate }}</div>
    }
  `,
})
export class InventoryReportComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly report = computed(() => this.service.inventoryReport());

  ngOnInit(): void {
    this.service.loadInventoryReport();
  }
}
