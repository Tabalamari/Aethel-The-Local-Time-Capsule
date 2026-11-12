import { Component, Input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';

@Component({
  selector: 'app-vault-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="p-6 rounded-xl border border-aethel-border bg-aethel-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      [class.border-aethel-amber]="isUnlocked()"
    >
      <div class="space-y-2">
        <div
          class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-aethel-amber"
        >
          <span [class.text-aethel-gold]="isUnlocked()">
            {{ isUnlocked() ? '🔓' : '🔒' }}
            Капсула часу
          </span>
        </div>
        <h2 class="text-xl font-serif text-aethel-cream">{{ vaultTitle }}</h2>
        <p class="text-sm text-aethel-muted max-w-xl">{{ vaultDescription }}</p>
      </div>

      <div class="text-right font-mono bg-aethel-bg px-5 py-3 rounded-lg border border-aethel-border">
        <div class="text-xs text-aethel-muted uppercase">
          {{ isUnlocked() ? 'Капсула відкрита' : 'Відкриття капсули' }}
        </div>
        @if (isUnlocked()) {
          <div class="text-lg text-aethel-gold font-semibold">
            Капсула часу відкрита для всіх мешканців
          </div>
        } @else {
          <div class="text-2xl text-aethel-gold font-semibold tabular-nums">
            {{ days() }}d {{ hours() }}h {{ minutes() }}m {{ seconds() }}s
          </div>
          <div class="text-xs text-aethel-muted mt-1">
            до публічного доступу до усіх спогадів
          </div>
        }
      </div>
    </section>
  `,
})
export class VaultTimerComponent {
  @Input() unlockAt = '';
  @Input() vaultTitle = 'Велика Капсула Часу Міста — 2030';
  @Input() vaultDescription =
    'Спільний цифровий сейф спогадів, ранкових фото, голосів вулиць та листів у майбутнє.';

  private readonly unlockTime = signal<Date | null>(null);

  readonly days = signal(0);
  readonly hours = signal(0);
  readonly minutes = signal(0);
  readonly seconds = signal(0);
  readonly isUnlocked = signal(false);

  constructor() {
    effect(() => {
      if (this.unlockAt) {
        this.unlockTime.set(new Date(this.unlockAt));
      }
    });

    interval(1000).subscribe(() => this.tick());
    this.tick();
  }

  private tick(): void {
    const unlock = this.unlockTime();
    const now = new Date();

    if (!unlock) {
      this.isUnlocked.set(true);
      return;
    }

    const diff = unlock.getTime() - now.getTime();

    if (diff <= 0) {
      this.isUnlocked.set(true);
      this.days.set(0);
      this.hours.set(0);
      this.minutes.set(0);
      this.seconds.set(0);
      return;
    }

    this.isUnlocked.set(false);
    this.days.set(Math.floor(diff / (1000 * 60 * 60 * 24)));
    this.hours.set(Math.floor((diff / (1000 * 60 * 60)) % 24));
    this.minutes.set(Math.floor((diff / (1000 * 60)) % 60));
    this.seconds.set(Math.floor((diff / 1000) % 60));
  }
}
