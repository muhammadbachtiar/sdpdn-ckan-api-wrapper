import { Request, Response } from 'express';
import { z } from 'zod';
import { ckanService } from '../services/ckan.service';
import { mappingService, toSdpdnItem } from '../services/mapping.service';
import { normalizeFieldName, transformDatastore } from '../services/transformer.service';
import { notFound } from '../utils/errors';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

const num = (label: string) =>
  z.coerce.number({ message: `${label} harus berupa angka` }).int(`${label} harus bilangan bulat`);

const pageSchema = {
  page: num('page').min(1, 'page harus >= 1'),
  page_size: num('page_size').min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

const listQuery = z.object({
  ...pageSchema,
  tahun: num('tahun').min(1, 'tahun harus >= 1').optional(),
  kode_provinsi: z.string().optional(),
  kode_kab_kota: z.string().optional(),
  kode_bidang_urusan: z.string().optional(),
});

const detailQuery = z
  .object({
    id: num('id').min(1, 'id harus >= 1'),
    ...pageSchema,
    q: z.string().trim().optional(),
  })
  .passthrough();

const meta = (total: number, page: number, pageSize: number) => ({
  total_data: total,
  total_page: Math.ceil(total / pageSize),
  page,
  page_size: pageSize,
});

export async function getDatalist(req: Request, res: Response) {
  const q = listQuery.parse(req.query);
  const { total, rows } = await mappingService.list({
    page: q.page,
    pageSize: q.page_size,
    tahun: q.tahun,
    kodeBidangUrusan: q.kode_bidang_urusan,
  });
  res.json({
    message: 'Berhasil',
    code: 200,
    metadata: meta(total, q.page, q.page_size),
    datalist: rows.map(toSdpdnItem),
  });
}

export async function getDetail(req: Request, res: Response) {
  const q = detailQuery.parse(req.query);
  const mapping = await mappingService.findActiveById(q.id);
  if (!mapping) throw notFound();

  // Ambil skema kolom untuk reverse-mapping field filter
  const schemaResult = await ckanService.checkResource(mapping.ckanResourceId);
  const fieldMap = new Map<string, string>();
  for (const f of schemaResult.fields) {
    fieldMap.set(normalizeFieldName(f.id), f.id);
  }

  // Filter dinamis dari query parameter:
  // 1. Dukungan format JSON string (memudahkan testing langsung di Swagger UI: ?filters={"kecamatan":"Belida Darat"})
  // 2. Dukungan query param langsung (misal: ?kecamatan=Belida+Darat)
  const filters: Record<string, unknown> = {};
  const reservedKeys = new Set(['id', 'page', 'page_size', 'q', 'filters']);

  if (typeof req.query.filters === 'string' && req.query.filters.trim()) {
    try {
      const parsed = JSON.parse(req.query.filters);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          const originalField = fieldMap.get(normalizeFieldName(k));
          if (originalField && v !== undefined && v !== '') {
            filters[originalField] = v;
          }
        }
      }
    } catch {
      // Abaikan jika string bukan JSON valid
    }
  }

  for (const [key, val] of Object.entries(req.query)) {
    if (reservedKeys.has(key)) continue;
    const originalField = fieldMap.get(normalizeFieldName(key));
    if (originalField && val !== undefined && val !== '') {
      filters[originalField] = val;
    }
  }

  const offset = (q.page - 1) * q.page_size;
  const result = await ckanService.datastoreSearch(mapping.ckanResourceId, {
    limit: q.page_size,
    offset,
    q: q.q,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  const { field, data } = transformDatastore(
    result,
    mapping.fieldOverrides as Record<string, never> | null,
    mapping.klasifikasiData,
  );

  res.json({
    message: 'Berhasil',
    code: 200,
    metadata: meta(result.total, q.page, q.page_size),
    field,
    data,
  });
}
