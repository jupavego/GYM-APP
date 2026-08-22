import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PlanGeneratorService } from '../../../../core/services/fitness/plan-generator.service';
import { CheckinService } from '../../../../core/services/fitness/checkin.service';
import { CheckinInput } from '../../../../core/models/fitness.model';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CheckinComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private planGenerator   = inject(PlanGeneratorService);
  private checkinService  = inject(CheckinService);
  private router          = inject(Router);

  loading  = signal(true);
  saving   = signal(false);
  errorMsg = signal<string | null>(null);
  noPlan   = signal(false);
  planId   = signal<string | null>(null);

  form = this.fb.group({
    q_adherence:   [3, Validators.required],
    q_energy:      [3, Validators.required],
    q_difficulty:  [3, Validators.required],
    q_pain:        ['none', Validators.required],
    q_progress:    [3, Validators.required],
    q_days_actual: [3, [Validators.required, Validators.min(0), Validators.max(7)]],
    q_preference:  ['keep', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const active = await this.planGenerator.getActivePlan();
    if (!active) {
      this.noPlan.set(true);
    } else {
      this.planId.set(active.plan.id);
    }
    this.loading.set(false);
  }

  async onSubmit(): Promise<void> {
    const planId = this.planId();
    if (!planId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const input: CheckinInput = { ...this.form.getRawValue(), plan_id: planId } as CheckinInput;
    const result = await this.checkinService.submit(input);

    this.saving.set(false);

    if (!result.success) {
      this.errorMsg.set(result.error ?? 'Error al enviar el check-in');
      return;
    }

    this.router.navigate(['/fitness/plan']);
  }
}
