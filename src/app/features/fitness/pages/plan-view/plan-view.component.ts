import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlanGeneratorService, GeneratedPlan } from '../../../../core/services/fitness/plan-generator.service';
import { ExerciseService } from '../../../../core/services/fitness/exercise.service';
import { CheckinService } from '../../../../core/services/fitness/checkin.service';
import { FitnessProfileService } from '../../../../core/services/fitness/fitness-profile.service';
import { PlanCalendarComponent } from '../../components/plan-calendar/plan-calendar.component';
import { Exercise, Checkin, PlanAdjustment, ScheduleEntry, BODY_PART_ICON } from '../../../../core/models/fitness.model';

@Component({
  selector: 'app-plan-view',
  standalone: true,
  imports: [CommonModule, RouterModule, PlanCalendarComponent],
  templateUrl: './plan-view.component.html',
  styleUrl: './plan-view.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PlanViewComponent implements OnInit {
  private planGenerator    = inject(PlanGeneratorService);
  private exerciseService  = inject(ExerciseService);
  private checkinService   = inject(CheckinService);
  private profileService   = inject(FitnessProfileService);

  loading    = signal(true);
  plan       = signal<GeneratedPlan | null>(null);
  exercises  = signal<Map<string, Exercise>>(new Map());
  history    = signal<{ checkin: Checkin; adjustment: PlanAdjustment | null }[]>([]);
  schedule   = signal<ScheduleEntry[]>([]);
  startDate  = signal<Date | null>(null);

  async ngOnInit(): Promise<void> {
    const generated = await this.planGenerator.getActivePlan();
    this.plan.set(generated);

    if (generated) {
      const ids = [...new Set(generated.sessions.flatMap(s => s.exercises.map(e => e.exercise_id)))];
      this.exercises.set(await this.exerciseService.getByIds(ids));
      this.history.set(await this.checkinService.getHistory(generated.plan.id));

      const profile = await this.profileService.getMine();
      if (profile) {
        const start = this.parseDate(generated.plan.start_date);
        this.startDate.set(start);
        this.schedule.set(
          this.planGenerator.buildSchedule(generated.plan, generated.sessions, profile.preferred_weekdays)
        );
      }
    }

    this.loading.set(false);
  }

  exerciseName(id: string): string {
    return this.exercises().get(id)?.name ?? 'Ejercicio';
  }

  exerciseIcon(id: string): string {
    const bodyPart = this.exercises().get(id)?.body_part ?? '';
    return BODY_PART_ICON[bodyPart] ?? 'chest';
  }

  painLabel(pain: string): string {
    const map: Record<string, string> = { none: 'Sin dolor', mild: 'Leve', moderate: 'Moderado', severe: 'Importante' };
    return map[pain] ?? pain;
  }

  private parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
