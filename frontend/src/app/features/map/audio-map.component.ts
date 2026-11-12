import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, MediaSnapshot } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface SoundPoint {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  audioUrl: string;
  duration?: number;
  author?: string;
  createdAt: string;
}

@Component({
  selector: 'app-audio-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-audio">
            Мапа звуків та спогадів
          </span>
          <h3 class="text-base font-serif text-aethel-cream mt-1">
            Аудіогеотігування района
          </h3>
          <p class="text-xs text-aethel-muted mt-1">
            Звукові точки — голосові історії, шум вулиць, прибій, ранковий гул міста.
          </p>
        </div>
        @if (auth.isAuthenticated()) {
          <button
            type="button"
            (click)="toggleRecord()"
            class="px-4 py-2 rounded-lg bg-aethel-audio text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition"
          >
            {{ isRecording() ? '⏹ Зупинити запис' : '🎙 Записати звук' }}
          </button>
        } @else {
          <button
            type="button"
            (click)="promptGuest()"
            class="px-4 py-2 rounded-lg border border-aethel-audio/60 text-aethel-audio font-medium text-xs hover:bg-aethel-audio hover:text-aethel-bg transition"
          >
            🎙 Записати (вхід)
          </button>
        }
      </div>

      <!-- Map area -->
      <div class="aspect-video rounded-xl border border-aethel-border bg-aethel-bg/30 relative overflow-hidden">
        <div class="absolute inset-0 flex flex-col items-center justify-center text-aethel-muted text-xs font-mono">
          <span class="mb-2">🗺 Інтерактивна мапа звукових точок</span>
          <span class="text-[10px] opacity-60">Leaflet / Mapbox інтеграція</span>
        </div>
        <!-- Sound point markers overlay -->
        <div class="absolute inset-0 pointer-events-none">
          @for (point of soundPoints(); track point.id) {
            <div
              class="absolute pointer-events-auto"
              [style.left.%]="pointMarkerX(point)"
              [style.top.%]="pointMarkerY(point)"
            >
              <button
                (click)="selectPoint(point)"
                class="relative flex flex-col items-center"
              >
                <div class="w-6 h-6 rounded-full border-2 border-aethel-audio bg-aethel-surface shadow-md flex items-center justify-center text-[10px] font-bold text-aethel-audio transition hover:scale-110 hover:z-10 cursor-pointer">
                  🔊
                </div>
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-aethel-surface border border-aethel-audio text-[10px] text-aethel-cream whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                  {{ point.title }}
                </div>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Recording status -->
      @if (isRecording()) {
        <div class="p-3 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span class="text-xs font-mono text-red-200">Запис аудіо триває...</span>
          <button
            type="button"
            (click)="stopRecording()"
            class="ml-auto text-xs font-mono text-red-400 hover:text-red-200 underline"
          >
            Зупинити
          </button>
        </div>
      }

      <!-- Sound points list -->
      <div class="space-y-2">
        <h4 class="text-xs font-mono uppercase tracking-widest text-aethel-muted">
          Звукові точки ({{ soundPoints().length }})
        </h4>
        <div class="space-y-2">
          @for (point of soundPoints(); track point.id) {
            <div
              class="p-3 rounded-lg border border-aethel-border bg-aethel-surface cursor-pointer hover:border-aethel-audio/50 transition group"
              (click)="selectPoint(point)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono text-aethel-audio font-semibold">{{ point.title }}</span>
                    @if (point.author) {
                      <span class="text-[10px] font-mono text-a-muted">                      {{ point.author }}</span>
                    }
                  </div>
                  <div class="text-[10px] font-mono text-aethel-muted">
                    {{ point.location }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  @if (point.duration) {
                    <span class="text-[10px] font-mono text-aethel-muted">
                      {{ point.duration }}с
                    </span>
                  }
                  <audio
                    [src]="point.audioUrl"
                    class="w-24 h-6"
                    controls
                    list="audio-default"
                  >
                    Ваш браузер не підтримує аудіоплеєр.
                  </audio>
                </div>
              </div>
            </div>
          }
          @if (soundPoints().length === 0) {
            <div class="p-4 rounded-lg border border-aethel-border/30 bg-aethel-bg/30 text-center">
              <p class="text-xs text-aethel-muted">
                Ще немає звукових точок. Запишіть перший шум вашого району.
              </p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class AudioMapComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly isRecording = signal(false);
  readonly selectedPoint = signal<SoundPoint | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  private readonly _soundPoints = signal<SoundPoint[]>([
    {
      id: 'sp-1',
      title: 'Ранковий туман над Контрактовою',
      location: 'Київ → Поділ',
      lat: 50.4688,
      lng: 30.5161,
      audioUrl: '',
      duration: 45,
      author: 'podil_archivist',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sp-2',
      title: 'Дощовий вечір на Площі Ринок',
      location: 'Львів → Центр',
      lat: 49.8419,
      lng: 24.0315,
      audioUrl: '',
      duration: 62,
      author: 'lviv_rain_watcher',
      createdAt: new Date().toISOString(),
    },
  ]);
  readonly soundPoints = this._soundPoints.asReadonly();

  constructor() {
    effect(() => {
      this.auth.accessToken();
    });
  }

  pointMarkerX(point: SoundPoint): number {
    // Simple distribution across map width
    return 20 + (point.id.charCodeAt(0) % 60);
  }

  pointMarkerY(point: SoundPoint): number {
    return 30 + (point.id.charCodeAt(1) % 50);
  }

  selectPoint(point: SoundPoint): void {
    this.selectedPoint.set(point);
  }

  toggleRecord(): void {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = Math.round(audioBlob.size / 1000); // rough estimate

        const point: SoundPoint = {
          id: `sp-${Date.now()}`,
          title: `Запис ${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`,
          location: 'Нова точка',
          lat: 50.4501,
          lng: 30.5234,
          audioUrl,
          duration,
          author: 'Ви',
          createdAt: new Date().toISOString(),
        };

        this._soundPoints.update((list) => [...list, point]);
        this.selectedPoint.set(point);
        stream.getTracks().forEach((t) => t.stop());
      };

      this.mediaRecorder.start(1000);
      this.isRecording.set(true);
    } catch (err) {
      console.error('Recording failed', err);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  promptGuest(): void {
    this.auth.openAuthModal('Увійдіть, щоб записувати звукові точки.');
  }
}
