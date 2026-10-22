import { Request, Response } from 'express';
import { z } from 'zod';
import { createMappingSchema, updateMappingSchema } from '../domain/dataset-fields';
import { ckanService } from '../services/ckan.service';
import { mappingService, toAdminView } from '../services/mapping.service';
import { transformDatastore } from '../services/transformer.service';
import { notFound } from '../utils/errors';

const idParam = z.object({ id: z.coerce.number().int().min(1) });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  tahun: z.coerce.number().int().optional(),
  kode_bidang_urusan: z.string().optional(),
  include_inactive: z.enum(['true', 'false']).default('true'),
});
const deleteQuery = z.object({ permanent: z.enum(['true', 'false']).default('false') });
const verifyQuery = z.object({ verify_ckan: z.enum(['true', 'false']).default('true') });

export async function listMappings(req: Request, res: Response) {
  const q = listQuery.parse(req.query);
  const { total, rows } = await mappingService.list({
    page: q.page,
    pageSize: q.page_size,
    tahun: q.tahun,
    kodeBidangUrusan: q.kode_bidang_urusan,
    includeInactive: q.include_inactive === 'true',
  });
  res.json({
    message: 'Berhasil',
    code: 200,
    metadata: {
      total_data: total,
      total_page: Math.ceil(total / q.page_size),
      page: q.page,
      page_size: q.page_size,
    },
    data: rows.map(toAdminView),
  });
}

export async function getMapping(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const m = await mappingService.findById(id);
  if (!m) throw notFound();
  res.json({ message: 'Berhasil', code: 200, data: toAdminView(m) });
}

export async function createMapping(req: Request, res: Response) {
  const body = createMappingSchema.parse(req.body);
  const { verify_ckan } = verifyQuery.parse(req.query);
  if (verify_ckan === 'true') await ckanService.checkResource(body.ckan_resource_id);
  const m = await mappingService.create(body);
  res.status(201).json({ message: 'Berhasil dibuat', code: 201, data: toAdminView(m) });
}

export async function updateMapping(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const body = updateMappingSchema.parse(req.body);
  const { verify_ckan } = verifyQuery.parse(req.query);
  if (body.ckan_resource_id && verify_ckan === 'true') {
    await ckanService.checkResource(body.ckan_resource_id);
  }
  const m = await mappingService.update(id, body);
  res.json({ message: 'Berhasil diperbarui', code: 200, data: toAdminView(m) });
}

export async function deleteMapping(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const { permanent } = deleteQuery.parse(req.query);
  if (permanent === 'true') await mappingService.hardDelete(id);
  else await mappingService.softDelete(id);
  res.json({
    message: permanent === 'true' ? 'Dihapus permanen' : 'Dinonaktifkan',
    code: 200,
  });
}

/** Pratinjau output SDPDN untuk 1 mapping tanpa token SPLP (admin only). */
export async function previewMapping(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const m = await mappingService.findById(id);
  if (!m) throw notFound();
  const result = await ckanService.datastoreSearch(m.ckanResourceId, 5, 0);
  res.json({
    message: 'Berhasil',
    code: 200,
    ...transformDatastore(result, m.fieldOverrides as Record<string, never> | null, m.klasifikasiData),
  });
}
