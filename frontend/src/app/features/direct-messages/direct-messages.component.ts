import { Component, inject, signal, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { ApiService, DirectMessageDTO } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="h-full flex flex-col bg-aethel-surface border border-aethel-border rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-aethel-border bg-aethel-bg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-aethel-amber/20 flex items-center justify-center text-aethel-gold text-xs font-mono">
            @{{ partnerUsername() }}
          </div>
          <div>
            <h3 class="text-sm font-serif text-aethel-cream font-semibold">
              @{{ partnerUsername() }}
            </h3>
            <p class="text-[10px] text-aethel-muted">
              Приватне повідомлення
            </p>
          </div>
        </div>
        <button
          type="button"
          (click)="closeChat()"
          class="text-aethel-muted hover:text-aethel-cream text-xs font-mono"
        >
          ✕
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        @for (msg of messages(); track msg.id) {
          <div
            class="max-w-[80%]"
            [class.ml-auto]="msg.sender_id === myId() ? 'ml-auto' : ''"
            [class.mr-auto]="msg.sender_id !== myId() ? 'mr-auto' : ''"
          >
            <article
              class="rounded-xl p-3"
              [class.bg-aethel-amber]="msg.sender_id === myId() ? '' : 'bg-aethel-bg'"
              [class.text-aethel-bg]="msg.sender_id === myId() ? 'text-aethel-bg' : 'text-aethel-cream'"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <span
                  class="text-[10px] font-mono"
                  [class.text-aethel-gold]="msg.sender_id === myId()"
                  [class.text-aethel-muted]="msg.sender_id !== myId()"
                >
                  {{ msg.sender_id === myId() ? 'Ви' : '@' + (msg.sender_username || 'користувач') }}
                </span>
                <span class="text-[10px] text-aethel-muted">
                  {{ msg.created_at | date:'HH:mm' }}
                </span>
              </div>
              <p class="text-sm leading-relaxed">{{ msg.content }}</p>
            </article>
          </div>
        }
        @if (messages().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-aethel-muted text-xs font-mono">
            <p>Ще немає повідомлень.</p>
            <p class="text-[10px] opacity-50 mt-1">Напишіть перше повідомлення вище.</p>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="p-3 border-t border-aethel-border bg-aethel-surface">
        <form (ngSubmit)="onSubmit()" class="space-y-2" #msgForm="ngForm">
          <div class="relative">
            <textarea
              [(ngModel)]="messageText"
              name="content"
              rows="2"
              placeholder="Напишіть повідомлення..."
              required
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
            ></textarea>
            <button
              type="submit"
              [disabled]="!messageText.trim() || isSending()"
              class="absolute right-2 top-2 px-3 py-1.5 bg-aethel-amber text-aethel-bg text-[10px] font-medium rounded hover:bg-aethel-gold transition disabled:opacity-40"
            >
              Надіслати
            </button>
          </div>
          @if (sendError()) {
            <p class="text-xs text-red-400 font-mono">{{ sendError() }}</p>
          }
        </form>
      </div>
    </section>
  `,
})
export class DirectMessagesComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly isOpen = signal(false);
  readonly partnerUsername = signal<string>('');
  readonly messages = signal<DirectMessageDTO[]>([]);
  readonly isSending = signal(false);
  readonly sendError = signal<string | null>(null);

  @Input() set autoOpen(partner: { username: string; id: string } | null) {
    if (partner) {
      this.openChat(partner.username, partner.id);
    }
  }

  messageText = '';
  private partnerId = '';

  readonly myId = signal<string>('');

  constructor() {
    effect(() => {
      this.auth.accessToken();
      const token = this.auth.accessToken();
      if (token) {
        this.myId.set(token);
      }
    });
  }

  openChat(partnerUsername: string, partnerId: string): void {
    this.partnerUsername.set(partnerUsername);
    this.partnerId = partnerId;
    this.isOpen.set(true);
    this.messageText = '';
    this.sendError.set(null);
    this.loadMessages();
  }

  closeChat(): void {
    this.isOpen.set(false);
    this.partnerUsername.set('');
    this.partnerId = '';
    this.messages.set([]);
  }

  loadMessages(): void {
    if (!this.partnerId) return;
    this.api.getDirectMessages(this.partnerId).subscribe({
      next: (data) => this.messages.set(data),
      error: () => this.messages.set([]),
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.messageText.trim() || this.isSending() || !this.partnerId) return;

    this.isSending.set(true);
    this.sendError.set(null);

    try {
      const created = await this.api
        .sendDirectMessage({
          receiver_id: this.partnerId,
          content: this.messageText.trim(),
        })
        .toPromise();

      if (created) {
        this.messages.update((list) => [...list, created]);
        this.messageText = '';
      }
    } catch (err: any) {
      this.sendError.set(err?.error?.message || 'Не вдалося надіслати повідомлення.');
    } finally {
      this.isSending.set(false);
    }
  }
}
