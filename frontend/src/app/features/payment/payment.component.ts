import { Component, inject, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

export type PaymentProvider = 'stripe' | 'liqpay' | 'monobank';

export interface PaymentOption {
  id: PaymentProvider;
  name: string;
  description: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="p-6 rounded-xl border border-aethel-border bg-aethel-surface space-y-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-amber">
            Оплата місця на головній
          </span>
          <h3 class="text-base font-serif text-aethel-cream mt-1">
            Sponsored Spotlight
          </h3>
          <p class="text-xs text-aethel-muted mt-1">
            Закріпте свій спогад або привітання угорі головної стрічки на обраний термін.
          </p>
        </div>
        <button
          type="button"
          (click)="onClose()"
          class="text-aethel-muted hover:text-aethel-cream text-xs font-mono"
        >
          ✕
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button *ngFor="let option of paymentOptions" type="button" (click)="selectProvider(option.id)" class="p-3 rounded-lg border border-aethel-border bg-aethel-bg/30 cursor-pointer">
          {{ option.name }}
        </button>
      </div>
    </section>
  `,
})
export class PaymentComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  @Input() set open(value: boolean) {
    this._open.set(value);
    if (value) {
      this.reset();
    }
  }
  @Output() readonly close = new EventEmitter<void>();

  private readonly _open = signal(false);
  readonly isOpen = this._open.asReadonly();

  readonly selectedProvider = signal<PaymentProvider | null>(null);

  readonly paymentOptions: PaymentOption[] = [
    { id: 'stripe', name: 'Stripe', description: 'Картки Visa/Mastercard', color: '#6358F0', icon: '💳' },
    { id: 'liqpay', name: 'LiqPay', description: 'Українські картки', color: '#FF3B30', icon: '🇺🇦' },
    { id: 'monobank', name: 'Monobank', description: 'Монобанк Acquiring', color: '#FF8C00', icon: '🟠' },
  ];

  reset(): void {
    this.selectedProvider.set(null);
  }

  selectProvider(provider: PaymentProvider): void {
    this.selectedProvider.set(provider);
  }

  onClose(): void {
    this.close.emit();
  }
}
