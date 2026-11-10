export type UserRole = 'user' | 'partner_guardian';
export type MediaType = 'photo' | 'video' | 'audio';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  partner_badge_label?: string | null;
  created_at: string;
}

export interface LocationItem {
  id: string;
  country: string;
  city: string;
  district: string;
  center_lat?: number | null;
  center_lng?: number | null;
  created_at: string;
}

export interface MediaItemDTO {
  id: string;
  location_id: string;
  location?: {
    country: string;
    city: string;
    district: string;
  };
  media_url: string;
  media_type: MediaType;
  captured_date: string;
  caption?: string | null;
  duration_seconds?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  is_spotlight: boolean;
  created_at: string;
  // Stripped to null when requester is a Guest (PRD section 2)
  author_username: string | null;
  author_role: UserRole | null;
  author_partner_badge?: string | null;
}

export interface FutureLetterDTO {
  id: string;
  location_id: string;
  title: string;
  // Null until unlock_date <= current date (PRD section 3.1)
  content: string | null;
  unlock_date: string;
  is_unlocked: boolean;
  created_at: string;
  author_username: string | null;
}

