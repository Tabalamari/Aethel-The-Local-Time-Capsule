import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-username-onboarding-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.isAuthenticated() && auth.needsOnboarding()) {
      <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-aethel-amber/60 bg-aethel-surface p-6 shadow-2xl space-y-5">
          <div>
            <span class="text-xs font-mono uppercase tracking-widest text-aethel-amber">
              Step 1 of 1 · Resident Privacy
            </span>
            <h2 class="text-xl font-serif text-aethel-cream mt-1">
              Choose your unique nickname
            </h2>
            <p class="text-xs text-aethel-muted mt-1 leading-relaxed">
              This nickname will be displayed next to your memories only for registered participants.
              All authors remain completely hidden for site guests.
            </p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-xs font-mono text-aethel-muted mb-1.5">
                Unique nickname (Latin letters, digits, _, ., -)
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3.5 text-aethel-muted font-mono text-sm">&#64;</span>
                <input
                  type="text"
                  name="username"
                  [ngModel]="username()"
                  (ngModelChange)="onUsernameInput($event)"
                  placeholder="kyiv_morning_keeper"
                  maxlength="32"
                  required
                  class="w-full pl-8 pr-4 py-2.5 rounded-lg bg-aethel-bg border border-aethel-border text-sm font-mono text-aethel-cream focus:outline-none focus:border-aethel-amber"
                />
              </div>

              @if (checking()) {
                <p class="text-xs font-mono text-aethel-muted mt-2">
                  Checking nickname uniqueness...
                </p>
              } @else if (checkMessage()) {
                <p
                  class="text-xs font-mono mt-2"
                  [class.text-emerald-400]="isAvailable()"
                  [class.text-amber-400]="!isAvailable()"
                >
                  {{ isAvailable() ? '✓ ' : '⚠ ' }}{{ checkMessage() }}
                </p>
              }
            </div>

            @if (submitError()) {
              <div class="p-3 rounded-lg bg-red-950/50 border border-red-700/50 text-xs text-red-200">
                {{ submitError() }}
              </div>
            }

            <div class="flex items-center justify-between pt-2">
              <button
                type="button"
                (click)="auth.signOut()"
                class="text-xs font-mono text-aethel-muted hover:text-aethel-cream"
              >
                Cancel and Sign Out
              </button>

              <button
                type="submit"
                [disabled]="!isAvailable() || saving()"
                class="px-5 py-2.5 rounded-lg bg-aethel-amber text-aethel-bg font-medium text-sm hover:bg-aethel-gold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ saving() ? 'Saving...' : 'Save Nickname' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class UsernameOnboardingModalComponent implements OnDestroy {
  readonly auth = inject(AuthService);

  readonly username = signal<string>('');
  readonly checking = signal<boolean>(false);
  readonly isAvailable = signal<boolean>(false);
  readonly checkMessage = signal<string>('');
  readonly saving = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  private readonly input$ = new Subject<string>();
  private readonly sub: Subscription;

  constructor() {
    this.sub = this.input$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((val) => {
          this.checking.set(true);
          return this.auth.checkUsername(val);
        })
      )
      .subscribe({
        next: (res) => {
          this.checking.set(false);
          this.isAvailable.set(res.available);
          this.checkMessage.set(res.message);
        },
        error: () => {
          this.checking.set(false);
          this.isAvailable.set(false);
          this.checkMessage.set('Nickname check error');
        },
      });
  }

  onUsernameInput(value: string): void {
    this.username.set(value);
    this.submitError.set(null);
    const trimmed = value.trim();
    if (!trimmed) {
      this.isAvailable.set(false);
      this.checkMessage.set('');
      return;
    }
    this.input$.next(trimmed);
  }

  onSubmit(): void {
    if (!this.isAvailable() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.submitError.set(null);

    this.auth.claimUsername(this.username().trim()).subscribe({
      next: () => {
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.submitError.set(err?.error?.message || 'Failed to save nickname');
      },
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

