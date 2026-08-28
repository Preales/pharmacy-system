import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { CardModule } from 'primeng/card';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-reports-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenuModule, CardModule],
  templateUrl: './reports-shell.component.html',
})
export class ReportsShellComponent {}
