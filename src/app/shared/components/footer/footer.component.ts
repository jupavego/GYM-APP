import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SITE } from '../../../data/site.data';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private router = inject(Router);

  readonly year = new Date().getFullYear();
  readonly site = SITE;

  irASeccion(event: Event, id: string): void {
    event.preventDefault();
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      scroll();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scroll, 100));
    }
  }
}
