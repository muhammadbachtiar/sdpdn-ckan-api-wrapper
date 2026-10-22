import type { DatasetMapping } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { CreateMappingInput, OPTIONAL_FALLBACKS } from '../domain/dataset-fields';

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** API (snake_case) -> kolom Prisma (camelCase). */
export function toDbData(input: Partial<CreateMappingInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const key = toCamel(k);
    if (key === 'tanggalData') out[key] = v ? new Date(`${v as string}T00:00:00.000Z`) : null;
    else if (key === 'fieldOverrides') out[key] = v === null ? Prisma.JsonNull : v;
    else out[key] = v;
  }
  return out;
}

/** Bentuk admin: apa adanya (nilai null tetap null) agar admin tahu field mana yang belum diisi. */
export function toAdminView(m: DatasetMapping) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m)) {
    out[toSnake(k)] = v instanceof Date ? (k === 'tanggalData' ? fmtDate(v) : v.toISOString()) : v;
  }
  out.endpoint = detailEndpoint(m);
  return out;
}

export function detailEndpoint(m: Pick<DatasetMapping, 'id' | 'endpointUrl'>): string {
  return m.endpointUrl ?? `${env.WRAPPER_PUBLIC_URL}/api/v1/datalist/detail/?id=${m.id}`;
}

/** Bentuk SDPDN (datalist): optional kosong -> fallback, optional terisi -> nilai asli. */
export function toSdpdnItem(m: DatasetMapping) {
  return {
    id: m.id,
    tahun: m.tahun,
    kode_provinsi: env.DEFAULT_KODE_PROVINSI,
    kode_kab_kota: env.DEFAULT_KODE_KAB_KOTA,
    kode_urusan: m.kodeUrusan,
    nama_urusan: m.namaUrusan,
    kode_bidang_urusan: m.kodeBidangUrusan,
    nama_bidang_urusan: m.namaBidangUrusan,
    nama_data: m.namaData,
    nama_indikator: m.namaIndikator ?? OPTIONAL_FALLBACKS.nama_indikator,
    sumber_referensi: m.sumberReferensi ?? OPTIONAL_FALLBACKS.sumber_referensi,
    kode_produsen_data: m.kodeProdusenData ?? OPTIONAL_FALLBACKS.kode_produsen_data,
    jadwal_release: m.jadwalRelease ?? OPTIONAL_FALLBACKS.jadwal_release,
    jadwal_pemutakhiran: m.jadwalPemutakhiran ?? OPTIONAL_FALLBACKS.jadwal_pemutakhiran,
    jenis_data: m.jenisData ?? OPTIONAL_FALLBACKS.jenis_data,
    kode_standard_data: m.kodeStandardData ?? OPTIONAL_FALLBACKS.kode_standard_data,
    klasifikasi_data: m.klasifikasiData ?? OPTIONAL_FALLBACKS.klasifikasi_data,
    satuan: m.satuan ?? OPTIONAL_FALLBACKS.satuan,
    kategori_rad: m.kategoriRad ?? OPTIONAL_FALLBACKS.kategori_rad,
    status_prioritas: m.statusPrioritas ?? OPTIONAL_FALLBACKS.status_prioritas,
    tanggal_data: fmtDate(m.tanggalData ?? m.updatedAt),
    endpoint: detailEndpoint(m),
  };
}

export interface ListFilter {
  page: number;
  pageSize: number;
  tahun?: number;
  kodeBidangUrusan?: string;
  includeInactive?: boolean;
}

export const mappingService = {
  async list(f: ListFilter) {
    const where: Prisma.DatasetMappingWhereInput = {
      ...(f.includeInactive ? {} : { isActive: true }),
      ...(f.tahun ? { tahun: f.tahun } : {}),
      ...(f.kodeBidangUrusan ? { kodeBidangUrusan: f.kodeBidangUrusan } : {}),
    };
    const [total, rows] = await prisma.$transaction([
      prisma.datasetMapping.count({ where }),
      prisma.datasetMapping.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
    ]);
    return { total, rows };
  },

  findActiveById: (id: number) =>
    prisma.datasetMapping.findFirst({ where: { id, isActive: true } }),

  findById: (id: number) => prisma.datasetMapping.findUnique({ where: { id } }),

  create: (input: CreateMappingInput) =>
    prisma.datasetMapping.create({ data: toDbData(input) as Prisma.DatasetMappingCreateInput }),

  update: (id: number, input: Partial<CreateMappingInput>) =>
    prisma.datasetMapping.update({ where: { id }, data: toDbData(input) as Prisma.DatasetMappingUpdateInput }),

  softDelete: (id: number) =>
    prisma.datasetMapping.update({ where: { id }, data: { isActive: false } }),

  hardDelete: (id: number) => prisma.datasetMapping.delete({ where: { id } }),
};
