import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FitnessProfileService } from '../../../../core/services/fitness/fitness-profile.service';
import { PlanGeneratorService } from '../../../../core/services/fitness/plan-generator.service';
import { GOAL_LABELS, EXPERIENCE_LABELS, FitnessProfileInput } from '../../../../core/models/fitness.model';

@Component({
  selector: 'app-questionnaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class QuestionnaireComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private profileService  = inject(FitnessProfileService);
  private planGenerator   = inject(PlanGeneratorService);
  private router          = inject(Router);

  readonly goals       = Object.entries(GOAL_LABELS) as [string, string][];
  readonly experiences  = Object.entries(EXPERIENCE_LABELS) as [string, string][];

  loading   = signal(true);
  saving    = signal(false);
  errorMsg  = signal<string | null>(null);

  form = this.fb.group({
    age:                   [25, [Validators.required, Validators.min(12), Validators.max(100)]],
    sex:                    ['male', Validators.required],
    weight_kg:              [70, [Validators.required, Validators.min(30)]],
    height_cm:              [170, [Validators.required, Validators.min(100)]],
    goal_primary:            ['fitness', Validators.required],
    goal_secondary:          [''],
    experience_level:        ['beginner', Validators.required],
    days_available:          [3, [Validators.required, Validators.min(1), Validators.max(7)]],
    session_duration_min:    [60, [Validators.required, Validators.min(15), Validators.max(180)]],
    horizon:                 ['medium', Validators.required],
    time_preference:         ['flexible', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const existing = await this.profileService.getMine();
    if (existing) {
      this.form.patchValue({ ...existing, goal_secondary: existing.goal_secondary ?? '' });
    }
    this.loading.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const raw = this.form.getRawValue();
    const input: FitnessProfileInput = {
      ...raw,
      goal_secondary: raw.goal_secondary ? raw.goal_secondary as any : null,
    } as FitnessProfileInput;

    const saveResult = await this.profileService.save(input);
    if (!saveResult.success) {
      this.errorMsg.set(saveResult.error ?? 'Error al guardar el perfil');
      this.saving.set(false);
      return;
    }

    const profile = await this.profileService.getMine();
    if (!profile) {
      this.errorMsg.set('No se pudo cargar el perfil recién guardado');
      this.saving.set(false);
      return;
    }

    const genResult = await this.planGenerator.generate(profile);
    this.saving.set(false);

    if (!genResult.success) {
      this.errorMsg.set(genResult.error ?? 'Error al generar el plan');
      return;
    }

    this.router.navigate(['/fitness/plan']);
  }
}
