import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CardModule, ButtonModule, RouterLink],
  templateUrl: './unauthorized.component.html',
})
export class UnauthorizedComponent {}
