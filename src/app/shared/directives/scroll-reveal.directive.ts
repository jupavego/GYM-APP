import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

// Revela el elemento (fade + slide-up) la primera vez que entra al viewport
// al hacer scroll. Respeta prefers-reduced-motion. Un solo disparo: no
// vuelve a ocultarse si el usuario sube de nuevo.
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0; // ms — para escalonar tarjetas en grilla

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const host = this.el.nativeElement;
    host.classList.add('scroll-reveal');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      host.classList.add('scroll-reveal--visible');
      return;
    }

    if (this.revealDelay) {
      host.style.transitionDelay = `${this.revealDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            host.classList.add('scroll-reveal--visible');
            this.observer?.unobserve(host);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
