import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  attachViewerContext,
  forbidPublicAuthorFilter,
  requireRegisteredUser,
} from '../middleware/authPrivacy';
import { isSupabaseConfigured, supabaseAdmin } from '../config/supabase';
import { FutureLetterDTO, LocationItem, MediaItemDTO } from '../types/models';
import { profileRouter, localDemoProfiles } from './profile';

export const apiRouter = Router();

apiRouter.use(attachViewerContext);
apiRouter.use('/profile', profileRouter);

// Fallback seed data when Supabase .env is not connected yet
const SEED_LOCATIONS: LocationItem[] = [
  {
    id: 'loc-kyiv-podil',
    country: 'Україна',
    city: 'Київ',
    district: 'Поділ',
    center_lat: 50.4688,
    center_lng: 30.5161,
    created_at: new Date().toISOString(),
  },
  {
    id: 'loc-lviv-rynok',
    country: 'Україна',
    city: 'Львів',
    district: 'Площа Ринок',
    center_lat: 49.8419,
    center_lng: 24.0315,
    created_at: new Date().toISOString(),
  },
  {
    id: 'loc-odesa-prymorskyi',
    country: 'Україна',
    city: 'Одеса',
    district: 'Приморський',
    center_lat: 46.4825,
    center_lng: 30.7233,
    created_at: new Date().toISOString(),
  },
];

// 1. Health & Vault Countdown status
apiRouter.get('/vault', async (_req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin
      .from('vault_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      res.json(data);
      return;
    }
  }

  res.json({
    id: 'vault-main-2030',
    vault_title: 'Велика Капсула Часу Міста — 2030',
    description:
      'Спільний цифровий сейф спогадів, ранкових фото, голосів вулиць та листів у майбутнє.',
    unlock_at: '2030-01-01T00:00:00Z',
    is_locked: true,
  });
});

// 2. Locations hierarchy (Country -> City -> District)
apiRouter.get('/locations', async (_req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin
      .from('locations')
      .select('*')
      .order('country')
      .order('city')
      .order('district');

    if (!error && data) {
      res.json(data);
      return;
    }
  }
  res.json(SEED_LOCATIONS);
});

// 3. Public Media Feed (Daily Snapshots & Audio Map)
// Enforces Guest nickname privacy & forbids filtering by author
apiRouter.get(
  '/media',
  forbidPublicAuthorFilter,
  async (req: AuthenticatedRequest, res: Response) => {
    const isRegistered = Boolean(req.viewer?.isRegistered);
    const { location_id, year, month, media_type } = req.query;

    if (isSupabaseConfigured) {
      let query = supabaseAdmin
        .from('media_items')
        .select(
          `
          id,
          location_id,
          media_url,
          media_type,
          captured_date,
          caption,
          duration_seconds,
          latitude,
          longitude,
          is_spotlight,
          created_at,
          locations ( country, city, district ),
          users ( username, role, partner_badge_label )
        `
        )
        .order('is_spotlight', { ascending: false })
        .order('captured_date', { ascending: false });

      if (typeof location_id === 'string' && location_id) {
        query = query.eq('location_id', location_id);
      }
      if (typeof media_type === 'string' && media_type) {
        query = query.eq('media_type', media_type);
      }
      if (typeof year === 'string' && year) {
        const startMonth = typeof month === 'string' && month ? month.padStart(2, '0') : '01';
        const endMonth = typeof month === 'string' && month ? month.padStart(2, '0') : '12';
        query = query
          .gte('captured_date', `${year}-${startMonth}-01`)
          .lte('captured_date', `${year}-${endMonth}-31`);
      }

      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const sanitized: MediaItemDTO[] = (data || []).map((row: any) => ({
        id: row.id,
        location_id: row.location_id,
        location: row.locations,
        media_url: row.media_url,
        media_type: row.media_type,
        captured_date: row.captured_date,
        caption: row.caption,
        duration_seconds: row.duration_seconds,
        latitude: row.latitude,
        longitude: row.longitude,
        is_spotlight: row.is_spotlight,
        created_at: row.created_at,
        // Hide nickname for Guest viewers
        author_username: isRegistered ? row.users?.username ?? null : null,
        author_role: isRegistered ? row.users?.role ?? null : null,
        author_partner_badge: isRegistered ? row.users?.partner_badge_label ?? null : null,
      }));

      res.json(sanitized);
      return;
    }

    // Fallback demo items with Guest nickname redaction
    const demoItems: MediaItemDTO[] = [
      {
        id: 'snap-1',
        location_id: 'loc-kyiv-podil',
        location: { country: 'Україна', city: 'Київ', district: 'Поділ' },
        media_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
        media_type: 'photo',
        captured_date: '2026-11-10',
        caption: 'Ранковий туман над Контрактовою о 07:40 та перша кава біля трамвайної колії.',
        is_spotlight: true,
        created_at: new Date().toISOString(),
        author_username: isRegistered ? 'podil_archivist' : null,
        author_role: isRegistered ? 'partner_guardian' : null,
        author_partner_badge: isRegistered ? 'Хранитель історії · Кав’ярня Світлиця' : null,
      },
      {
        id: 'snap-2',
        location_id: 'loc-lviv-rynok',
        location: { country: 'Україна', city: 'Львів', district: 'Площа Ринок' },
        media_url: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?auto=format&fit=crop&w=900&q=80',
        media_type: 'photo',
        captured_date: '2026-11-09',
        caption: 'Дощовий вечір і відблиски ліхтарів на бруківці після закриття книгарень.',
        is_spotlight: false,
        created_at: new Date().toISOString(),
        author_username: isRegistered ? 'lviv_rain_watcher' : null,
        author_role: isRegistered ? 'user' : null,
        author_partner_badge: null,
      },
    ];

    res.json(demoItems);
  }
);

// 4. Personal Archive (Only the authenticated owner can view their own uploads)
apiRouter.get(
  '/my-archive',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('media_items')
        .select('*, locations ( country, city, district )')
        .eq('author_id', userId)
        .order('captured_date', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json(data || []);
      return;
    }

    const profile = localDemoProfiles.get(userId);
    if (userId === 'demo-user-1' || profile?.username === 'podil_archivist') {
      res.json([
        {
          id: 'snap-1',
          location_id: 'loc-kyiv-podil',
          location: { country: 'Україна', city: 'Київ', district: 'Поділ' },
          media_url:
            'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
          media_type: 'photo',
          captured_date: '2026-11-10',
          caption: 'Ранковий туман над Контрактовою о 07:40 та перша кава біля трамвайної колії.',
          is_spotlight: true,
          created_at: new Date().toISOString(),
          author_username: profile?.username || 'podil_archivist',
          author_role: profile?.role || 'partner_guardian',
          author_partner_badge:
            profile?.partner_badge_label || 'Хранитель історії · Кав’ярня Світлиця',
        },
      ]);
      return;
    }

    res.json([]);
  }
);

// 5. Future Letters (Server-side content lock until unlock_date <= today)
apiRouter.get('/future-letters', async (req: AuthenticatedRequest, res: Response) => {
  const isRegistered = Boolean(req.viewer?.isRegistered);
  const todayIso = new Date().toISOString().slice(0, 10);

  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin
      .from('future_letters')
      .select('id, location_id, title, content, unlock_date, created_at, users ( username )')
      .order('unlock_date', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const letters: FutureLetterDTO[] = (data || []).map((row: any) => {
      const unlocked = row.unlock_date <= todayIso;
      return {
        id: row.id,
        location_id: row.location_id,
        title: row.title,
        content: unlocked ? row.content : null,
        unlock_date: row.unlock_date,
        is_unlocked: unlocked,
        created_at: row.created_at,
        author_username: isRegistered ? row.users?.username ?? null : null,
      };
    });

    res.json(letters);
    return;
  }

  const demoLetters: FutureLetterDTO[] = [
    {
      id: 'letter-2050',
      location_id: 'loc-kyiv-podil',
      title: 'Тим, хто гулятиме Набережною у 2050 році',
      content: null, // Locked on backend until 2050-05-15
      unlock_date: '2050-05-15',
      is_unlocked: false,
      created_at: new Date().toISOString(),
      author_username: isRegistered ? 'podil_archivist' : null,
    },
  ];

  res.json(demoLetters);
});

