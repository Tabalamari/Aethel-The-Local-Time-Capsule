import { Component, inject, signal, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CommentDTO } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h4 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Comments ({{ comments().length }})
        </h4>
        @if (!auth.isAuthenticated()) {
          <button
            type="button"
            (click)="promptGuest()"
            class="text-[10px] font-mono text-aethel-amber hover:underline px-2 py-1"
          >
            Sign in to comment
          </button>
        }
      </div>

      <!-- Comments List -->
      <div class="space-y-3">
        @for (comment of comments(); track comment.id) {
          <article class="p-3 rounded-lg border border-aethel-border bg-aethel-surface/50">
            <div class="flex items-start justify-between gap-2 mb-1">
              <div>
                @if (comment.author_username) {
                  <span class="text-xs font-mono font-semibold text-aethel-gold">
                    {{ comment.author_username }}
                  </span>
                } @else {
                  <span class="text-xs font-mono text-aethel-muted italic">
                    Anonymous Resident
                  </span>
                }
                <span class="text-[10px] font-mono text-aethel-muted ml-2">
                  · {{ comment.created_at | date:'MMM dd, HH:mm' }}
                </span>
              </div>
            </div>
            <p class="text-sm text-aethel-cream/90 leading-relaxed">
              {{ comment.content }}
            </p>
          </article>
        }
        @if (comments().length === 0) {
          <div class="p-4 rounded-lg border border-aethel-border/30 bg-aethel-bg/30 text-center">
            <p class="text-xs text-aethel-muted">
              No comments yet. Be the first to leave a review.
            </p>
          </div>
        }
      </div>

      <!-- Comment Input -->
      @if (auth.isAuthenticated()) {
        <form (ngSubmit)="onSubmit()" class="space-y-2" #commentForm="ngForm">
          <div class="relative">
            <textarea
              [(ngModel)]="commentText"
              name="content"
              rows="2"
              placeholder="Write your comment..."
              required
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-amber"
            ></textarea>
            @if (commentText.length > 0) {
              <button
                type="submit"
                [disabled]="isPosting()"
                class="absolute right-2 top-2 px-3 py-1.5 bg-aethel-amber text-aethel-bg text-[10px] font-medium rounded hover:bg-aethel-gold transition disabled:opacity-40"
              >
                Send
              </button>
            }
          </div>
          @if (postError()) {
            <p class="text-xs text-red-400 font-mono">{{ postError() }}</p>
          }
        </form>
      }
    </section>
  `,
})
export class CommentsComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  @Input() mediaId = '';

  readonly comments = signal<CommentDTO[]>([]);
  readonly isPosting = signal(false);
  readonly postError = signal<string | null>(null);

  commentText = '';

  constructor() {
    effect(() => {
      this.auth.accessToken();
      if (this.mediaId) {
        this.loadComments();
      }
    });
  }

  loadComments(): void {
    if (!this.mediaId) return;
    this.api.getComments(this.mediaId).subscribe({
      next: (data) => this.comments.set(data),
      error: () => this.comments.set([]),
    });
  }

  promptGuest(): void {
    this.auth.openAuthModal('Sign in to leave a comment.');
  }

  async onSubmit(): Promise<void> {
    if (!this.commentText.trim() || this.isPosting()) return;

    this.isPosting.set(true);
    this.postError.set(null);

    try {
      const created = await this.api
        .createComment({ media_id: this.mediaId, content: this.commentText.trim() })
        .toPromise();

      if (created) {
        this.comments.update((list) => [...list, created]);
        this.commentText = '';
      }
    } catch (err: any) {
      this.postError.set(err?.error?.message || 'Failed to send comment.');
    } finally {
      this.isPosting.set(false);
    }
  }
}
