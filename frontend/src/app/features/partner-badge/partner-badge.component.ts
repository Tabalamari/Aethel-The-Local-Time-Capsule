import { Component, inject, signal, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, PartnerBadgeDTO } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-partner-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (badge() && badge().is_partner && badge().partner_badge_label) {
      <span
        class="text-[10px] px-2 py-0.5 rounded border border-aethel-amber/40 text-aethel-amber font-mono font-semibold"
        [title]="badge().partner_badge_label"
      >
        ★ {{ badge().partner_badge_label }}
      </span>
    }
  `,
})
export class PartnerBadgeComponent {
  @Input() set username(value: string | null) {
    if (value) {
      this._username.set(value);
    }
  }
  private readonly _username = signal<string | null>(null);

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly badge = signal<PartnerBadgeDTO | null>(null);

  constructor() {
    effect(() => {
      const un = this._username();
      if (un) {
        this.loadBadge(un);
      }
    });
  }

  loadBadge(username: string): void {
    // For now, load current user's badge. In a real app, we'd look up by username.
    this.api.getPartnerBadge().subscribe({
      next: (data) => this.badge.set(data),
      error: () => this.badge.set(null),
    });
  }
}
