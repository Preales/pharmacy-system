import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class AppComponent implements OnInit {
  title = 'Pharmacy Management System';
  private readonly translateService = inject(TranslateService);

  ngOnInit(): void {
    // Resolve language: localStorage → navigator.language → 'en'
    const persisted = localStorage.getItem('pharmacy-lang');
    const browserLang = navigator.language?.split('-')[0];
    const supported = ['en', 'es'];

    const lang =
      (persisted && supported.includes(persisted) ? persisted : null) ??
      (browserLang && supported.includes(browserLang) ? browserLang : null) ??
      'en';

    this.translateService.use(lang);
  }
}
