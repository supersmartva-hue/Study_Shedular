import { prisma } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';

export async function register(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered') as any;
    err.status = 409;
    throw err;
  }
  const hashed = await hashPassword(password);
  const user   = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, language: true, timezone: true, createdAt: true },
  });
  const token        = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
  return { user, token, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password') as any;
    err.status = 401;
    throw err;
  }
  const valid = await comparePassword(password, user.password);
  if (!valid) {
    const err = new Error('Invalid email or password') as any;
    err.status = 401;
    throw err;
  }
  const token        = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
  const { password: _, ...safeUser } = user;
  return { user: safeUser, token, refreshToken };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user    = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('User not found');
  const token        = signAccessToken({ userId: user.id, email: user.email });
  const newRefresh   = signRefreshToken({ userId: user.id, email: user.email });
  return { token, refreshToken: newRefresh };
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, language: true, timezone: true, createdAt: true },
  });
}

export async function updateMe(
  userId: string,
  data: { name?: string; language?: string; timezone?: string }
) {
  return prisma.user.update({
    where:  { id: userId },
    data,
    select: { id: true, name: true, email: true, language: true, timezone: true },
  });
}
