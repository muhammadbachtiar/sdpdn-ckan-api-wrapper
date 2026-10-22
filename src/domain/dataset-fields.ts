import { z } from 'zod';

/**
 * SUMBER KEBENARAN tunggal pembagian field MANDATORY vs OPTIONAL.
 * Untuk memindahkan field antar kategori, cukup ubah di file ini
 * (dan nullability kolom di prisma/schema.prisma).
 */

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().min(1).max(max).nullish();

// ------------------------- MANDATORY -------------------------
export const mandatoryShape = {
  ckan_resource_id: str(100),
  nama_data: str(255),
  tahun: z.number().int().min(1900).max(2100),
  kode_urusan: str(20),
  nama_urusan: str(255),
  kode_bidang_urusan: str(20),
  nama_bidang_urusan: str(255),
};

// ------------------------- OPTIONAL --------------------------
const fieldOverrideSchema = z.object({
  data_type: z.enum(['string', 'integer', 'numeric', 'date']).optional(),
  length: z.number().int().positive().max(100000).optional(),
  klasifikasi_data: z.string().trim().min(1).max(50).optional(),
});

export const optionalShape = {
  ckan_package_id: optStr(100),
  nama_indikator: optStr(255),
  sumber_referensi: optStr(255),
  kode_produsen_data: optStr(50),
  jadwal_release: optStr(100),
  jadwal_pemutakhiran: optStr(100),
  jenis_data: optStr(100),
  kode_standard_data: optStr(100),
  klasifikasi_data: optStr(50),
  satuan: optStr(50),
  kategori_rad: optStr(100),
  status_prioritas: optStr(100),
  tanggal_data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'format harus YYYY-MM-DD')
    .nullish(),
  endpoint_url: z.string().url().max(500).nullish(),
  field_overrides: z.record(z.string(), fieldOverrideSchema).nullish(),
  is_active: z.boolean().optional(),
};

export const createMappingSchema = z.object({ ...mandatoryShape, ...optionalShape });
export const updateMappingSchema = z
  .object({ ...mandatoryShape, ...optionalShape })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Minimal satu field harus diisi');

export type CreateMappingInput = z.infer<typeof createMappingSchema>;
export type FieldOverride = z.infer<typeof fieldOverrideSchema>;

/**
 * Fallback tampilan untuk field OPTIONAL yang kosong (null) pada payload SDPDN.
 * Jika optional diisi, nilai asli dipakai; jika kosong, nilai di bawah ini ditayangkan.
 */
export const OPTIONAL_FALLBACKS = {
  nama_indikator: '---belum dibuat---',
  sumber_referensi: '---belum dibuat---',
  kode_produsen_data: '---belum dibuat---',
  jadwal_release: '---informasi dikosongkan---',
  jadwal_pemutakhiran: '---belum dibuat---',
  jenis_data: '---belum dibuat---',
  kode_standard_data: '---belum dibuat---',
  klasifikasi_data: 'terbuka',
  satuan: '---belum dibuat---',
  kategori_rad: '---belum dibuat---',
  status_prioritas: '---belum dibuat---',
} as const;
