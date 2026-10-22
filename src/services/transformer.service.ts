import type { CkanDatastoreResult } from './ckan.service';
import { FieldOverride, OPTIONAL_FALLBACKS } from '../domain/dataset-fields';

export type SdpdnDataType = 'string' | 'integer' | 'numeric' | 'date';

export interface SdpdnField {
  name_field: string;
  data_type: SdpdnDataType;
  length: number;
  klasifikasi_data: string;
}

const SYSTEM_FIELDS = new Set(['_id', '_full_text', 'rank']);
const DEFAULT_LENGTH: Record<SdpdnDataType, number> = {
  string: 50,
  integer: 10,
  numeric: 20,
  date: 30,
};

export function normalizeFieldName(id: string): string {
  const n = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return n || 'field';
}

function mapType(ckanType: string, values: unknown[]): SdpdnDataType {
  const t = ckanType.toLowerCase();
  if (t === 'timestamp' || t.startsWith('timestamp') || t === 'date' || t === 'time') return 'date';
  if (/^(int|integer|smallint|bigint|serial)/.test(t) || /^int\d/.test(t)) return 'integer';
  if (['numeric', 'float', 'float4', 'float8', 'double precision', 'real', 'decimal'].includes(t)) {
    // numeric dianggap integer bila semua nilai pada halaman ini bilangan bulat.
    const nums = values.filter((v) => v !== null && v !== undefined && v !== '');
    const allInt = nums.every((v) => Number.isInteger(Number(v)));
    return allInt ? 'integer' : 'numeric';
  }
  return 'string';
}

export interface TransformedDetail {
  field: SdpdnField[];
  data: Record<string, unknown>[];
}

export function transformDatastore(
  result: CkanDatastoreResult,
  overrides?: Record<string, FieldOverride> | null,
  datasetKlasifikasi?: string | null,
): TransformedDetail {
  const klasifikasiDefault = datasetKlasifikasi ?? OPTIONAL_FALLBACKS.klasifikasi_data;
  const used = new Set<string>();
  const columns: { ckanId: string; name: string; field: SdpdnField }[] = [];

  for (const col of result.fields) {
    if (SYSTEM_FIELDS.has(col.id)) continue;

    // nama unik setelah normalisasi
    let name = normalizeFieldName(col.id);
    let i = 2;
    while (used.has(name)) name = `${normalizeFieldName(col.id)}_${i++}`;
    used.add(name);

    const values = result.records.map((r) => r[col.id]);
    const inferred = mapType(col.type, values);
    const ov = overrides?.[name] ?? overrides?.[col.id];

    const dataType = ov?.data_type ?? inferred;
    let length = ov?.length ?? DEFAULT_LENGTH[dataType];
    if (!ov?.length && dataType === 'string') {
      const maxLen = values.reduce<number>((m, v) => Math.max(m, v == null ? 0 : String(v).length), 0);
      length = Math.max(length, maxLen);
    }

    columns.push({
      ckanId: col.id,
      name,
      field: {
        name_field: name,
        data_type: dataType,
        length,
        klasifikasi_data: ov?.klasifikasi_data ?? klasifikasiDefault,
      },
    });
  }

  const data = result.records.map((rec) => {
    const row: Record<string, unknown> = {};
    for (const c of columns) row[c.name] = rec[c.ckanId] ?? null;
    return row;
  });

  return { field: columns.map((c) => c.field), data };
}
