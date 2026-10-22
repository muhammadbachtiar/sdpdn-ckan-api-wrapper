import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { AppError, notFound } from '../utils/errors';

/** Hanya endpoint ini yang boleh dipanggil ke CKAN (read-only). */
const ALLOWED_PATHS = new Set([
  '/api/3/action/package_show',
  '/api/3/action/datastore_search',
]);

export interface CkanField {
  id: string;
  type: string;
}

export interface CkanDatastoreResult {
  records: Record<string, unknown>[];
  fields: CkanField[];
  total: number;
}

const client: AxiosInstance = axios.create({
  baseURL: env.CKAN_BASE_URL,
  timeout: env.CKAN_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

// Guard keras: tolak apa pun selain GET ke endpoint whitelist.
client.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const path = config.url ?? '';
  if (method !== 'get') {
    throw new Error(`CKAN read-only: method ${method.toUpperCase()} dilarang`);
  }
  if (!ALLOWED_PATHS.has(path)) {
    throw new Error(`CKAN read-only: endpoint ${path} tidak ada di whitelist`);
  }
  return config;
});

async function ckanGet<T>(path: string, params: Record<string, unknown>): Promise<T> {
  try {
    const res = await client.get(path, { params });
    if (!res.data?.success) {
      throw new AppError(502, 'Respons CKAN tidak berhasil');
    }
    return res.data.result as T;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw notFound('Resource tidak ditemukan di CKAN');
      }
      throw new AppError(502, 'Gagal menghubungi server CKAN');
    }
    throw err;
  }
}

export interface DatastoreSearchParams {
  limit: number;
  offset: number;
  q?: string;
  filters?: Record<string, unknown>;
}

export const ckanService = {
  datastoreSearch(
    resourceId: string,
    limitOrParams: number | DatastoreSearchParams,
    offsetParam?: number,
  ): Promise<CkanDatastoreResult> {
    const params: Record<string, unknown> = {
      resource_id: resourceId,
    };
    if (typeof limitOrParams === 'number') {
      params.limit = limitOrParams;
      params.offset = offsetParam ?? 0;
    } else {
      params.limit = limitOrParams.limit;
      params.offset = limitOrParams.offset;
      if (limitOrParams.q) {
        params.q = limitOrParams.q;
      }
      if (limitOrParams.filters && Object.keys(limitOrParams.filters).length > 0) {
        params.filters = JSON.stringify(limitOrParams.filters);
      }
    }
    return ckanGet<CkanDatastoreResult>('/api/3/action/datastore_search', params);
  },

  /** Cek resource ada di CKAN (limit 0 -> hanya skema + total). */
  checkResource(resourceId: string): Promise<CkanDatastoreResult> {
    return this.datastoreSearch(resourceId, 0, 0);
  },

  packageShow(id: string): Promise<Record<string, unknown>> {
    return ckanGet<Record<string, unknown>>('/api/3/action/package_show', { id });
  },
};
