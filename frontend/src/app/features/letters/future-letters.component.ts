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
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-aethel-letters">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-letters">
            Letters to the Future
          </span>
          <h2 class="text-2xl font-serif text-aethel-cream mt-1">
            Residents Messages to the Future
          </h2>
          <p class="text-xs text-aethel-muted mt-1">
            Write a letter that will open on your chosen date.
          </p>
        </div>
        <div *ngIf="auth.isAuthenticated()">
          <button
            type="button"
            (click)="toggleWriteForm()"
            class="px-4 py-2 rounded-lg bg-aethel-letters text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition"
          >
            {{ showWriteForm() ? '✕ Cancel' : '+ Write a Letter' }}
          </button>
        </div>
        <div *ngIf="!auth.isAuthenticated()">
          <button
            type="button"
            (click)="promptGuest()"
            class="px-4 py-2 rounded-lg border border-aethel-letters/60 text-aethel-letters font-medium text-xs hover:bg-aethel-letters hover:text-aethel-bg transition"
          >
            + Write (Sign In)
          </button>
        </div>
      </div>

      <form *ngIf="showWriteForm() && auth.isAuthenticated()" (ngSubmit)="onSubmit()" class="p-5 rounded-xl border border-aethel-letters bg-aethel-surface space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-mono text-aethel-muted mb-1.5">
              Location
            </label>
            <select
              [(ngModel)]="selectedLocationId"
              name="location_id"
              required
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
            >
              <option value="">Select district</option>
              <option *ngFor="let loc of locations()" [value]="loc.id">
                {{ loc.country }} → {{ loc.city }} → {{ loc.district }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-mono text-aethel-muted mb-1.5">
              Unlock Date
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
              Title
            </label>
            <input
              type="text"
              [(ngModel)]="title"
              name="title"
              required
              maxlength="160"
              placeholder="To those who will walk here in 2050..."
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
          />
        </div>

        <div>
<label class="block text-xs font-mono text-aethel-muted mb-1.5">
              Letter Text
            </label>
            <textarea
              [(ngModel)]="content"
              name="content"
              rows="6"
              required
              placeholder="Your words will be sealed until the opening date..."
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
          ></textarea>
        </div>

        <div class="flex items-center justify-between pt-2">
          <span *ngIf="isSending()" class="text-xs font-mono text-aethel-letters">Sealing...</span>
          <span *ngIf="!isSending() && sendStatus()" class="text-xs font-mono text-aethel-letters">{{ sendStatus() }}</span>
          <button
            type="submit"
            [disabled]="!canSend() || isSending()"
            class="px-4 py-2 rounded-lg bg-aethel-letters text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition disabled:opacity-40"
          >
            Seal Letter
          </button>
        </div>
      </form>

      <div class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Letters ({{ letters().length }})
        </h3>
        <div class="space-y-3">
          <article
            *ngFor="let letter of letters()"
            class="p-4 rounded-xl border border-aethel-border bg-aethel-surface"
            [class.border-aethel-letters]="!letter.is_unlocked"
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
                <div *ngIf="!letter.is_unlocked" class="text-[10px] font-mono text-aethel-letters font-mono">
                  Sealed until {{ letter.unlock_date }}
                </div>
                <div *ngIf="!letter.is_unlocked" class="text-xs text-aethel-gold tabular-nums mt-1">
                  {{ letterDays(letter.unlockDate()) }}d {{ letterHours(letter.unlockDate()) }}h
                </div>
                <div *ngIf="letter.is_unlocked" class="text-xs font-mono text-aethel-gold">Opened</div>
              </div>
            </div>

            <div *ngIf="letter.is_unlocked && letter.content">
              <p class="text-sm text-aethel-cream/90 leading-relaxed italic">
                {{ letter.content }}
              </p>
            </div>
            <div *ngIf="!letter.is_unlocked" class="p-3 rounded-lg border border-aethel-border/30 bg-aethel-bg/30 text-center">
              <span class="text-xs font-mono text-aethel-muted">
                🔒 Letter sealed. Text will be available after {{ letter.unlock_date }}.
              </span>
            </div>
          </article>

          <div *ngIf="letters().length === 0" class="p-8 rounded-xl border border-aethel-border bg-aethel-surface text-center">
            <p class="text-sm text-aethel-muted">
              No letters yet. Write your first message to the future.
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
    this.auth.openAuthModal('Sign in to write letters to the future.');
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
    this.sendStatus.set('Sealing letter...');

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
        this.sendStatus.set('Letter sealed!');
        this.letters.update((list) => [created, ...list]);
        this.resetForm();
        this.showWriteForm.set(false);
      }
    } catch (err: any) {
      this.sendStatus.set(err?.error?.message || 'Failed to seal letter.');
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
