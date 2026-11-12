import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, MediaSnapshot } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-personal-archive',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-aethel-border">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-amber">
            Resident Personal Space
          </span>
          <h2 class="text-2xl font-serif text-aethel-cream mt-1">
            Personal Archive &#64;{{ auth.profile()?.username || 'user' }}
          </h2>
          <p class="text-xs text-aethel-muted mt-1">
            All your uploaded photos, videos and sound points are collected here.
            Other users cannot filter by specific author in the general feed.
          </p>
        </div>
        <a
          routerLink="/"
          class="text-xs font-mono px-4 py-2 rounded-lg border border-aethel-border text-aethel-cream hover:border-aethel-amber transition self-start"
        >
          ← Return to City Feed
        </a>
      </div>

      @if (items().length === 0) {
        <div class="p-8 rounded-xl border border-aethel-border bg-aethel-surface text-center space-y-2">
          <p class="text-sm font-serif text-aethel-cream">
            Your personal archive currently has no saved moments.
          </p>
          <p class="text-xs text-aethel-muted">
            Add your first morning snapshot or sound point to preserve the atmosphere of your district.
          </p>
        </div>
      } @else {
        <div class="grid md:grid-cols-2 gap-6">
          @for (item of items(); track item.id) {
            <article class="rounded-xl overflow-hidden border border-aethel-border bg-aethel-surface flex flex-col">
              <div class="aspect-video bg-black/40 overflow-hidden relative">
                <img
                  [src]="item.media_url"
                  [alt]="item.caption || 'Personal Snapshot'"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="p-5 space-y-3">
                <div class="flex items-center justify-between text-xs font-mono text-aethel-muted">
                  <span>{{ item.location?.city }} · {{ item.location?.district }}</span>
                  <span>{{ item.captured_date }}</span>
                </div>
                <p class="text-sm text-aethel-cream/90 leading-relaxed">{{ item.caption }}</p>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class PersonalArchiveComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly items = signal<MediaSnapshot[]>([]);

  ngOnInit(): void {
    this.api.getMyArchive().subscribe((data) => this.items.set(data));
  }
}
