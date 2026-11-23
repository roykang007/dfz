import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { members } from '../db/schema.ts';
import { getOrCreateUser, isBootstrapAdminEmail } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { isMemberSessionToken, verifyMemberSessionToken } from '../lib/memberSession.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number | string;
    uid: string;
    email: string;
    name: string;
    role: string;
  };
}

async function resolveBearerUser(token: string): Promise<{
  decoded?: DecodedIdToken;
  dbUser: { id: number | string; uid: string; email: string; name: string; role: string };
} | null> {
  if (isMemberSessionToken(token)) {
    const payload = verifyMemberSessionToken(token);
    if (!payload) return null;

    const rows = await db
      .select()
      .from(members)
      .where(eq(members.id, payload.memberId))
      .limit(1);

    const member = rows[0];
    if (
      !member ||
      member.status !== 'ACTIVE' ||
      member.email.toLowerCase() !== payload.email.toLowerCase()
    ) {
      return null;
    }

    const effectiveRole =
      member.role === 'ADMIN' || isBootstrapAdminEmail(member.email) ? 'ADMIN' : 'CUSTOMER';

    return {
      dbUser: {
        id: member.id,
        uid: member.userUid || member.id,
        email: member.email,
        name: member.name,
        role: effectiveRole,
      },
    };
  }

  const decodedToken = await adminAuth.verifyIdToken(token);
  const dbUser = await getOrCreateUser(
    decodedToken.uid,
    decodedToken.email || '',
    decodedToken.name || ''
  );
  return { decoded: decodedToken, dbUser };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty authentication token.' });
    return;
  }

  try {
    const resolved = await resolveBearerUser(token);
    if (!resolved) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
      return;
    }
    if (resolved.decoded) req.user = resolved.decoded;
    req.dbUser = resolved.dbUser;
    next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.dbUser || req.dbUser.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Administrator access required.' });
      return;
    }
    next();
  });
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const resolved = await resolveBearerUser(token);
        if (resolved) {
          if (resolved.decoded) req.user = resolved.decoded;
          req.dbUser = resolved.dbUser;
        }
      } catch {
        // Public checkout continues cleanly even if optional token is absent/expired
      }
    }
  }
  next();
}
