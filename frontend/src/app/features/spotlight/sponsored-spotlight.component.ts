import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, SpotlightDTO } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sponsored-spotlight',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-3">
      @if (spotlights().length > 0) {
        <div class="p-4 rounded-xl border border-aethel-amber/50 bg-aethel-amber/5 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-full bg-aethel-amber/10 pointer-events-none"></div>
          <div class="relative z-10 flex flex-col sm:flex-row gap-4 p-3 sm:p-4">
            <div class="flex-shrink-0">
              <span class="text-[10px] font-mono uppercase tracking-wider text-aethel-amber font-semibold">
                ⭐ Pinned to Home
              </span>
              <h3 class="text-sm font-serif text-aethel-cream mt-1 font-semibold">
                Sponsored Spotlight
              </h3>
            </div>
            <div class="flex-1 space-y-2">
              @for (spot of spotlights(); track spot.id) {
                <div class="flex items-center gap-3 p-2 rounded-lg bg-aethel-bg/30 border border-aethel-border/30 hover:bg-aethel-bg/50 transition cursor-pointer"
                     (click)="onSpotlightClick(spot)">
                  <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-aethel-border">
                    <img [src]="spot.media_url" [alt]="spot.caption || 'Spotlight'" class="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-[10px] font-mono text-aethel-amber truncate">
                      {{ spot.location?.city }} → {{ spot.location?.district }}
                    </div>
                    <div class="text-xs font-serif text-aethel-cream/90 truncate leading-tight">
                      {{ spot.caption || 'Pinned Memory' }}
                    </div>
                    @if (spot.author_username) {
                      <div class="flex items-center gap-1 mt-1">
                        <span class="text-[10px] font-mono text-aethel-gold">                        {{ spot.author_username }}</span>
                        @if (spot.author_partner_badge) {
                          <span class="text-[10px] px-1.5 py-0.5 rounded border border-aethel-amber/40 text-aethel-amber">
                            {{ spot.author_partner_badge }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="flex-shrink-0 text-right hidden sm:block">
              <button
                (click)="openPayment()"
                class="text-[10px] font-mono text-aethel-amber underline underline-offset-2 hover:text-aethel-gold transition px-3 py-1.5 rounded border border-aethel-amber/30 hover:bg-aethel-amber/20"
              >
Buy a Spot
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
<h4 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Pinned Memories ({{ spotlights().length }})
        </h4>
          <button
            (click)="openPayment()"
            class="text-[10px] font-mono text-aethel-amber underline underline-offset-2 hover:text-aethel-gold transition"
          >
            Buy a Spot →
          </button>
        </div>
      } @else if (auth.isAuthenticated()) {
        <div class="p-4 rounded-xl border border-aethel-border/30 bg-aethel-bg/30 text-center">
<p class="text-xs text-aethel-muted">
              No pinned memories yet. Be the first!
            </p>
          <button
            (click)="openPayment()"
            class="mt-3 text-[10px] font-mono text-aethel-amber underline underline-offset-2 hover:text-aethel-gold transition px-3 py-1.5 rounded border border-aethel-amber/30 hover:bg-aethel-amber/20"
          >
            Buy a Spot on Home Page
          </button>
        </div>
      }
    </section>
  `,
})
export class SponsoredSpotlightComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly spotlights = signal<SpotlightDTO[]>([]);
  readonly paymentOpen = signal(false);

  constructor() {
    effect(() => {
      this.auth.accessToken();
      this.loadSpotlights();
    });
  }

  loadSpotlights(): void {
    this.api.getSpotlight().subscribe({
      next: (data) => this.spotlights.set(data),
      error: () => this.spotlights.set([]),
    });
  }

  onSpotlightClick(spot: SpotlightDTO): void {
    // Could navigate to media detail page
    console.log('Spotlight clicked:', spot.id);
  }

  openPayment(): void {
    this.paymentOpen.update((v) => !v);
  }
}
