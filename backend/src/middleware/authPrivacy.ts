import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  viewer?: {
    id: string;
    email?: string;
    isRegistered: boolean;
  };
}

/**
 * Demo auth: токен у форматі demo-user-<id> розглядається як зареєстрований користувач.
 * Гості мають isRegistered = false.
 */
export function attachViewerContext(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
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

  if (token.startsWith('demo-user-')) {
    req.viewer = { id: token, isRegistered: true };
    next();
    return;
  }

  req.viewer = { id: '', isRegistered: false };
  next();
}

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
