import { Request, Response, NextFunction } from 'express';
import { supabaseAnon, isSupabaseConfigured } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  viewer?: {
    id: string;
    email?: string;
    isRegistered: boolean;
  };
}

/**
 * Extracts optional Bearer token from Authorization header.
 * Guests are allowed to browse public endpoints, but `viewer.isRegistered` will be false
 * so downstream handlers strip author nicknames (`username`).
 */
export async function attachViewerContext(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.viewer = { id: '', isRegistered: false };
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    req.viewer = { id: '', isRegistered: false };
    next();
    return;
  }

  if (!isSupabaseConfigured) {
    // Development fallback when using demo token
    if (token.startsWith('demo-user-')) {
      req.viewer = { id: token, isRegistered: true };
      next();
      return;
    }
    req.viewer = { id: '', isRegistered: false };
    next();
    return;
  }

  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user) {
      req.viewer = { id: '', isRegistered: false };
    } else {
      req.viewer = {
        id: data.user.id,
        email: data.user.email,
        isRegistered: true,
      };
    }
  } catch {
    req.viewer = { id: '', isRegistered: false };
  }

  next();
}

/**
 * Requires a registered user for protected mutations (uploads, comments, DMs, personal archive).
 */
export function requireRegisteredUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.viewer?.isRegistered || !req.viewer.id) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Увійдіть та оберіть унікальний нікнейм для виконання цієї дії.',
    });
    return;
  }
  next();
}

/**
 * Blocks filtering the public feed by specific author (PRD section 2:
 * "інші користувачі не можуть робити вибірку за конкретним автором").
 */
export function forbidPublicAuthorFilter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.query.author || req.query.author_id || req.query.username) {
    res.status(403).json({
      error: 'AUTHOR_FILTER_FORBIDDEN',
      message:
        'Вибірка публікацій за конкретним автором заборонена правилами приватності капсули часу.',
    });
    return;
  }
  next();
}

