import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { AppRoles } from '../../core/constants/app.constants';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [AppRoles.Admin] },
    loadComponent: () =>
      import('./containers/user-list.component').then((m) => m.UserListComponent),
  },
];
