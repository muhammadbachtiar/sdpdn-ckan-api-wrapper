import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  WRAPPER_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),

  SPLP_JWT_SECRET: z.string().min(1),
  SPLP_JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512', 'RS256']).default('HS256'),
  SPLP_JWT_ISSUER: z.string().optional(),
  SPLP_JWT_AUDIENCE: z.string().optional(),

  ADMIN_API_KEY: z.string().min(16, 'ADMIN_API_KEY minimal 16 karakter'),

  CKAN_BASE_URL: z.string().url(),
  CKAN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  DEFAULT_KODE_PROVINSI: z.string().default('16'),
  DEFAULT_KODE_KAB_KOTA: z.string().default('16.03'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Konfigurasi .env tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  WRAPPER_PUBLIC_URL: parsed.data.WRAPPER_PUBLIC_URL.replace(/\/+$/, ''),
  CKAN_BASE_URL: parsed.data.CKAN_BASE_URL.replace(/\/+$/, ''),
};
