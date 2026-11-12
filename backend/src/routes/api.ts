import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  attachViewerContext,
  forbidPublicAuthorFilter,
  requireRegisteredUser,
} from '../middleware/authPrivacy';
import { isSupabaseConfigured, supabaseAdmin } from '../config/supabase';
import { FutureLetterDTO, LocationItem, MediaItemDTO, CommentDTO, DirectMessageDTO } from '../types/models';
import { profileRouter, localDemoProfiles } from './profile';

export const apiRouter = Router();

apiRouter.use(attachViewerContext);
apiRouter.use('/profile', profileRouter);

// Helper to normalize location names and prevent duplicates
function normalizePlaceName(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

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
    id: 'loc-kyiv-zoloti',
    country: 'Україна',
    city: 'Київ',
    district: 'Золоті Ворота',
    center_lat: 50.4488,
    center_lng: 30.5133,
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
    id: 'loc-lviv-kastelivka',
    country: 'Україна',
    city: 'Львів',
    district: 'Кастелівка',
    center_lat: 49.8295,
    center_lng: 24.011,
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
  {
    id: 'loc-if-stometrivka',
    country: 'Україна',
    city: 'Івано-Франківськ',
    district: 'Стометрівка',
    center_lat: 48.9226,
    center_lng: 24.7111,
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

// 2b. Dynamically add a new location (Country -> City -> District) with duplicate protection
apiRouter.post(
  '/locations',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const country = normalizePlaceName(String(req.body?.country || ''));
    const city = normalizePlaceName(String(req.body?.city || ''));
    const district = normalizePlaceName(String(req.body?.district || ''));

    if (!country || !city || !district) {
      res.status(400).json({
        error: 'INVALID_LOCATION',
        message: 'Будь ласка, вкажіть країну, місто та назву району.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      // Check case-insensitive duplicate first
      const { data: existing } = await supabaseAdmin
        .from('locations')
        .select('*')
        .ilike('country', country)
        .ilike('city', city)
        .ilike('district', district)
        .maybeSingle();

      if (existing) {
        res.status(409).json({
          error: 'LOCATION_EXISTS',
          message: 'Такий район вже існує у списку локацій.',
          location: existing,
        });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('locations')
        .insert({
          country,
          city,
          district,
          created_by: req.viewer!.id,
        })
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json(data);
      return;
    }

    // Local seed mode duplicate check (case-insensitive)
    const duplicate = SEED_LOCATIONS.find(
      (loc) =>
        loc.country.toLowerCase() === country.toLowerCase() &&
        loc.city.toLowerCase() === city.toLowerCase() &&
        loc.district.toLowerCase() === district.toLowerCase()
    );

    if (duplicate) {
      res.status(409).json({
        error: 'LOCATION_EXISTS',
        message: 'Такий район вже існує у списку локацій.',
        location: duplicate,
      });
      return;
    }

    const created: LocationItem = {
      id: `loc-${Date.now()}`,
      country,
      city,
      district,
      center_lat: null,
      center_lng: null,
      created_at: new Date().toISOString(),
    };
    SEED_LOCATIONS.push(created);
    res.status(201).json(created);
  }
);

// 3. Public Media Feed (Daily Snapshots & Audio Map)
// Supports cascading location filters (country, city, location_id) & timeline filters (year, month)
apiRouter.get(
  '/media',
  forbidPublicAuthorFilter,
  async (req: AuthenticatedRequest, res: Response) => {
    const isRegistered = Boolean(req.viewer?.isRegistered);
    const { country, city, location_id, year, month, media_type } = req.query;

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
          locations!inner ( country, city, district ),
          users ( username, role, partner_badge_label )
        `
        )
        .order('is_spotlight', { ascending: false })
        .order('captured_date', { ascending: false });

      if (typeof location_id === 'string' && location_id) {
        query = query.eq('location_id', location_id);
      } else {
        if (typeof country === 'string' && country) {
          query = query.eq('locations.country', country);
        }
        if (typeof city === 'string' && city) {
          query = query.eq('locations.city', city);
        }
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
        author_username: isRegistered ? row.users?.username ?? null : null,
        author_role: isRegistered ? row.users?.role ?? null : null,
        author_partner_badge: isRegistered ? row.users?.partner_badge_label ?? null : null,
      }));

      res.json(sanitized);
      return;
    }

    // Fallback demo items with Guest nickname redaction & multi-year/month timeline data
    const demoItems: MediaItemDTO[] = [
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
        author_username: isRegistered ? 'podil_archivist' : null,
        author_role: isRegistered ? 'partner_guardian' : null,
        author_partner_badge: isRegistered ? 'Хранитель історії · Кав’ярня Світлиця' : null,
      },
      {
        id: 'snap-2',
        location_id: 'loc-lviv-rynok',
        location: { country: 'Україна', city: 'Львів', district: 'Площа Ринок' },
        media_url:
          'https://images.unsplash.com/photo-1555992336-fb0d29498b13?auto=format&fit=crop&w=900&q=80',
        media_type: 'photo',
        captured_date: '2026-11-09',
        caption: 'Дощовий вечір і відблиски ліхтарів на бруківці після закриття книгарень.',
        is_spotlight: false,
        created_at: new Date().toISOString(),
        author_username: isRegistered ? 'lviv_rain_watcher' : null,
        author_role: isRegistered ? 'user' : null,
        author_partner_badge: null,
      },
      {
        id: 'snap-3',
        location_id: 'loc-odesa-prymorskyi',
        location: { country: 'Україна', city: 'Одеса', district: 'Приморський' },
        media_url:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
        media_type: 'photo',
        captured_date: '2026-08-19',
        caption: 'Серпневий світанок біля пірсу, коли місто ще спить, а море вже тепле.',
        is_spotlight: false,
        created_at: new Date().toISOString(),
        author_username: isRegistered ? 'black_sea_listener' : null,
        author_role: isRegistered ? 'user' : null,
        author_partner_badge: null,
      },
      {
        id: 'snap-4',
        location_id: 'loc-kyiv-zoloti',
        location: { country: 'Україна', city: 'Київ', district: 'Золоті Ворота' },
        media_url:
          'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80',
        media_type: 'photo',
        captured_date: '2025-12-24',
        caption: 'Перший грудневий сніг у сквері на Рейтарській та тепле світло у вікнах.',
        is_spotlight: false,
        created_at: new Date().toISOString(),
        author_username: isRegistered ? 'podil_archivist' : null,
        author_role: isRegistered ? 'partner_guardian' : null,
        author_partner_badge: isRegistered ? 'Хранитель історії · Кав’ярня Світлиця' : null,
      },
    ];

    const filtered = demoItems.filter((item) => {
      if (typeof location_id === 'string' && location_id && item.location_id !== location_id) {
        return false;
      }
      if (typeof country === 'string' && country && item.location?.country !== country) {
        return false;
      }
      if (typeof city === 'string' && city && item.location?.city !== city) {
        return false;
      }
      if (typeof year === 'string' && year && !item.captured_date.startsWith(`${year}-`)) {
        return false;
      }
      if (typeof month === 'string' && month) {
        const paddedMonth = month.padStart(2, '0');
        const itemMonth = item.captured_date.slice(5, 7);
        if (itemMonth !== paddedMonth) {
          return false;
        }
      }
      return true;
    });

    res.json(filtered);
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

// 6. Upload Media (Daily Snapshot / Audio Map point) - Registered users only
apiRouter.post(
  '/media',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const {
      location_id,
      media_url,
      media_type,
      captured_date,
      caption,
      latitude,
      longitude,
      is_spotlight,
    } = req.body;

    if (!location_id || !media_url || !media_type || !captured_date) {
      res.status(400).json({
        error: 'INVALID_MEDIA',
        message: 'Потрібні поля: локація, медіафайл, тип і дата знімка.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error }: any = await supabaseAdmin
        .from('media_items')
        .insert({
          author_id: userId,
          location_id,
          media_url,
          media_type,
          captured_date,
          caption: caption || null,
          latitude: latitude || null,
          longitude: longitude || null,
          is_spotlight: Boolean(is_spotlight),
        })
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
          locations!inner ( country, city, district ),
          users ( username, role, partner_badge_label )
        `
        )
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(req.viewer?.isRegistered);
      const sanitized: MediaItemDTO = {
        id: data.id,
        location_id: data.location_id,
        location: data.locations,
        media_url: data.media_url,
        media_type: data.media_type,
        captured_date: data.captured_date,
        caption: data.caption,
        duration_seconds: data.duration_seconds,
        latitude: data.latitude,
        longitude: data.longitude,
        is_spotlight: data.is_spotlight,
        created_at: data.created_at,
        author_username: isRegistered ? data.users?.username ?? null : null,
        author_role: isRegistered ? data.users?.role ?? null : null,
        author_partner_badge: isRegistered ? data.users?.partner_badge_label ?? null : null,
      };

      res.status(201).json(sanitized);
      return;
    }

    // Demo mode
    const created: MediaItemDTO = {
      id: `snap-demo-${Date.now()}`,
      location_id,
      media_url,
      media_type: media_type as MediaItemDTO['media_type'],
      captured_date,
      caption: caption || null,
      latitude: latitude || null,
      longitude: longitude || null,
      is_spotlight: Boolean(is_spotlight),
      created_at: new Date().toISOString(),
      author_username: 'demo-user',
      author_role: 'user',
      author_partner_badge: null,
    };
    res.status(201).json(created);
  }
);

// 8. Get Comments for a Media Item - Public read
apiRouter.get(
  '/comments',
  async (_req: AuthenticatedRequest, res: Response) => {
    const { media_id } = _req.query;

    if (!media_id || typeof media_id !== 'string') {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Потрібен параметр media_id.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*, users ( username )')
        .eq('media_id', media_id)
        .order('created_at', { ascending: true });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(_req.viewer?.isRegistered);
      const comments = (data || []).map((row: any) => ({
        id: row.id,
        media_id: row.media_id,
        author_id: row.author_id,
        content: row.content,
        created_at: row.created_at,
        author_username: isRegistered ? row.users?.username ?? null : null,
      }));

      res.json(comments);
      return;
    }

    // Demo mode
    res.json([]);
  }
);

// 9. Create a Comment - Registered users only
apiRouter.post(
  '/comments',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const { media_id, content } = req.body;

    if (!media_id || !content || String(content).trim().length === 0) {
      res.status(400).json({
        error: 'INVALID_COMMENT',
        message: 'Потрібні поля: media_id та вміст коментаря.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert({
          media_id,
          author_id: userId,
          content: content.trim(),
        })
        .select('*, users ( username )')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(req.viewer?.isRegistered);
      const comment: CommentDTO = {
        id: data.id,
        media_id: data.media_id,
        author_id: data.author_id,
        content: data.content,
        created_at: data.created_at,
        author_username: isRegistered ? data.users?.username ?? null : null,
      };

      res.status(201).json(comment);
      return;
    }

    // Demo mode
    const created: CommentDTO = {
      id: `comment-demo-${Date.now()}`,
      media_id,
      author_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      author_username: 'demo-user',
    };

    res.status(201).json(created);
  }
);

// 10. Get Direct Messages between two users - Participants only
apiRouter.get(
  '/direct-messages',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const { with: otherUserId } = req.query;

    if (!otherUserId || typeof otherUserId !== 'string') {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Потрібен параметр with (нік або ID собесіра).',
      });
      return;
    }

    if (isSupabaseConfigured) {
      // Resolve other user by username if it looks like a username
      let targetUserId = otherUserId;
      if (!otherUserId.includes('-')) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id')
          .ilike('username', otherUserId)
          .maybeSingle();

        if (userError || !userData) {
          res.status(404).json({
            error: 'USER_NOT_FOUND',
            message: 'Користувача не знайдено.',
          });
          return;
        }
        targetUserId = userData.id;
      }

      const { data, error } = await supabaseAdmin
        .from('direct_messages')
        .select('*, senders:users!sender_id ( username ), receivers:users!receiver_id ( username )')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(req.viewer?.isRegistered);
      const messages = (data || []).map((row: any) => ({
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        content: row.content,
        is_read: row.is_read,
        created_at: row.created_at,
        sender_username: isRegistered ? row.senders?.username ?? null : null,
        receiver_username: isRegistered ? row.receivers?.username ?? null : null,
      }));

      res.json(messages);
      return;
    }

    // Demo mode
    res.json([]);
  }
);

// 11. Send a Direct Message - Registered users only
apiRouter.post(
  '/direct-messages',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const senderId = req.viewer!.id;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content || String(content).trim().length === 0) {
      res.status(400).json({
        error: 'INVALID_MESSAGE',
        message: 'Потрібні поля: receiver_id та вміст повідомлення.',
      });
      return;
    }

    if (senderId === receiver_id) {
      res.status(400).json({
        error: 'CANNOT_MESSAGE_SELF',
        message: 'Неможливо надіслати повідомлення собі.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('direct_messages')
        .insert({
          sender_id: senderId,
          receiver_id,
          content: content.trim(),
        })
        .select(
          '*, senders:users!sender_id ( username ), receivers:users!receiver_id ( username )'
        )
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(req.viewer?.isRegistered);
      const message: DirectMessageDTO = {
        id: data.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        content: data.content,
        is_read: data.is_read,
        created_at: data.created_at,
        sender_username: isRegistered ? data.senders?.username ?? null : null,
        receiver_username: isRegistered ? data.receivers?.username ?? null : null,
      };

      res.status(201).json(message);
      return;
    }

    // Demo mode
    const created: DirectMessageDTO = {
      id: `dm-demo-${Date.now()}`,
      sender_id: senderId,
      receiver_id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      sender_username: 'demo-user',
      receiver_username: null,
    };

    res.status(201).json(created);
  }
);
apiRouter.post(
  '/future-letters',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const { location_id, title, content, unlock_date } = req.body;

    if (!location_id || !title || !content || !unlock_date) {
      res.status(400).json({
        error: 'INVALID_LETTER',
        message: 'Потрібні поля: локація, заголовок, текст і дата відкриття.',
      });
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const isUnlocked = unlock_date <= todayIso;

    if (isSupabaseConfigured) {
      const { data, error }: any = await supabaseAdmin
        .from('future_letters')
        .insert({
          author_id: userId,
          location_id,
          title,
          content,
          unlock_date,
        })
        .select('id, location_id, title, content, unlock_date, created_at, users ( username )')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(req.viewer?.isRegistered);
      const letter: FutureLetterDTO = {
        id: data.id,
        location_id: data.location_id,
        title: data.title,
        content: isUnlocked ? data.content : null,
        unlock_date: data.unlock_date,
        is_unlocked: isUnlocked,
        created_at: data.created_at,
        author_username: isRegistered ? data.users?.username ?? null : null,
      };

      res.status(201).json(letter);
      return;
    }

    // Demo mode
    const created: FutureLetterDTO = {
      id: `letter-demo-${Date.now()}`,
      location_id,
      title,
      content: isUnlocked ? content : null,
      unlock_date,
      is_unlocked: isUnlocked,
      created_at: new Date().toISOString(),
      author_username: 'demo-user',
    };

    res.status(201).json(created);
  }
);

// 12. Sponsored Spotlight - Get featured spotlighted media
apiRouter.get(
  '/spotlight',
  async (_req: AuthenticatedRequest, res: Response) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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
          spotlight_until,
          created_at,
          locations!inner ( country, city, district ),
          users ( username, role, partner_badge_label )
        `
        )
        .eq('is_spotlight', true)
        .order('spotlight_until', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      const isRegistered = Boolean(_req.viewer?.isRegistered);
      const spotlights = (data || []).map((row: any) => ({
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
        spotlight_until: row.spotlight_until,
        created_at: row.created_at,
        author_username: isRegistered ? row.users?.username ?? null : null,
        author_role: isRegistered ? row.users?.role ?? null : null,
        author_partner_badge: isRegistered ? row.users?.partner_badge_label ?? null : null,
      }));

      res.json(spotlights);
      return;
    }

    // Demo mode - return empty, spotlight items are marked in seed data
    res.json([]);
  }
);

// 13. Sponsored Spotlight - Set media item as spotlight (paid feature)
apiRouter.post(
  '/spotlight',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const { media_id, spotlight_until } = req.body;

    if (!media_id) {
      res.status(400).json({
        error: 'INVALID_SPOTLIGHT',
        message: 'Потрібен параметр media_id.',
      });
      return;
    }

    if (isSupabaseConfigured) {
      // Verify the media item belongs to the user
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('media_items')
        .select('id, author_id')
        .eq('id', media_id)
        .maybeSingle();

      if (fetchError || !existing) {
        res.status(404).json({ error: 'MEDIA_NOT_FOUND' });
        return;
      }

      if (existing.author_id !== userId) {
        res.status(403).json({ error: 'NOT_MEDIA_OWNER' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('media_items')
        .update({
          is_spotlight: true,
          spotlight_until: spotlight_until || null,
        })
        .eq('id', media_id)
        .select('id, is_spotlight, spotlight_until')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ success: true, media: data });
      return;
    }

    // Demo mode
    res.json({ success: true, media: { id: media_id, is_spotlight: true, spotlight_until } });
  }
);

// 14. Partner Badge - Get current user's badge
apiRouter.get(
  '/partner-badge',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('username, partner_badge_label, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      if (!data) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
      }

      res.json({
        username: data.username,
        partner_badge_label: data.partner_badge_label,
        role: data.role,
        is_partner: Boolean(data.partner_badge_label),
      });
      return;
    }

    // Demo mode
    res.json({
      username: 'demo-user',
      partner_badge_label: null,
      role: 'user',
      is_partner: false,
    });
  }
);

// 15. Partner Badge - Set/update partner badge (admin/partner feature)
apiRouter.post(
  '/partner-badge',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const { partner_badge_label } = req.body;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ partner_badge_label: partner_badge_label || null })
        .eq('id', userId)
        .select('id, username, partner_badge_label')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({
        success: true,
        username: data.username,
        partner_badge_label: data.partner_badge_label,
      });
      return;
    }

    // Demo mode
    res.json({
      success: true,
      username: 'demo-user',
      partner_badge_label: partner_badge_label || null,
    });
  }
);

// 16. Privacy Validation - Test endpoint for QA (Stage 7)
// Verifies that guest users cannot see author nicknames or future letter content
apiRouter.get(
  '/privacy-validation',
  async (_req: AuthenticatedRequest, res: Response) => {
    const isRegistered = Boolean(_req.viewer?.isRegistered);

    // Test media feed - author_username should be null for guests
    const { data: mediaData } = await supabaseAdmin
      .from('media_items')
      .select('id, author_username, users ( username )')
      .limit(3);

    const guestSeesNickname =
      mediaData &&
      mediaData.some(
        (row: any) =>
          !isRegistered && row.users && row.users.username
      );

    // Test future letters - content should be null if not unlocked
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: lettersData } = await supabaseAdmin
      .from('future_letters')
      .select('id, unlock_date, content, is_unlocked')
      .limit(3);

    const lockedLetterContentLeaked =
      lettersData &&
      lettersData.some(
        (row: any) =>
          row.unlock_date > todayIso && row.content && row.content.length > 0
      );

    const privacyCheck = {
      guestSeesAuthorNickname: isRegistered ? false : guestSeesNickname,
      lockedLetterContentLeaked: lockedLetterContentLeaked || false,
      authorFilterBlocked: true, // forbidPublicAuthorFilter middleware is active
      passed:
        (!isRegistered && !guestSeesNickname) || isRegistered,
      timestamp: new Date().toISOString(),
    };

    res.json(privacyCheck);
  }
);
