import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApiService,
  LocationEntry,
  MediaFilterParams,
  MediaSnapshot,
  SpotlightDTO,
  VaultStatus,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LocationFilterBarComponent } from '../locations/location-filter-bar.component';
import { VaultTimerComponent } from './vault-timer.component';
import { MediaUploadComponent } from '../upload/media-upload.component';
import { FutureLettersComponent } from '../letters/future-letters.component';
import { AudioMapComponent } from '../map/audio-map.component';
import { CommentsComponent } from '../comments/comments.component';
import { DirectMessagesComponent } from '../direct-messages/direct-messages.component';
import { SponsoredSpotlightComponent } from '../spotlight/sponsored-spotlight.component';
import { PaymentComponent } from '../payment/payment.component';
import { PartnerBadgeComponent } from '../partner-badge/partner-badge.component';

@Component({
  selector: 'app-home-feed',
  standalone: true,
  imports: [
    CommonModule,
    LocationFilterBarComponent,
    VaultTimerComponent,
    MediaUploadComponent,
    FutureLettersComponent,
    AudioMapComponent,
    CommentsComponent,
    DirectMessagesComponent,
    SponsoredSpotlightComponent,
    PaymentComponent,
    PartnerBadgeComponent,
  ],
  template: `
    <div class="space-y-32">
      <!-- Stage 4: Locked Vault & Countdown Timer -->
      <app-vault-timer
        [unlockAt]="vault()?.unlock_at || ''"
        [vaultTitle]="vault()?.vault_title || 'Great City Time Capsule — 2030'"
        [vaultDescription]="vault()?.description || ''"
      ></app-vault-timer>

      <!-- Stage 6: Sponsored Spotlight (Paid Featured Items) -->
      <app-sponsored-spotlight (openPayment)="openPayment()"></app-sponsored-spotlight>

      <!-- Stage 3: Location Filter Bar -->
      <app-location-filter-bar
        [locations]="locations()"
        (filterChange)="onFilterChange($event)"
        (locationAdded)="onLocationAdded($event)"
      ></app-location-filter-bar>

      <!-- Stage 4: Media Upload -->
      <app-media-upload
        [locations]="locations()"
        (uploadComplete)="onMediaUploaded($event)"
      ></app-media-upload>

      <!-- Locations Preview -->
      <section class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Available Locations ({{ locations().length }})
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
          <h3 class="text-lg font-serif text-aethel-cream">Daily Snapshots · Daily Snapshots</h3>
          <span class="text-xs text-aethel-muted font-mono">
            Author filter in general feed disabled
          </span>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          @for (item of snapshots(); track item.id) {
            <article class="rounded-xl overflow-hidden border border-aethel-border bg-aethel-surface flex flex-col">
              <div class="aspect-video bg-black/40 overflow-hidden relative">
                <img
                  [src]="item.media_url"
                  [alt]="item.caption || 'City Snapshot'"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
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
                      <button
                        type="button"
                        (click)="openDM(item.author_username)"
                        class="font-mono font-semibold text-aethel-gold hover:underline transition"
                      >
                        &#64;{{ item.author_username }}
                      </button>
                    } @else {
                      <span class="font-mono text-aethel-muted italic">
                        Anonymous Resident (nickname hidden for guests)
                      </span>
                    }

                    <app-partner-badge
                      [username]="item.author_username"
                    ></app-partner-badge>
                  </div>

                  <!-- Interaction buttons for Registered vs Guest -->
                  <div class="flex items-center justify-between pt-1">
                    @if (auth.isAuthenticated()) {
                      <div class="flex items-center gap-3">
                        <span class="text-[11px] font-mono text-aethel-muted">
                          💬 Comments · ✉ DM
                        </span>
                      </div>
                    } @else {
                      <button
                        type="button"
                        (click)="promptGuestAction('Sign in to leave comments or write to authors via Direct Messages.')"
                        class="text-[11px] font-mono text-aethel-amber hover:underline"
                      >
                        Sign in to comment or write to author →
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Stage 5: Comments under each media item -->
              <app-comments [mediaId]="item.id"></app-comments>
            </article>
          }
        </div>
      </section>

      <!-- Stage 4: Future Letters -->
      <app-future-letters [locations]="locations()"></app-future-letters>

      <!-- Stage 4: Audio-Geotagging Map -->
      <app-audio-map></app-audio-map>

      <!-- Stage 5: Direct Messages Chat -->
      <app-direct-messages [autoOpen]="dmPartner()"></app-direct-messages>

      <!-- Stage 6: Payment Modal -->
      @if (paymentOpen()) {
        <app-payment
          [open]="paymentOpen()"
          (close)="closePayment()"
        ></app-payment>
      }
    </div>
  `,
})
export class HomeFeedComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly vault = signal<VaultStatus | null>(null);
  readonly locations = signal<LocationEntry[]>([]);
  readonly snapshots = signal<MediaSnapshot[]>([]);
  readonly activeFilters = signal<MediaFilterParams>({});
  readonly paymentOpen = signal<boolean>(false);

  readonly dmPartner = signal<{ username: string; id: string } | null>(null);

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

  onFilterChange(filters: MediaFilterParams): void {
    this.activeFilters.set(filters);
    this.loadSnapshots();
  }

  onLocationAdded(location: LocationEntry): void {
    this.locations.update((list) => [...list, location]);
  }

  onMediaUploaded(snapshot: MediaSnapshot): void {
    this.snapshots.update((list) => [snapshot, ...list]);
  }

  openDM(authorUsername: string): void {
    this.dmPartner.set({ username: authorUsername, id: authorUsername });
  }

  openPayment(): void {
    this.paymentOpen.set(true);
  }

  closePayment(): void {
    this.paymentOpen.set(false);
  }

  promptGuestAction(reason: string): void {
    this.auth.openAuthModal(reason);
  }

  private loadSnapshots(): void {
    this.api.getMediaSnapshots(this.activeFilters()).subscribe((items) => this.snapshots.set(items));
  }
}
