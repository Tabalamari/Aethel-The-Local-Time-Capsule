import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApiService,
  LocationEntry,
  MediaSnapshot,
  VaultStatus,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-10">
      <!-- The Locked Vault Banner -->
      @if (vault(); as v) {
        <section class="p-6 rounded-xl border border-aethel-border bg-aethel-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-aethel-amber">
              <span>🔒 Замкнений сейф спогадів</span>
            </div>
            <h2 class="text-xl font-serif text-aethel-cream">{{ v.vault_title }}</h2>
            <p class="text-sm text-aethel-muted max-w-xl">{{ v.description }}</p>
          </div>
          <div class="text-right font-mono bg-aethel-bg px-5 py-3 rounded-lg border border-aethel-border">
            <div class="text-xs text-aethel-muted uppercase">Відкриття капсули</div>
            <div class="text-lg text-aethel-gold font-semibold">{{ v.unlock_at | date: 'yyyy-MM-dd' }}</div>
          </div>
        </section>
      }

      <!-- Guest vs Registered Role Action Bar -->
      <section class="p-4 rounded-xl border border-aethel-border bg-aethel-surface/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        @if (auth.isAuthenticated()) {
          <div class="space-y-1">
            <div class="text-xs font-mono text-aethel-gold">
              ✓ Ви увійшли як &#64;{{ auth.profile()?.username || 'новий мешканець' }}
            </div>
            <p class="text-xs text-aethel-muted">
              Вам доступні ніки авторів, коментування, приватні повідомлення та завантаження медіа.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="text-xs px-3.5 py-2 rounded-lg bg-aethel-amber text-aethel-bg font-medium hover:bg-aethel-gold transition"
            >
              + Додати знімок / локацію
            </button>
          </div>
        } @else {
          <div class="space-y-1">
            <div class="text-xs font-mono text-aethel-muted">
              👁 Режим Гостя (Guest) · Ніки авторів приховано для захисту приватності
            </div>
            <p class="text-xs text-aethel-muted">
              Увійдіть у 1 клік, щоб бачити авторів, залишати коментарі та додавати власні спогади.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              (click)="promptGuestAction('Щоб завантажити фото чи відео у капсулу часу, виконайте швидкий вхід.')"
              class="text-xs px-3.5 py-2 rounded-lg border border-aethel-amber/60 text-aethel-gold hover:bg-aethel-amber hover:text-aethel-bg transition"
            >
              + Додати медіа (Швидкий вхід)
            </button>
          </div>
        }
      </section>

      <!-- Locations Preview -->
      <section class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Доступні локації ({{ locations().length }})
        </h3>
        <div class="flex flex-wrap gap-2">
          @for (loc of locations(); track loc.id) {
            <span class="text-xs px-3 py-1.5 rounded-md bg-aethel-surface border border-aethel-border text-aethel-cream">
              {{ loc.country }} → {{ loc.city }} → <strong class="text-aethel-gold">{{ loc.district }}</strong>
            </span>
          }
        </div>
      </section>

      <!-- Daily Snapshots Feed -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-serif text-aethel-cream">Daily Snapshots · Щоденні знімки</h3>
          <span class="text-xs text-aethel-muted font-mono">
            Вибірка за автором у загальній стрічці вимкнена
          </span>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          @for (item of snapshots(); track item.id) {
            <article class="rounded-xl overflow-hidden border border-aethel-border bg-aethel-surface flex flex-col">
              <div class="aspect-video bg-black/40 overflow-hidden relative">
                <img
                  [src]="item.media_url"
                  [alt]="item.caption || 'Знімок міста'"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                @if (item.is_spotlight) {
                  <span class="absolute top-3 left-3 text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-aethel-amber text-aethel-bg font-semibold">
                    ★ Sponsored Spotlight
                  </span>
                }
              </div>

              <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs font-mono text-aethel-muted">
                    <span>{{ item.location?.city }} · {{ item.location?.district }}</span>
                    <span>{{ item.captured_date }}</span>
                  </div>
                  <p class="text-sm text-aethel-cream/90 leading-relaxed">
                    {{ item.caption }}
                  </p>
                </div>

                <div class="pt-3 border-t border-aethel-border space-y-3">
                  <div class="flex items-center justify-between text-xs">
                    @if (item.author_username) {
                      <span class="font-mono text-aethel-gold">
                        &#64;{{ item.author_username }}
                      </span>
                    } @else {
                      <span class="font-mono text-aethel-muted italic">
                        Анонімний мешканець (нік приховано для гостей)
                      </span>
                    }

                    @if (item.author_partner_badge) {
                      <span class="text-[11px] px-2 py-0.5 rounded border border-aethel-amber/40 text-aethel-amber">
                        {{ item.author_partner_badge }}
                      </span>
                    }
                  </div>

                  <!-- Interaction buttons for Registered vs Guest -->
                  <div class="flex items-center justify-between pt-1">
                    @if (auth.isAuthenticated()) {
                      <span class="text-[11px] font-mono text-aethel-muted">
                        💬 Залишити коментар · ✉ Написати автору в DM
                      </span>
                    } @else {
                      <button
                        type="button"
                        (click)="promptGuestAction('Увійдіть, щоб залишати коментарі або писати авторам у Direct Messages.')"
                        class="text-[11px] font-mono text-aethel-amber hover:underline"
                      >
                        Увійти, щоб коментувати або написати автору →
                      </button>
                    }
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
      </section>
    </div>
  `,
})
export class HomeFeedComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly vault = signal<VaultStatus | null>(null);
  readonly locations = signal<LocationEntry[]>([]);
  readonly snapshots = signal<MediaSnapshot[]>([]);

  constructor() {
    // Automatically reload feed when auth token changes so nicknames appear/disappear immediately
    effect(() => {
      this.auth.accessToken();
      this.loadSnapshots();
    });
  }

  ngOnInit(): void {
    this.api.getVaultStatus().subscribe((v) => this.vault.set(v));
    this.api.getLocations().subscribe((locs) => this.locations.set(locs));
  }

  promptGuestAction(reason: string): void {
    this.auth.openAuthModal(reason);
  }

  private loadSnapshots(): void {
    this.api.getMediaSnapshots().subscribe((items) => this.snapshots.set(items));
  }
}

