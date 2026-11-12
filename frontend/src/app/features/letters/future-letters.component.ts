import { Component, inject, signal, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { ApiService, FutureLetterDTO, LocationEntry } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-future-letters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-aethel-border">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-amber">
            Листи в майбутнє
          </span>
          <h2 class="text-2xl font-serif text-aethel-cream mt-1">
            Послання мешканців у майбутнє
          </h2>
          <p class="text-xs text-aethel-muted mt-1">
            Напишіть листа, який відчинитьься у обрану вами дату.
          </p>
        </div>
        <div *ngIf="auth.isAuthenticated()">
          <button
            type="button"
            (click)="toggleWriteForm()"
            class="px-4 py-2 rounded-lg bg-aethel-amber text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition"
          >
            {{ showWriteForm() ? '✕ Скасувати' : '+ Написати листа' }}
          </button>
        </div>
        <div *ngIf="!auth.isAuthenticated()">
          <button
            type="button"
            (click)="promptGuest()"
            class="px-4 py-2 rounded-lg border border-aethel-amber/60 text-aethel-gold font-medium text-xs hover:bg-aethel-amber hover:text-aethel-bg transition"
          >
            + Написати (вхід)
          </button>
        </div>
      </div>

      <form *ngIf="showWriteForm() && auth.isAuthenticated()" (ngSubmit)="onSubmit()" class="p-5 rounded-xl border border-aethel-border bg-aethel-surface space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-mono text-aethel-muted mb-1.5">
              Локація
            </label>
            <select
              [(ngModel)]="selectedLocationId"
              name="location_id"
              required
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
            >
              <option value="">Оберіть район</option>
              <option *ngFor="let loc of locations()" [value]="loc.id">
                {{ loc.country }} → {{ loc.city }} → {{ loc.district }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-mono text-aethel-muted mb-1.5">
              Дата відкриття
            </label>
            <input
              type="date"
              [(ngModel)]="unlockDate"
              name="unlock_date"
              required
              min="2026-01-01"
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-mono text-aethel-muted mb-1.5">
            Заголовок
          </label>
          <input
            type="text"
            [(ngModel)]="title"
            name="title"
            required
            maxlength="160"
            placeholder="Тим, хто гулятиме тут у 2050 році..."
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
          />
        </div>

        <div>
          <label class="block text-xs font-mono text-aethel-muted mb-1.5">
            Текст листа
          </label>
          <textarea
            [(ngModel)]="content"
            name="content"
            rows="6"
            required
            placeholder="Ваші слова будуть запечатані до настання дати відкриття..."
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
          ></textarea>
        </div>

        <div class="flex items-center justify-between pt-2">
          <span *ngIf="isSending()" class="text-xs font-mono text-aethel-gold">Надсилання...</span>
          <span *ngIf="!isSending() && sendStatus()" class="text-xs font-mono text-aethel-gold">{{ sendStatus() }}</span>
          <button
            type="submit"
            [disabled]="!canSend() || isSending()"
            class="px-4 py-2 rounded-lg bg-aethel-amber text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition disabled:opacity-40"
          >
            Запечатати листа
          </button>
        </div>
      </form>

      <div class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Листи ({{ letters().length }})
        </h3>
        <div class="space-y-3">
          <article
            *ngFor="let letter of letters()"
            class="p-4 rounded-xl border border-aethel-border bg-aethel-surface"
            [class.border-aethel-amber]="!letter.is_unlocked"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 class="text-sm font-serif text-aethel-cream font-semibold">
                  {{ letter.title }}
                </h4>
                <p class="text-xs text-aethel-muted font-mono">
                  {{ letter.location?.country }} → {{ letter.location?.city }} → {{ letter.location?.district }}
                </p>
                <p *ngIf="letter.author_username" class="text-xs font-mono text-aethel-gold">
                  {{ letter.author_username }}
                </p>
              </div>
              <div class="text-right">
                <div *ngIf="!letter.is_unlocked" class="text-[10px] font-mono text-aethel-amber font-mono">
                  Запечатаний до {{ letter.unlock_date }}
                </div>
                <div *ngIf="!letter.is_unlocked" class="text-xs text-aethel-gold tabular-nums mt-1">
                  {{ letterDays(letter.unlockDate()) }}d {{ letterHours(letter.unlockDate()) }}h
                </div>
                <div *ngIf="letter.is_unlocked" class="text-xs font-mono text-aethel-gold">Відкрито</div>
              </div>
            </div>

            <div *ngIf="letter.is_unlocked && letter.content">
              <p class="text-sm text-aethel-cream/90 leading-relaxed italic">
                {{ letter.content }}
              </p>
            </div>
            <div *ngIf="!letter.is_unlocked" class="p-3 rounded-lg border border-aethel-border/30 bg-aethel-bg/30 text-center">
              <span class="text-xs font-mono text-aethel-muted">
                🔒 Лист запечатаний. Текст буде доступний після {{ letter.unlock_date }}.
              </span>
            </div>
          </article>

          <div *ngIf="letters().length === 0" class="p-8 rounded-xl border border-aethel-border bg-aethel-surface text-center">
            <p class="text-sm text-aethel-muted">
              Ще немає листів. Напишіть свій перший послання у майбутнє.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class FutureLettersComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly showWriteForm = signal(false);
  readonly isSending = signal(false);
  readonly sendStatus = signal<string | null>(null);

  selectedLocationId = '';
  unlockDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  title = '';
  content = '';

  private readonly _locations = signal<LocationEntry[]>([]);

  @Input() set locations(value: LocationEntry[]) {
    this._locations.set(value || []);
  }

  get locations() {
    return this._locations();
  }

  readonly letters = signal<FutureLetterDTO[]>([]);

  constructor() {
    effect(() => {
      this.auth.accessToken();
      this.loadLetters();
    });
  }

  loadLetters(): void {
    this.api.getFutureLetters().subscribe({
      next: (data) => this.letters.set(data),
      error: () => this.letters.set([]),
    });
  }

  toggleWriteForm(): void {
    this.showWriteForm.update((v) => !v);
    if (!this.showWriteForm()) {
      this.resetForm();
    }
  }

  promptGuest(): void {
    this.auth.openAuthModal('Увійдіть, щоб писати листи в майбутнє.');
  }

  resetForm(): void {
    this.selectedLocationId = '';
    this.unlockDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.title = '';
    this.content = '';
    this.sendStatus.set(null);
  }

  canSend(): boolean {
    return Boolean(
      this.selectedLocationId &&
        this.title &&
        this.content &&
        this.unlockDate &&
        !this.isSending()
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.canSend()) return;

    this.isSending.set(true);
    this.sendStatus.set('Запечатування листа...');

    try {
      const created = await this.api
        .createFutureLetter({
          location_id: this.selectedLocationId,
          title: this.title,
          content: this.content,
          unlock_date: this.unlockDate,
        })
        .toPromise();

      if (created) {
        this.sendStatus.set('Лист запечатано!');
        this.letters.update((list) => [created, ...list]);
        this.resetForm();
        this.showWriteForm.set(false);
      }
    } catch (err: any) {
      this.sendStatus.set(err?.error?.message || 'Не вдалося запечатати листа.');
    } finally {
      this.isSending.set(false);
    }
  }

  letterDays(unlockDateStr: string): number {
    const diff = new Date(unlockDateStr).getTime() - new Date().getTime();
    return diff <= 0 ? 0 : Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  letterHours(unlockDateStr: string): number {
    const diff = new Date(unlockDateStr).getTime() - new Date().getTime();
    return diff <= 0 ? 0 : Math.floor((diff / (1000 * 60 * 60)) % 24);
  }
}
