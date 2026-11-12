import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  username: string;
  role: 'user' | 'partner_guardian';
  partner_badge_label?: string | null;
  created_at: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  reason: 'EMPTY' | 'INVALID_FORMAT' | 'TAKEN' | 'OK';
  message: string;
}

export interface ProfileMeResponse {
  profile: UserProfile | null;
  needsOnboarding: boolean;
}

const STORAGE_TOKEN_KEY = 'aethel_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly accessToken = signal<string | null>(localStorage.getItem(STORAGE_TOKEN_KEY));
  readonly profile = signal<UserProfile | null>(null);
  readonly needsOnboarding = signal<boolean>(false);
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly authNotice = signal<string | null>(null);

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));
  readonly isRegistered = computed(
    () => Boolean(this.accessToken() && this.profile()?.username && !this.needsOnboarding())
  );

  constructor() {
    if (this.accessToken()) {
      this.refreshProfile();
    }
  }

  openAuthModal(notice?: string): void {
    this.authNotice.set(notice || null);
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.authNotice.set(null);
  }

  async signInWithGoogle(): Promise<void> {
    // Local fallback when Supabase credentials are not configured yet
    this.signInDemoNewUser();
  }

  async sendMagicLink(email: string): Promise<{ sent: boolean; message: string }> {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      return { sent: false, message: 'Введіть коректну електронну пошту.' };
    }

    // Local development simulation: sign in as a new user requiring unique username onboarding
    this.signInDemoNewUser();
    return {
      sent: true,
      message: 'Демо-режим: виконано швидкий вхід. Оберіть свій унікальний нікнейм!',
    };
  }

  /**
   * Simulates first-time login so the user is prompted to pick a unique username.
   */
  signInDemoNewUser(): void {
    const newId = `demo-user-${Date.now()}`;
    this.setSessionToken(newId);
    this.closeAuthModal();
    this.refreshProfile();
  }

  /**
   * Simulates login as an already-onboarded resident (@podil_archivist).
   */
  signInDemoExistingUser(): void {
    this.setSessionToken('demo-user-1');
    this.closeAuthModal();
    this.refreshProfile();
  }

  signOut(): void {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    this.accessToken.set(null);
    this.profile.set(null);
    this.needsOnboarding.set(false);
  }

  refreshProfile(): void {
    if (!this.accessToken()) {
      this.profile.set(null);
      this.needsOnboarding.set(false);
      return;
    }

    this.http.get<ProfileMeResponse>(`${this.baseUrl}/profile/me`).subscribe({
      next: (res) => {
        this.profile.set(res.profile);
        this.needsOnboarding.set(res.needsOnboarding);
      },
      error: () => {
        this.profile.set(null);
        this.needsOnboarding.set(false);
      },
    });
  }

  checkUsername(username: string): Observable<UsernameCheckResponse> {
    return this.http.get<UsernameCheckResponse>(`${this.baseUrl}/profile/check-username`, {
      params: { username },
    });
  }

  claimUsername(username: string): Observable<ProfileMeResponse> {
    return this.http
      .post<ProfileMeResponse>(`${this.baseUrl}/profile/username`, { username })
      .pipe(
        tap((res) => {
          this.profile.set(res.profile);
          this.needsOnboarding.set(res.needsOnboarding);
        })
      );
  }

  private setSessionToken(token: string): void {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    this.accessToken.set(token);
  }
}
