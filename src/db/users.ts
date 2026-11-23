import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { members, users } from './schema.ts';

const OWNER_ADMIN_EMAIL = 'roykang007@gmail.com';

export function isBootstrapAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const configured = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (configured && normalized === configured) return true;
  return normalized === OWNER_ADMIN_EMAIL;
}

export async function getOrCreateUser(uid: string, email: string, name = '') {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isOwner = isBootstrapAdminEmail(normalizedEmail);

    const [existingAdmins, memberRows, existingUsers] = await Promise.all([
      db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN')).limit(1),
      normalizedEmail
        ? db.select().from(members).where(eq(members.email, normalizedEmail)).limit(1)
        : Promise.resolve([]),
      db.select().from(users).where(eq(users.uid, uid)).limit(1),
    ]);

    const linkedMember = memberRows[0] || null;
    let targetRole: 'ADMIN' | 'CUSTOMER' = 'CUSTOMER';

    if (isOwner) {
      targetRole = 'ADMIN';
      // Ensure owner is also visible in members list as ADMIN
      if (!linkedMember && normalizedEmail) {
        const now = new Date();
        await db
          .insert(members)
          .values({
            id: `mem-${crypto.randomBytes(5).toString('hex')}`,
            userUid: uid,
            name: name || 'DUFREEZ Owner',
            email: normalizedEmail,
            phone: '+852 2810 4920',
            district: 'Central & Western',
            tier: 'CRYO_VIP',
            role: 'ADMIN',
            preferredLang: 'ko',
            totalOrders: 0,
            totalSpentHkd: 0,
            status: 'ACTIVE',
            joinedAt: now,
            lastOrderAt: now,
          })
          .onConflictDoNothing();
      } else if (linkedMember && linkedMember.role !== 'ADMIN') {
        await db
          .update(members)
          .set({ role: 'ADMIN', userUid: linkedMember.userUid || uid })
          .where(eq(members.id, linkedMember.id));
      }
    } else if (linkedMember) {
      // Member table is the source of truth for admin designation
      targetRole =
        linkedMember.status === 'ACTIVE' && linkedMember.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
      if (!linkedMember.userUid) {
        await db
          .update(members)
          .set({ userUid: uid })
          .where(eq(members.id, linkedMember.id));
      }
    } else if (existingAdmins.length === 0) {
      targetRole = 'ADMIN';
    } else if (existingUsers.length > 0 && existingUsers[0].role === 'ADMIN') {
      targetRole = 'ADMIN';
    }

    if (existingUsers.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email: normalizedEmail,
          name: name || existingUsers[0].name,
          role: targetRole,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name,
        role: targetRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          name,
          role: targetRole,
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}
