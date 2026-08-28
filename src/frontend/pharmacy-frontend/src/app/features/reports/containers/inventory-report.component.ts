import { Component, OnInit, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  imports: [DecimalPipe, CardModule, TableModule, TagModule, ButtonModule, ProgressSpinnerModule, RouterLink],
  templateUrl: './inventory-report.component.html',
})
export class InventoryReportComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly report = computed(() => this.service.inventoryReport());

  ngOnInit(): void {
    this.service.loadInventoryReport();
  }
}
