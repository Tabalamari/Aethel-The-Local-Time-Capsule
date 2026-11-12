import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireRegisteredUser,
} from '../middleware/authPrivacy';
import { UserProfile } from '../types/models';

export const profileRouter = Router();

// In-memory store for local development
export const localDemoProfiles = new Map<string, UserProfile>([
  [
    'demo-user-1',
    {
      id: 'demo-user-1',
      username: 'podil_archivist',
      role: 'partner_guardian',
      partner_badge_label: 'Хранитель історії · Кав’ярня Світлиця',
      created_at: new Date().toISOString(),
    },
  ],
  [
    'demo-user-2',
    {
      id: 'demo-user-2',
      username: 'lviv_rain_watcher',
      role: 'user',
      partner_badge_label: null,
      created_at: new Date().toISOString(),
    },
  ],
]);

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

/**
 * GET /api/profile/check-username?username=...
 * Real-time debounced check for username availability & format validity.
 */
profileRouter.get('/check-username', async (req: AuthenticatedRequest, res: Response) => {
  const raw = typeof req.query.username === 'string' ? req.query.username.trim() : '';

  if (!raw) {
    res.json({ available: false, reason: 'EMPTY', message: 'Введіть нікнейм' });
    return;
  }

  if (!USERNAME_REGEX.test(raw)) {
    res.json({
      available: false,
      reason: 'INVALID_FORMAT',
      message: 'Нікнейм має містити від 3 до 32 символів (латиниця, цифри, _, ., -)',
    });
    return;
  }

  const normalized = raw.toLowerCase();

  // Check against local demo profiles
  let taken = false;
  for (const [uid, prof] of localDemoProfiles.entries()) {
    if (prof.username.toLowerCase() === normalized && uid !== req.viewer?.id) {
      taken = true;
      break;
    }
  }

  res.json({
    available: !taken,
    reason: taken ? 'TAKEN' : 'OK',
    message: taken ? 'Цей нікнейм вже зайнятий' : 'Нікнейм вільний',
  });
});

/**
 * GET /api/profile/me
 * Returns the authenticated user's profile, or { needsOnboarding: true } if no username is set yet.
 */
profileRouter.get(
  '/me',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;

    const existing = localDemoProfiles.get(userId) || null;
    res.json({
      profile: existing,
      needsOnboarding: !existing,
    });
  }
);

/**
 * POST /api/profile/username
 * Claims a unique nickname during first-time onboarding (or updates it).
 */
profileRouter.post(
  '/username',
  requireRegisteredUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.viewer!.id;
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';

    if (!USERNAME_REGEX.test(rawUsername)) {
      res.status(400).json({
        error: 'INVALID_USERNAME',
        message: 'Нікнейм має містити від 3 до 32 символів (латиниця, цифри, _, ., -)',
      });
      return;
    }

    // Local demo mode check
    for (const [uid, prof] of localDemoProfiles.entries()) {
      if (prof.username.toLowerCase() === rawUsername.toLowerCase() && uid !== userId) {
        res.status(409).json({
          error: 'USERNAME_TAKEN',
          message: 'Цей унікальний нікнейм вже використовується іншим мешканцем.',
        });
        return;
      }
    }

    const newProfile: UserProfile = {
      id: userId,
      username: rawUsername,
      role: 'user',
      partner_badge_label: null,
      created_at: new Date().toISOString(),
    };
    localDemoProfiles.set(userId, newProfile);

    res.json({ profile: newProfile, needsOnboarding: false });
  }
);
