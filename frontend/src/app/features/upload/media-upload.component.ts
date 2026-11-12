import {
  Component,
  inject,
  signal,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, LocationEntry, MediaSnapshot } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-media-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="p-6 rounded-xl border border-aethel-upload bg-aethel-surface space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-upload">
            Adding Memory
          </span>
          <h3 class="text-base font-serif text-aethel-cream mt-1">
            Upload photo or video to the time capsule
          </h3>
        </div>
        @if (auth.isAuthenticated()) {
          <button
            type="button"
            (click)="toggleUpload()"
            class="text-xs font-mono px-3 py-1.5 rounded border border-aethel-upload/60 text-aethel-upload hover:bg-aethel-upload hover:text-aethel-bg transition"
          >
            {{ isOpen() ? '✕ Cancel' : '+ Upload Media' }}
          </button>
        } @else {
          <button
            type="button"
            (click)="promptGuest()"
            class="text-xs font-mono px-3 py-1.5 rounded border border-aethel-upload/60 text-aethel-upload hover:bg-aethel-upload hover:text-aethel-bg transition"
          >
            + Upload (Sign In)
          </button>
        }
      </div>

      @if (isOpen() && auth.isAuthenticated()) {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-mono text-aethel-muted mb-1.5">
                Media File (photo or video)
              </label>
              <div class="relative group" (click)="fileInput.click()">
                <input
                  type="file"
                  #fileInput
                  accept="image/*,video/*"
                  (change)="onFileSelected($event)"
                  class="sr-only"
                />
                <div
                  class="aspect-video rounded-xl border-2 border-dashed border-aethel-upload bg-aethel-bg p-4 text-center hover:border-aethel-upload/50 transition"
                >
                  @if (previewUrl()) {
                    <img
                      [src]="previewUrl()"
                      class="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      (click)="removeFile()"
                      class="absolute top-2 right-2 bg-red-900/50 text-red-200 text-xs font-mono px-2 py-1 rounded hover:bg-red-700 transition"
                    >
                      ✕
                    </button>
                  } @else {
                    <div class="flex flex-col items-center justify-center h-full text-aethel-muted">
                      <span class="text-xs font-mono mb-2">Click to select file</span>
                      <span class="text-[10px] font-mono opacity-50">
                        Photo · Video (up to 2-3 min)
                      </span>
                    </div>
                  }
                </div>
                @if (validationError()) {
                  <p class="text-xs text-red-400 mt-1 font-mono">{{ validationError() }}</p>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-mono text-aethel-muted mb-1.5">
                Location
              </label>
              <select
                [(ngModel)]="selectedLocationId"
                name="location_id"
                required
                class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-upload"
              >
                <option value="">Select district</option>
                @for (loc of locations(); track loc.id) {
                  <option [value]="loc.id">
                    {{ loc.country }} → {{ loc.city }} → {{ loc.district }}
                  </option>
                }
              </select>
            </div>

            <div class="sm:col-span-1">
              <label class="block text-xs font-mono text-aethel-muted mb-1.5">
                Creation Date
              </label>
              <input
                type="date"
                [(ngModel)]="capturedDate"
                name="captured_date"
                required
                class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-upload"
              />
            </div>
          </div>

          <div>
<label class="block text-xs font-mono text-aethel-muted mb-1.5">
                Caption (optional)
              </label>
            <textarea
              [(ngModel)]="caption"
              name="caption"
              rows="3"
              placeholder="Morning coffee by the tram tracks..."
              class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-upload"
            ></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            @if (isUploading()) {
              <span class="text-xs font-mono text-aethel-upload">Saving...</span>
            } @else if (uploadStatus()) {
              <span class="text-xs font-mono text-aethel-upload">{{ uploadStatus() }}</span>
            }

            <button
              type="submit"
              [disabled]="!canUpload() || isUploading()"
              class="px-4 py-2 rounded-lg bg-aethel-upload text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Memory
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class MediaUploadComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  @Input() set locations(value: LocationEntry[]) {
    this._locations.set(value || []);
  }

  get locations() {
    return this._locations();
  }
  private readonly _locations = signal<LocationEntry[]>([]);

  @Output() readonly uploadComplete = new EventEmitter<MediaSnapshot>();

  readonly isOpen = signal(false);
  readonly isUploading = signal(false);
  readonly uploadStatus = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);

  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);
  selectedLocationId = '';
  capturedDate = new Date().toISOString().slice(0, 10);
  caption = '';

  toggleUpload(): void {
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) {
      this.resetForm();
    }
  }

  promptGuest(): void {
    this.auth.openAuthModal('Sign in to upload media files to the time capsule.');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    this.validationError.set(null);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      this.validationError.set('Only photo or video files allowed.');
      return;
    }

    const maxSizeMB = isVideo ? 100 : 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      this.validationError.set(
        `File too large (max ${maxSizeMB} MB for ${isVideo ? 'video' : 'image'}).`
      );
      return;
    }

    if (isVideo) {
      this.validateVideoDuration(file).then((err) => {
        if (err) {
          this.validationError.set(err);
          this.selectedFile = null;
          this.previewUrl.set(null);
        } else {
          this.selectedFile = file;
          this.previewUrl.set(URL.createObjectURL(file));
        }
      });
    } else {
      this.selectedFile = file;
      this.previewUrl.set(URL.createObjectURL(file));
    }
  }

  private validateVideoDuration(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const duration = video.duration;
        const maxSeconds = 180;
        if (duration > maxSeconds) {
          resolve(`Video too long (max 3 minutes, now ${Math.round(duration)}s).`);
        } else {
          resolve(null);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  }

  removeFile(): void {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.selectedFile = null;
    this.previewUrl.set(null);
    this.validationError.set(null);
  }

  resetForm(): void {
    this.removeFile();
    this.selectedLocationId = '';
    this.capturedDate = new Date().toISOString().slice(0, 10);
    this.caption = '';
    this.uploadStatus.set(null);
  }

  canUpload(): boolean {
    return Boolean(
      this.selectedFile &&
        this.selectedLocationId &&
        this.capturedDate &&
        !this.validationError() &&
        !this.isUploading()
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.canUpload()) return;

    this.isUploading.set(true);
    this.uploadStatus.set('Saving memory...');
    this.validationError.set(null);

    try {
      const mediaType = this.selectedFile!.type.startsWith('video/') ? 'video' : 'photo';

      const result = {
        location_id: this.selectedLocationId,
        media_url: this.previewUrl()!,
        media_type: mediaType as 'photo' | 'video',
        captured_date: this.capturedDate,
        caption: this.caption || null,
        latitude: null,
        longitude: null,
        is_spotlight: false,
      };

      const created = await this.api.createMedia(result).toPromise();

      if (created) {
        this.uploadStatus.set('Saved!');
        this.uploadComplete.emit(created);
        this.resetForm();
        this.isOpen.set(false);
      }
    } catch (err: any) {
      this.validationError.set(err?.error?.message || 'Failed to upload media file.');
    } finally {
      this.isUploading.set(false);
    }
  }
}
