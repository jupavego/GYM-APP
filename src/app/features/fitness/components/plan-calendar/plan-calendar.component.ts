import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleEntry } from '../../../../core/models/fitness.model';

export interface CalendarDay {
  date: Date | null; // null = celda vacía de relleno (antes del día 1)
  isTrainingDay: boolean;
  sessionLabel: string | null;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  label: string;
  weeks: CalendarDay[][];
}

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-plan-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-calendar.component.html',
  styleUrl: './plan-calendar.component.scss',
})
export class PlanCalendarComponent {
  private _entries    = signal<ScheduleEntry[]>([]);
  private _startDate  = signal<Date | null>(null);
  private _horizonWeeks = signal(0);

  @Input() set entries(value: ScheduleEntry[]) { this._entries.set(value ?? []); }
  @Input() set startDate(value: Date | null) { this._startDate.set(value); }
  @Input() set horizonWeeks(value: number) { this._horizonWeeks.set(value ?? 0); }

  readonly months = computed<CalendarMonth[]>(() => {
    const start = this._startDate();
    if (!start) return [];

    const end = new Date(start);
    end.setDate(end.getDate() + this._horizonWeeks() * 7 - 1);

    const entryByDate = new Map<string, string>();
    for (const e of this._entries()) {
      entryByDate.set(this.dateKey(e.date), e.session.day_label);
    }

    const today = new Date();
    const months: CalendarMonth[] = [];

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= lastMonth) {
      months.push(this.buildMonth(cursor.getFullYear(), cursor.getMonth(), start, end, entryByDate, today));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return months;
  });

  private buildMonth(
    year: number, month: number,
    rangeStart: Date, rangeEnd: Date,
    entryByDate: Map<string, string>, today: Date,
  ): CalendarMonth {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Lunes=0..Domingo=6
    const leadingEmpty = (firstOfMonth.getDay() + 6) % 7;

    const days: CalendarDay[] = [];
    for (let i = 0; i < leadingEmpty; i++) {
      days.push({ date: null, isTrainingDay: false, sessionLabel: null, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const inRange = date >= this.stripTime(rangeStart) && date <= this.stripTime(rangeEnd);
      const key = this.dateKey(date);
      const sessionLabel = inRange ? (entryByDate.get(key) ?? null) : null;

      days.push({
        date,
        isTrainingDay: !!sessionLabel,
        sessionLabel,
        isToday: this.dateKey(date) === this.dateKey(today),
      });
    }

    // Completa la última semana con celdas vacías
    while (days.length % 7 !== 0) {
      days.push({ date: null, isTrainingDay: false, sessionLabel: null, isToday: false });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return { year, month, label: `${MONTH_LABELS[month]} ${year}`, weeks };
  }

  private stripTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }
}
