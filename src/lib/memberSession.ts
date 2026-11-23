import crypto from 'crypto';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
const TOKEN_PREFIX = 'dfm.';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSigningSecret(): string {
  const envSecret = (process.env.SESSION_SECRET || '').trim();
  return envSecret.length >= 16 ? envSecret : EPHEMERAL_FALLBACK_SECRET;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function phonesMatchTimingSafe(storedPhone: string, inputPhone: string): boolean {
  const a = normalizePhoneDigits(storedPhone);
  const b = normalizePhoneDigits(inputPhone);
  if (a.length < 6 || b.length < 6) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function signMemberSessionToken(memberId: string, email: string): string {
  const payload = {
    sub: memberId,
    email: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${TOKEN_PREFIX}${encodedPayload}.${signature}`;
}

export function isMemberSessionToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX);
}

export function verifyMemberSessionToken(
  token: string
): { memberId: string; email: string } | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dotIdx = body.indexOf('.');
  if (dotIdx <= 0) return null;

  const encodedPayload = body.slice(0, dotIdx);
  const providedSig = body.slice(dotIdx + 1);
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(providedSig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      email?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return { memberId: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}
