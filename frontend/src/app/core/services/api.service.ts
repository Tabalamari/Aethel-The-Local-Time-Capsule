import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VaultStatus {
  id: string;
  vault_title: string;
  description: string;
  unlock_at: string;
  is_locked: boolean;
}

export interface LocationEntry {
  id: string;
  country: string;
  city: string;
  district: string;
}

export interface CreateLocationPayload {
  country: string;
  city: string;
  district: string;
}

export interface MediaFilterParams {
  country?: string;
  city?: string;
  location_id?: string;
  year?: string;
  month?: string;
}

export interface MediaSnapshot {
  id: string;
  location_id: string;
  location?: {
    country: string;
    city: string;
    district: string;
  };
  media_url: string;
  media_type: 'photo' | 'video' | 'audio';
  captured_date: string;
  caption?: string | null;
  is_spotlight: boolean;
  author_username: string | null;
  author_role: 'user' | 'partner_guardian' | null;
  author_partner_badge?: string | null;
}

export interface FutureLetterDTO {
  id: string;
  location_id: string;
  title: string;
  content: string | null;
  unlock_date: string;
  is_unlocked: boolean;
  created_at: string;
  author_username: string | null;
}

export interface CommentDTO {
  id: string;
  media_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_username: string | null;
}

export interface DirectMessageDTO {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username: string | null;
  receiver_username: string | null;
}

export interface SpotlightDTO {
  id: string;
  location_id: string;
  location?: {
    country: string;
    city: string;
    district: string;
  };
  media_url: string;
  media_type: 'photo' | 'video' | 'audio';
  captured_date: string;
  caption?: string | null;
  duration_seconds?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  is_spotlight: boolean;
  spotlight_until?: string | null;
  created_at: string;
  author_username: string | null;
  author_role: 'user' | 'partner_guardian' | null;
  author_partner_badge?: string | null;
}

export interface PartnerBadgeDTO {
  username: string | null;
  partner_badge_label: string | null;
  role: 'user' | 'partner_guardian' | null;
  is_partner: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  getVaultStatus(): Observable<VaultStatus> {
    return this.http.get<VaultStatus>(`${this.baseUrl}/vault`);
  }

  getLocations(): Observable<LocationEntry[]> {
    return this.http.get<LocationEntry[]>(`${this.baseUrl}/locations`);
  }

  createLocation(payload: CreateLocationPayload): Observable<LocationEntry> {
    return this.http.post<LocationEntry>(`${this.baseUrl}/locations`, payload);
  }

  createMedia(payload: {
    location_id: string;
    media_url: string;
    media_type: 'photo' | 'video' | 'audio';
    captured_date: string;
    caption?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    is_spotlight?: boolean;
  }): Observable<MediaSnapshot> {
    return this.http.post<MediaSnapshot>(`${this.baseUrl}/media`, payload);
  }

  createFutureLetter(payload: {
    location_id: string;
    title: string;
    content: string;
    unlock_date: string;
  }): Observable<FutureLetterDTO> {
    return this.http.post<FutureLetterDTO>(`${this.baseUrl}/future-letters`, payload);
  }

  getFutureLetters(): Observable<FutureLetterDTO[]> {
    return this.http.get<FutureLetterDTO[]>(`${this.baseUrl}/future-letters`);
  }

  getMediaSnapshots(
    filters?: MediaFilterParams,
    authToken?: string | null
  ): Observable<MediaSnapshot[]> {
    let headers = new HttpHeaders();
    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
    }

    let params = new HttpParams();
    if (filters?.country) params = params.set('country', filters.country);
    if (filters?.city) params = params.set('city', filters.city);
    if (filters?.location_id) params = params.set('location_id', filters.location_id);
    if (filters?.year) params = params.set('year', filters.year);
    if (filters?.month) params = params.set('month', filters.month);

    return this.http.get<MediaSnapshot[]>(`${this.baseUrl}/media`, { headers, params });
  }

  getMyArchive(): Observable<MediaSnapshot[]> {
    return this.http.get<MediaSnapshot[]>(`${this.baseUrl}/my-archive`);
  }

  getComments(mediaId: string): Observable<CommentDTO[]> {
    return this.http.get<CommentDTO[]>(`${this.baseUrl}/comments`, {
      params: { media_id: mediaId },
    });
  }

  createComment(payload: { media_id: string; content: string }): Observable<CommentDTO> {
    return this.http.post<CommentDTO>(`${this.baseUrl}/comments`, payload);
  }

  getDirectMessages(otherUserId: string): Observable<DirectMessageDTO[]> {
    return this.http.get<DirectMessageDTO[]>(`${this.baseUrl}/direct-messages`, {
      params: { with: otherUserId },
    });
  }

  sendDirectMessage(payload: {
    receiver_id: string;
    content: string;
  }): Observable<DirectMessageDTO> {
    return this.http.post<DirectMessageDTO>(`${this.baseUrl}/direct-messages`, payload);
  }

  getSpotlight(): Observable<SpotlightDTO[]> {
    return this.http.get<SpotlightDTO[]>(`${this.baseUrl}/spotlight`);
  }

  setSpotlight(payload: {
    media_id: string;
    spotlight_until?: string | null;
  }): Observable<{ success: boolean; media: SpotlightDTO }> {
    return this.http.post<{ success: boolean; media: SpotlightDTO }>(
      `${this.baseUrl}/spotlight`,
      payload
    );
  }

  getPartnerBadge(): Observable<PartnerBadgeDTO> {
    return this.http.get<PartnerBadgeDTO>(`${this.baseUrl}/partner-badge`);
  }

  setPartnerBadge(payload: {
    partner_badge_label: string | null;
  }): Observable<{ success: boolean; username: string; partner_badge_label: string | null }> {
    return this.http.post<{ success: boolean; username: string; partner_badge_label: string | null }>(
      `${this.baseUrl}/partner-badge`,
      payload
    );
  }
}
