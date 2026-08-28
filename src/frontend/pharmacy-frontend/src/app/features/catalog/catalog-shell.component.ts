import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-catalog-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './catalog-shell.component.html',
})
export class CatalogShellComponent {}
