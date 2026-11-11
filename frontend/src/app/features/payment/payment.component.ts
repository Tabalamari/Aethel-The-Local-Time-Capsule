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
        @for (option of paymentOptions(); track option.id) {
          <button
            type="button"
            (click)="selectProvider(option.id)"
            [class.border-aethel-amber/50]="selectedProvider() === option.id"
            [class.border-aethel-border]="selectedProvider() !== option.id"
            [class.bg-aethel-amber/10]="selectedProvider() === option.id"
            class="p-3 rounded-lg border border-aethel-border bg-aethel-bg/30 flex flex-col items-center gap-2 cursor-pointer transition hover:border-aethel-amber/50"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-aethel-amber bg-aethel-amber/10">
              <span class="text-sm">{{ option.icon }}</span>
            </div>
            <span class="text-xs font-mono font-semibold text-aethel-cream">{{ option.name }}</span>
            <span class="text-[10px] text-aethel-muted">{{ option.description }}</span>
          </button>
        }
      </div>

      @if (selectedProvider()) {
        <div class="p-4 rounded-lg border border-aethel-border/30 bg-aethel-bg/30">
          <h4 class="text-xs font-mono uppercase tracking-widest text-aethel-amber mb-3">
            Оберіть термін закріплення
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (plan of plans(); track plan.id) {
              <button
                type="button"
                (click)="selectPlan(plan.id)"
                [class.bg-aethel-amber/20]="selectedPlan() === plan.id"
                [class.border-aethel-amber/50]="selectedPlan() === plan.id"
                class="p-3 rounded-lg border border-aethel-border bg-aethel-bg/30 cursor-pointer transition hover:border-aethel-amber/50"
              >
                <span class="text-xs font-mono text-aethel-cream">{{ plan.label }}</span>
                <span class="text-[10px] font-mono text-aethel-muted block mt-1">{{ plan.price }}</span>
              </button>
            }
          </div>
        </div>

        <div class="pt-4 border-t border-aethel-border/30">
          <button
            type="button"
            (click)="processPayment()"
            [disabled]="!selectedPlan() || isProcessing()"
            class="w-full px-4 py-2.5 rounded-lg bg-aethel-amber text-aethel-bg font-medium text-sm hover:bg-aethel-gold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ isProcessing() ? 'Оплата...' : `Оплатити ${selectedPlan()?.price}` }}
          </button>
          @if (paymentStatus()) {
            <p class="mt-2 text-xs font-mono text-aethel-gold">{{ paymentStatus() }}</p>
          }
        </div>
      }

      <div class="pt-4 border-t border-aethel-border/30 text-center">
        <p class="text-[10px] text-aethel-muted">
          Тестові платежі. У продакшені інтегруйте Stripe, LiqPay або Monobank Acquiring.
        </p>
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
  readonly selectedPlan = signal<{ id: string; label: string; price: string } | null>(null);
  readonly isProcessing = signal(false);
  readonly paymentStatus = signal<string | null>(null);

  readonly paymentOptions: PaymentOption[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Картки Visa/Mastercard',
      color: '#6358F0',
      icon: '💳',
    },
    {
      id: 'liqpay',
      name: 'LiqPay',
      description: 'Українські картки',
      color: '#FF3B30',
      icon: '🇺🇦',
    },
    {
      id: 'monobank',
      name: 'Monobank',
      description: 'Монобанк Acquiring',
      color: '#FF8C00',
      icon: '🟠',
    },
  ];

  readonly plans = [
    { id: '7d', label: '7 днів', price: '50 ₴' },
    { id: '30d', label: '30 днів', price: '150 ₴' },
    { id: '90d', label: '90 днів', price: '350 ₴' },
  ];

  constructor() {}

  reset(): void {
    this.selectedProvider.set(null);
    this.selectedPlan.set(null);
    this.isProcessing.set(false);
    this.paymentStatus.set(null);
  }

  selectProvider(provider: PaymentProvider): void {
    this.selectedProvider.set(provider);
    this.paymentStatus.set(null);
  }

  selectPlan(id: string): void {
    const plan = this.plans.find((p) => p.id === id);
    if (plan) {
      this.selectedPlan.set(plan);
      this.paymentStatus.set(null);
    }
  }

  async processPayment(): Promise<void> {
    if (!this.selectedPlan() || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.paymentStatus.set('Обробка платежу...');

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.paymentStatus.set('Оплата успішна! Місце закріплено.');
      this.isProcessing.set(false);

      // Close after a short delay
      setTimeout(() => {
        this.close.emit();
      }, 1500);
    } catch (err) {
      this.paymentStatus.set('Помилка оплати. Спробуйте ще раз.');
      this.isProcessing.set(false);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
