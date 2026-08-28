import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  path: string;
  icon: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { path: '/catalog',   icon: 'pi-box',          label: 'Catalog'   },
  { path: '/inventory', icon: 'pi-warehouse',     label: 'Inventory' },
  { path: '/sales',     icon: 'pi-shopping-cart', label: 'Sales'     },
  { path: '/reports',   icon: 'pi-chart-bar',     label: 'Reports'   },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);

  readonly navLinks: NavLink[] = NAV_LINKS;
  readonly currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.logout();
  }
}
