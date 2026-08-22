import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { UserWidgetComponent } from '../user-widget/user-widget.component';
import { SITE } from '../../../data/site.data';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UserWidgetComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly session = inject(SessionService);
  private  router  = inject(Router);

  readonly siteName = SITE.name;

  menuAbierto = signal(false);
  hidden      = signal(false);

  private lastScrollY  = 0;
  private scrollUpFrom = 0; // punto desde donde empezó a subir

  @HostListener('window:scroll')
  onScroll(): void {
    const currentY  = window.scrollY;
    const topZone   = 72;   // siempre visible en la zona superior
    const showDelta = 60;   // cuántos px hacia arriba antes de mostrarse

    if (currentY < topZone) {
      this.hidden.set(false);
      this.scrollUpFrom = 0;
    } else if (currentY > this.lastScrollY) {
      this.hidden.set(true);
      this.menuAbierto.set(false);
      this.scrollUpFrom = currentY;
    } else if (this.scrollUpFrom - currentY >= showDelta) {
      this.hidden.set(false);
    }

    this.lastScrollY = currentY;
  }

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  // Navega a una sección anclada del home. Si no estamos en el home,
  // navega ahí primero y luego hace scroll una vez cargado.
  irASeccion(event: Event, id: string): void {
    event.preventDefault();
    this.cerrarMenu();

    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      scroll();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scroll, 100));
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.topbar')) {
      this.cerrarMenu();
    }
  }
}
