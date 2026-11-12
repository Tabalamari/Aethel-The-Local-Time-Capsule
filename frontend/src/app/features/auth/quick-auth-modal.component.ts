import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-quick-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.isAuthModalOpen()) {
      <div
        class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        (click)="auth.closeAuthModal()"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-aethel-border bg-aethel-surface p-6 shadow-2xl space-y-6"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <span class="text-xs font-mono uppercase tracking-widest text-aethel-amber">
                Quick Authentication
              </span>
              <h2 class="text-xl font-serif text-aethel-cream mt-1">
                Join the Time Capsule
              </h2>
            </div>
            <button
              type="button"
              (click)="auth.closeAuthModal()"
              class="text-aethel-muted hover:text-aethel-cream text-sm font-mono px-2 py-1"
            >
              ✕
            </button>
          </div>

          @if (auth.authNotice(); as notice) {
            <div class="p-3 rounded-lg bg-aethel-bg border border-aethel-amber/40 text-xs text-aethel-gold">
              {{ notice }}
            </div>
          }

          <p class="text-xs text-aethel-muted leading-relaxed">
            No passwords or long forms. After first sign-in, you will choose a unique nickname so your real name stays private.
          </p>

          <!-- Google OAuth Button -->
          <button
            type="button"
            (click)="onGoogleSignIn()"
            class="w-full py-2.5 px-4 rounded-lg bg-aethel-cream text-aethel-bg font-medium text-sm hover:bg-white transition flex items-center justify-center gap-2"
          >
            <span>Sign in with Google Account</span>
          </button>

          <div class="relative flex py-1 items-center">
            <div class="flex-grow border-t border-aethel-border"></div>
            <span class="flex-shrink mx-3 text-[11px] font-mono uppercase text-aethel-muted">
              or magic link
            </span>
            <div class="flex-grow border-t border-aethel-border"></div>
          </div>

          <!-- Magic Link Email Form -->
          <form (ngSubmit)="onSendMagicLink()" class="space-y-3">
            <div>
              <label class="block text-xs font-mono text-aethel-muted mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="resident@town.example"
                required
                class="w-full px-3.5 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-sm text-aethel-cream focus:outline-none focus:border-aethel-amber"
              />
            </div>
            <button
              type="submit"
              class="w-full py-2.5 px-4 rounded-lg bg-aethel-amber text-aethel-bg font-medium text-sm hover:bg-aethel-gold transition"
            >
              Send Magic Link
            </button>
          </form>

          @if (statusMessage()) {
            <p class="text-xs font-mono text-aethel-gold text-center">
              {{ statusMessage() }}
            </p>
          }

          <!-- Quick Demo Shortcuts for Local Testing -->
          <div class="pt-4 border-t border-aethel-border space-y-2">
            <div class="text-[11px] font-mono uppercase text-aethel-muted">
              Quick test modes (Dev / Demo):
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="auth.signInDemoNewUser()"
                class="text-xs py-2 px-3 rounded border border-aethel-border bg-aethel-bg text-aethel-cream hover:border-aethel-amber transition"
              >
                New User (Username Selection)
              </button>
              <button
                type="button"
                (click)="auth.signInDemoExistingUser()"
                class="text-xs py-2 px-3 rounded border border-aethel-border bg-aethel-bg text-aethel-gold hover:border-aethel-amber transition"
              >
                Sign in as &#64;podil_archivist
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class QuickAuthModalComponent {
  readonly auth = inject(AuthService);
  email = '';
  readonly statusMessage = signal<string | null>(null);

  async onGoogleSignIn(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  async onSendMagicLink(): Promise<void> {
    const res = await this.auth.sendMagicLink(this.email);
    this.statusMessage.set(res.message);
  }
}

