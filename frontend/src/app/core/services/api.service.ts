import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getVaultStatus(): Observable<VaultStatus> {
    return this.http.get<VaultStatus>(`${this.baseUrl}/vault`);
  }

  getLocations(): Observable<LocationEntry[]> {
    return this.http.get<LocationEntry[]>(`${this.baseUrl}/locations`);
  }

  getMediaSnapshots(authToken?: string | null): Observable<MediaSnapshot[]> {
    let headers = new HttpHeaders();
    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
    }
    return this.http.get<MediaSnapshot[]>(`${this.baseUrl}/media`, { headers });
  }

  getMyArchive(): Observable<MediaSnapshot[]> {
    return this.http.get<MediaSnapshot[]>(`${this.baseUrl}/my-archive`);
  }
}
