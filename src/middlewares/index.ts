import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError, unauthorized } from '../utils/errors';

/** Validasi PASIF: wrapper tidak menerbitkan token, memverifikasi token dari SPLP. */
export function passiveJwt(req: Request, _res: Response, next: NextFunction) {
  // Dukung token dari header Authorization, Internal-Key, atau X-JWT-Assertion
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && /^Bearer\s+\S+$/i.test(authHeader)) {
    token = authHeader.split(/\s+/)[1];
  } else if (typeof req.headers['internal-key'] === 'string' && req.headers['internal-key'].trim()) {
    token = req.headers['internal-key'].trim();
  } else if (typeof req.headers['x-jwt-assertion'] === 'string' && req.headers['x-jwt-assertion'].trim()) {
    token = req.headers['x-jwt-assertion'].trim();
  }

  if (!token) {
    return next(unauthorized());
  }

  // Decode struktur JWT untuk verifikasi format dan diagnostik
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded !== 'object') {
    return next(unauthorized());
  }

  const payload = decoded.payload as { exp?: number; iss?: string; aud?: string | string[] };
  if (payload?.exp && Date.now() >= payload.exp * 1000) {
    return next(new AppError(401, 'Token SPLP sudah kadaluwarsa'));
  }

  // Jika SPLP_JWT_SECRET diset 'bypass' (mode onboarding saat secret resmi SPLP belum diterima)
  if (env.SPLP_JWT_SECRET.toLowerCase() === 'bypass') {
    console.log('[SPLP AUTH] Mode bypass aktif. Token diterima:', {
      alg: decoded.header.alg,
      kid: decoded.header.kid,
      issuer: payload?.iss,
      expiresAt: payload?.exp ? new Date(payload.exp * 1000).toISOString() : 'no-exp',
    });
    return next();
  }

  try {
    jwt.verify(token, env.SPLP_JWT_SECRET, {
      algorithms: [env.SPLP_JWT_ALGORITHM],
      ...(env.SPLP_JWT_ISSUER ? { issuer: env.SPLP_JWT_ISSUER } : {}),
      ...(env.SPLP_JWT_AUDIENCE ? { audience: env.SPLP_JWT_AUDIENCE } : {}),
    });
    next();
  } catch {
    next(unauthorized());
  }
}

/** Proteksi CRUD admin via header x-api-key. */
export function adminAuth(req: Request, _res: Response, next: NextFunction) {
  const provided = Buffer.from(String(req.headers['x-api-key'] ?? ''));
  const expected = Buffer.from(env.ADMIN_API_KEY);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return next(new AppError(401, 'API key admin tidak valid'));
  }
  next();
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Endpoint tidak ditemukan'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Parameter tidak valid',
      code: 400,
      errors: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.statusCode,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }
  const e = err as { type?: string; code?: string };
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Body JSON tidak valid', code: 400 });
  }
  if (e?.code === 'P2002') {
    return res.status(409).json({ message: 'ckan_resource_id sudah terdaftar', code: 409 });
  }
  if (e?.code === 'P2025') {
    return res.status(404).json({ message: 'Dataset tidak ditemukan', code: 404 });
  }
  console.error(err);
  return res.status(500).json({ message: 'Terjadi kesalahan internal pada server data', code: 500 });
}
