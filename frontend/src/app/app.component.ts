import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { QuickAuthModalComponent } from './features/auth/quick-auth-modal.component';
import { UsernameOnboardingModalComponent } from './features/auth/username-onboarding-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    QuickAuthModalComponent,
    UsernameOnboardingModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-aethel-bg text-aethel-cream font-sans">
      <!-- Top Navigation Bar -->
      <header class="border-b border-aethel-border bg-aethel-surface/80 backdrop-blur sticky top-0 z-20">
        <div class="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <a routerLink="/" class="block">
            <span class="text-xs uppercase tracking-widest text-aethel-amber font-mono">
              Гіперлокальний цифровий архів
            </span>
            <h1 class="text-2xl font-serif tracking-tight text-aethel-cream">
              Aethel <span class="text-aethel-muted font-normal text-base">· The Local Time Capsule</span>
            </h1>
          </a>

          <div class="flex items-center gap-3">
            @if (auth.isAuthenticated()) {
              <a
                routerLink="/my-archive"
                class="text-xs px-3 py-1.5 rounded-lg border border-aethel-border text-aethel-cream hover:border-aethel-amber font-mono transition"
              >
                Мій архів
              </a>
              <span class="text-xs px-3 py-1.5 rounded-full bg-aethel-bg border border-aethel-amber/40 text-aethel-gold font-mono">
                &#64;{{ auth.profile()?.username || 'очікує нік...' }}
              </span>
              <button
                type="button"
                (click)="auth.signOut()"
                class="text-xs px-3 py-1.5 rounded-lg border border-aethel-border text-aethel-muted hover:text-aethel-cream font-mono transition"
              >
                Вийти
              </button>
            } @else {
              <span class="text-xs px-3 py-1 rounded-full border border-aethel-border text-aethel-muted font-mono">
                Гість (ніки приховано)
              </span>
              <button
                type="button"
                (click)="auth.openAuthModal()"
                class="text-xs px-4 py-2 rounded-lg bg-aethel-amber text-aethel-bg font-medium hover:bg-aethel-gold transition"
              >
                Швидкий вхід
              </button>
            }
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-6 py-8">
        <router-outlet />
      </main>

      <!-- Modals for Stage 2: Quick Auth & Mandatory Unique Username Onboarding -->
      <app-quick-auth-modal />
      <app-username-onboarding-modal />
    </div>
  `,
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
