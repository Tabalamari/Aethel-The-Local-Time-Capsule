import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApiService,
  LocationEntry,
  MediaSnapshot,
  VaultStatus,
} from './core/services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-aethel-bg text-aethel-cream font-sans">
      <!-- Top Bar -->
      <header class="border-b border-aethel-border bg-aethel-surface/80 backdrop-blur sticky top-0 z-20">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span class="text-xs uppercase tracking-widest text-aethel-amber font-mono">
              Гіперлокальний цифровий архів
            </span>
            <h1 class="text-2xl font-serif tracking-tight text-aethel-cream">
              Aethel <span class="text-aethel-muted font-normal text-base">· The Local Time Capsule</span>
            </h1>
          </div>

          <div class="flex items-center gap-3">
            <span
              class="text-xs px-3 py-1 rounded-full border border-aethel-border text-aethel-muted font-mono"
            >
              {{ isRegisteredDemo() ? 'Режим: Зареєстрований (@podil_archivist)' : 'Режим: Гість (ніки приховано)' }}
            </span>
            <button
              type="button"
              (click)="toggleDemoRole()"
              class="text-xs px-4 py-2 rounded bg-aethel-amber text-aethel-bg font-medium hover:bg-aethel-gold transition"
            >
              {{ isRegisteredDemo() ? 'Переглянути як Гість' : 'Швидкий вхід (Демо)' }}
            </button>
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-6 py-8 space-y-10">
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

        <!-- Locations Preview -->
        <section class="space-y-3">
          <h3 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
            Доступні райони в базі ({{ locations().length }})
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
              Етап 1 · Базова архітектура та захист приватності
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

                  <div class="pt-3 border-t border-aethel-border flex items-center justify-between text-xs">
                    @if (item.author_username) {
                      <span class="font-mono text-aethel-gold">
                        @{{ item.author_username }}
                      </span>
                    } @else {
                      <span class="font-mono text-aethel-muted italic">
                        Автор прихований для гостей
                      </span>
                    }

                    @if (item.author_partner_badge) {
                      <span class="text-[11px] px-2 py-0.5 rounded border border-aethel-amber/40 text-aethel-amber">
                        {{ item.author_partner_badge }}
                      </span>
                    }
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      </main>
    </div>
  `,
})
export class AppComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly vault = signal<VaultStatus | null>(null);
  readonly locations = signal<LocationEntry[]>([]);
  readonly snapshots = signal<MediaSnapshot[]>([]);
  readonly isRegisteredDemo = signal<boolean>(false);

  ngOnInit(): void {
    this.api.getVaultStatus().subscribe((v) => this.vault.set(v));
    this.api.getLocations().subscribe((locs) => this.locations.set(locs));
    this.loadSnapshots();
  }

  toggleDemoRole(): void {
    this.isRegisteredDemo.update((v) => !v);
    this.loadSnapshots();
  }

  private loadSnapshots(): void {
    const token = this.isRegisteredDemo() ? 'demo-user-1' : null;
    this.api.getMediaSnapshots(token).subscribe((items) => this.snapshots.set(items));
  }
}

