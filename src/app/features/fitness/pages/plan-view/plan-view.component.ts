import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlanGeneratorService, GeneratedPlan } from '../../../../core/services/fitness/plan-generator.service';
import { ExerciseService } from '../../../../core/services/fitness/exercise.service';
import { CheckinService } from '../../../../core/services/fitness/checkin.service';
import { Exercise, Checkin, PlanAdjustment } from '../../../../core/models/fitness.model';

@Component({
  selector: 'app-plan-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plan-view.component.html',
  styleUrl: './plan-view.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PlanViewComponent implements OnInit {
  private planGenerator = inject(PlanGeneratorService);
  private exerciseService = inject(ExerciseService);
  private checkinService = inject(CheckinService);

  loading   = signal(true);
  plan      = signal<GeneratedPlan | null>(null);
  exercises = signal<Map<string, Exercise>>(new Map());
  history   = signal<{ checkin: Checkin; adjustment: PlanAdjustment | null }[]>([]);

  async ngOnInit(): Promise<void> {
    const generated = await this.planGenerator.getActivePlan();
    this.plan.set(generated);

    if (generated) {
      const ids = [...new Set(generated.sessions.flatMap(s => s.exercises.map(e => e.exercise_id)))];
      this.exercises.set(await this.exerciseService.getByIds(ids));
      this.history.set(await this.checkinService.getHistory(generated.plan.id));
    }

    this.loading.set(false);
  }

  exerciseName(id: string): string {
    return this.exercises().get(id)?.name ?? 'Ejercicio';
  }

  painLabel(pain: string): string {
    const map: Record<string, string> = { none: 'Sin dolor', mild: 'Leve', moderate: 'Moderado', severe: 'Importante' };
    return map[pain] ?? pain;
  }
}
