import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SITE } from '../../../data/site.data';
import { MEMBERSHIP_PLANS } from '../../../core/models/membership.model';

export interface GymService {
  icon: 'dumbbell' | 'users' | 'flame' | 'leaf';
  title: string;
  description: string;
}

export interface StatItem {
  value: string;
  label: string;
}

const SERVICES: GymService[] = [
  { icon: 'dumbbell', title: 'Entrenamiento personalizado', description: 'Rutinas diseñadas por instructores certificados según tu objetivo y nivel.' },
  { icon: 'users',     title: 'Clases grupales',            description: 'Sesiones de alta energía: funcional, spinning, yoga y más, todos los días.' },
  { icon: 'flame',     title: 'Musculación',                description: 'Zona de pesas y máquinas de última generación, siempre disponible.' },
  { icon: 'leaf',      title: 'Nutrición y bienestar',       description: 'Acompañamiento nutricional para que tus resultados se sostengan.' },
];

const STATS: StatItem[] = [
  { value: '10+',  label: 'Años de experiencia' },
  { value: '500+', label: 'Miembros activos' },
  { value: '15',   label: 'Instructores certificados' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly site = SITE;
  readonly plans = MEMBERSHIP_PLANS;
  readonly services = SERVICES;
  readonly stats = STATS;

  formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
