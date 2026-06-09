import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="app-shell">
      <router-outlet />
    </main>
  `,
  styles: `
    .app-shell {
      min-height: 100vh;
      padding: 1rem;
    }
  `,
})
export class AppComponent {
  title = 'Pharmacy Management System';
}
