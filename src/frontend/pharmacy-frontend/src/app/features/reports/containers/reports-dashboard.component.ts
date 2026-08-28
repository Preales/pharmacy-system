import { Component, OnInit, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportsService } from '../services/reports.service';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [DecimalPipe, CardModule, ChartModule, TableModule, ProgressSpinnerModule, RouterLink],
  templateUrl: './reports-dashboard.component.html',
})
export class ReportsDashboardComponent implements OnInit {
  protected readonly service = inject(ReportsService);
  protected readonly dashboard = computed(() => this.service.dashboard());

  ngOnInit(): void {
    this.service.loadDashboard();
  }
}
