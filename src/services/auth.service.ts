import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User, { IUser } from '../models/user.model';
import Organization from '../models/organization.model';
import Folder from '../models/folder.model';
import { validatePasswordOrThrow } from '../utils/password-validator';
import HttpError from '../models/error.model';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.service';

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

// 30 días en ms
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RegisterUserDto {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  role?: 'user' | 'admin';
}

export interface LoginUserDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: Partial<IUser>;
  refreshToken?: string; // solo cuando rememberMe=true
}

/** Hash del refresh token (NO se guarda el token plano) */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerUser({
  name,
  email,
  password,
  organizationId,
  role = 'user',
}: RegisterUserDto): Promise<Partial<IUser>> {
  const nameRegex = /^[a-zA-Z0-9\s]+$/;
  if (!name || !nameRegex.test(name.trim())) {
    throw new HttpError(400, 'Name must contain only alphanumeric characters and spaces');
  }

  const emailRegex = /^[^\s@]+@([^\s@.]+\.)+[^\s@.]{2,}$/;
  if (!email || !emailRegex.test(email.toLowerCase())) {
    throw new HttpError(400, 'Invalid email format');
  }

  validatePasswordOrThrow(password);

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new HttpError(400, 'Invalid organization ID');
  }

  const organization = await Organization.findOne({ _id: organizationId, active: true });
  if (!organization) {
    throw new HttpError(404, 'Organization not found or inactive');
  }

  const currentUsersCount = await User.countDocuments({ organization: organizationId, active: true });
  if (currentUsersCount >= (organization.settings.maxUsers || 100)) {
    throw new HttpError(403, `Organization has reached maximum users limit (${organization.settings.maxUsers})`);
  }

  const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    organization: organizationId,
    storageUsed: 0,
    loginAttempts: 0,
    lockUntil: null,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
  });

  organization.members.push(user._id as mongoose.Types.ObjectId);
  await organization.save();

  const rootFolderName = `root_user_${user._id}`;
  const safeSlug = organization.slug.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  const rootFolderPath = `/${safeSlug}/${user._id}`;

  const storageRoot = path.join(process.cwd(), 'storage');
  const safeUserId = user._id.toString().replace(/[^a-z0-9]/gi, '');
  const userStoragePath = path.join(storageRoot, safeSlug, safeUserId);

  if (!fs.existsSync(userStoragePath)) {
    fs.mkdirSync(userStoragePath, { recursive: true });
  }

  const rootFolder = await Folder.create({
    name: rootFolderName,
    displayName: 'Mi Unidad',
    type: 'root',
    organization: organizationId,
    owner: user._id,
    parent: null,
    path: rootFolderPath,
    permissions: [
      {
        userId: user._id,
        role: 'owner',
      },
    ],
  });

  user.rootFolder = rootFolder._id as mongoose.Types.ObjectId;
  await user.save();

  const userObj = user.toJSON();
  return { ...userObj, _id: user._id };
}

/**
 * Login:
 * - genera accessToken (siempre)
 * - si rememberMe=true: genera refreshToken, lo hashea y lo guarda con expiración 30d
 */
export async function loginUser({ email, password, rememberMe }: LoginUserDto): Promise<AuthResponse> {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new HttpError(400, 'Invalid credentials');
  }

  // 🔒 Config bloqueo temporal
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_MINUTES = 15;
  const LOCK_MS = LOCK_MINUTES * 60 * 1000;

  const user = await User.findOne({ email: { $eq: email } });
  if (!user) throw new HttpError(404, 'User not found');

  if (!user.active) throw new HttpError(403, 'User account is not active');

  // Si hubo lock y ya pasó el tiempo, resetea
  if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  // Si está bloqueado todavía
  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    const msLeft = user.lockUntil.getTime() - Date.now();
    const minutesLeft = Math.ceil(msLeft / 60000);
    throw new HttpError(423, `Account locked. Try again in ${minutesLeft} minute(s)`);
  }

  const valid = await bcrypt.compare(password, user.password);

  // ❌ Password incorrecta => sumar intento + bloquear si llega al máximo
  if (!valid) {
    const attempts = (user.loginAttempts || 0) + 1;
    user.loginAttempts = attempts;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MS);
    }

    await user.save();

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new HttpError(423, `Account locked. Try again in ${LOCK_MINUTES} minute(s)`);
    }

    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    throw new HttpError(401, `Invalid password. ${remaining} attempt(s) remaining`);
  }

  // ✅ Login exitoso => reset contador y lock
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  // --- Tu lógica de tokens (access + refresh si rememberMe) ---
  const accessToken = signAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  if (!rememberMe) {
    return { accessToken, user: user.toJSON() };
  }

  const refreshToken = signRefreshToken({
    id: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await user.save();

  return { accessToken, refreshToken, user: user.toJSON() };
}


/**
 * Refresh:
 * - valida refresh token
 * - verifica que coincida con el hash guardado
 * - rota refresh (emite uno nuevo y reemplaza hash + exp)
 * - emite access nuevo
 */
export async function refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: Partial<IUser> }> {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new HttpError(401, 'Refresh token required');
  }

  let decoded: any;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }

  if (decoded.type !== 'refresh' || !decoded.id) {
    throw new HttpError(401, 'Invalid refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  if (!user.active) throw new HttpError(403, 'User account is not active');

  // TokenVersion mismatch => refresh inválido (por cambio de password o invalidación)
  if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
    throw new HttpError(401, 'Refresh token invalidated');
  }

  if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw new HttpError(401, 'Refresh session not found');
  }

  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    // Limpia estado
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();
    throw new HttpError(401, 'Refresh token expired');
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== user.refreshTokenHash) {
    throw new HttpError(401, 'Refresh token does not match');
  }

  // Emitir nuevo access
  const accessToken = signAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  // Rotación de refresh (recomendado)
  const newRefreshToken = signRefreshToken({
    id: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });

  user.refreshTokenHash = hashToken(newRefreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken, user: user.toJSON() };
}

/** Logout “real”: revoca refresh en DB si existe cookie */
export async function revokeRefresh(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;

  try {
    const decoded: any = verifyRefreshToken(refreshToken);
    if (!decoded?.id) return;

    const user = await User.findById(decoded.id);
    if (!user) return;

    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();
  } catch {
    // no hacemos nada si el token es inválido
  }
}

export default {
  registerUser,
  loginUser,
  refreshSession,
  revokeRefresh,
};
