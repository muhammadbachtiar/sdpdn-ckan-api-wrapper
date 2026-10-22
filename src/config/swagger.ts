import { OPTIONAL_FALLBACKS } from '../domain/dataset-fields';

const s = (description: string, example?: unknown) => ({ type: 'string', description, ...(example !== undefined ? { example } : {}) });
const optS = (description: string, example?: unknown) =>
  ({ ...s(`[OPTIONAL] ${description}`, example), nullable: true });
const reqS = (description: string, example?: unknown) => s(`[MANDATORY] ${description}`, example);

const errorResp = (description: string, message: string, code: number, withErrors = false) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: message },
          code: { type: 'integer', example: code },
          ...(withErrors ? { errors: { type: 'array', items: { type: 'string' } } } : {}),
        },
      },
    },
  },
});

const pageParams = [
  { name: 'page', in: 'query', required: true, schema: { type: 'integer', minimum: 1, example: 1 }, description: '[MANDATORY] Nomor halaman' },
  { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }, description: '[OPTIONAL] Jumlah data per halaman (default 25, maks 100)' },
];

const sdpdnErrors = {
  '400': errorResp('Parameter tidak valid', 'Parameter tidak valid', 400, true),
  '401': errorResp('Token tidak valid / kadaluwarsa', 'Token tidak valid atau kadaluwarsa', 401),
  '404': errorResp('Dataset tidak ditemukan', 'Dataset tidak ditemukan', 404),
  '500': errorResp('Kesalahan internal', 'Terjadi kesalahan internal pada server data', 500),
};

const adminErrors = {
  '400': errorResp('Validasi gagal', 'Parameter tidak valid', 400, true),
  '401': errorResp('API key salah', 'API key admin tidak valid', 401),
  '404': errorResp('Tidak ditemukan', 'Dataset tidak ditemukan', 404),
  '409': errorResp('ckan_resource_id sudah terdaftar', 'ckan_resource_id sudah terdaftar', 409),
  '502': errorResp('CKAN tidak dapat dihubungi', 'Gagal menghubungi server CKAN', 502),
};

const mandatoryProps = {
  ckan_resource_id: reqS('UUID resource datastore CKAN', 'dd98572b-15db-4b6e-a632-e7a1e7198e71'),
  nama_data: reqS('Nama data', 'Jumlah Penduduk Per Desa Kabupaten Muara Enim'),
  tahun: { type: 'integer', description: '[MANDATORY] Tahun data', example: 2024 },
  kode_urusan: reqS('Kode urusan Kemendagri', '2'),
  nama_urusan: reqS('Nama urusan', 'Urusan Pemerintahan Wajib yang Tidak Berkaitan dengan Pelayanan Dasar'),
  kode_bidang_urusan: reqS('Kode bidang urusan', '2.12'),
  nama_bidang_urusan: reqS('Nama bidang urusan', 'Urusan Pemerintahan Bidang Administrasi Kependudukan dan Pencatatan Sipil'),
};

const optionalProps = {
  ckan_package_id: optS('ID/slug package CKAN'),
  nama_indikator: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.nama_indikator}"`),
  sumber_referensi: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.sumber_referensi}"`),
  kode_produsen_data: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.kode_produsen_data}"`),
  jadwal_release: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.jadwal_release}"`),
  jadwal_pemutakhiran: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.jadwal_pemutakhiran}"`),
  jenis_data: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.jenis_data}"`),
  kode_standard_data: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.kode_standard_data}"`),
  klasifikasi_data: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.klasifikasi_data}"`, 'terbuka'),
  satuan: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.satuan}"`, 'Jiwa'),
  kategori_rad: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.kategori_rad}"`),
  status_prioritas: optS(`Fallback tayang: "${OPTIONAL_FALLBACKS.status_prioritas}"`),
  tanggal_data: { type: 'string', format: 'date', nullable: true, description: '[OPTIONAL] YYYY-MM-DD. Fallback tayang: tanggal update mapping', example: '2025-10-28' },
  endpoint_url: { type: 'string', nullable: true, description: '[OPTIONAL] Jika kosong -> otomatis URL detail wrapper ini' },
  field_overrides: {
    type: 'object',
    nullable: true,
    description: '[OPTIONAL] Override skema field (key = nama field ternormalisasi). Jika kosong, skema di-infer otomatis dari CKAN.',
    additionalProperties: {
      type: 'object',
      properties: {
        data_type: { type: 'string', enum: ['string', 'integer', 'numeric', 'date'] },
        length: { type: 'integer' },
        klasifikasi_data: { type: 'string' },
      },
    },
    example: { desa: { data_type: 'string', length: 100, klasifikasi_data: 'terbuka' } },
  },
  is_active: { type: 'boolean', description: '[OPTIONAL] Default true. false = tidak ditayangkan ke SPLP', example: true },
};

const adminBody = (required: boolean) => ({
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        ...(required ? { required: Object.keys(mandatoryProps) } : {}),
        properties: { ...mandatoryProps, ...optionalProps },
      },
    },
  },
});

const idPathParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SDPDN CKAN API Wrapper',
    version: '1.0.0',
    description:
      'Wrapper read-only atas CKAN datastore untuk disajikan dalam format SDPDN ke SPLP.\n\n' +
      '- **SDPDN (SPLP)**: wajib `Authorization: Bearer <JWT>` (HS256, divalidasi pasif).\n' +
      '- **Admin Mapping**: wajib header `x-api-key`.\n' +
      '- Field bertanda **[MANDATORY]** wajib diisi; **[OPTIONAL]** boleh kosong dan akan memakai fallback.',
  },
  tags: [
    { name: 'SDPDN (SPLP)', description: 'Endpoint yang dikonsumsi SPLP' },
    { name: 'Admin Mapping', description: 'CRUD katalog mapping CKAN -> metadata Kemendagri' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
  },
  paths: {
    '/api/v1/datalist': {
      get: {
        tags: ['SDPDN (SPLP)'],
        summary: 'Daftar katalog dataset',
        security: [{ bearerAuth: [] }],
        parameters: [
          ...pageParams,
          { name: 'tahun', in: 'query', required: false, schema: { type: 'integer', minimum: 1 }, description: '[OPTIONAL] Filter tahun' },
          { name: 'kode_bidang_urusan', in: 'query', required: false, schema: { type: 'string' }, description: '[OPTIONAL] Filter bidang urusan, mis. 2.12' },
        ],
        responses: { '200': { description: 'Berhasil' }, ...sdpdnErrors },
      },
    },
    '/api/v1/datalist/detail': {
      get: {
        tags: ['SDPDN (SPLP)'],
        summary: 'Detail dataset (wrapping CKAN datastore_search -> format SDPDN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'query', required: true, schema: { type: 'integer', minimum: 1 }, description: '[MANDATORY] ID mapping' },
          ...pageParams,
          { name: 'q', in: 'query', required: false, schema: { type: 'string' }, description: '[OPTIONAL] Pencarian teks bebas (full-text search) ke semua kolom CKAN. Contoh: Belida' },
          {
            name: 'filters',
            in: 'query',
            required: false,
            schema: { type: 'string', example: '{"kecamatan": "Belida Darat"}' },
            description: '[OPTIONAL] Filter kolom spesifik (JSON format). Contoh: {"kecamatan": "Belida Darat"} atau {"desa": "Talang Beliung"} atau {"tahun": 2024}',
          },
        ],
        responses: { '200': { description: 'Berhasil (metadata, field, data)' }, ...sdpdnErrors },
      },
    },
    '/api/admin/mappings': {
      get: {
        tags: ['Admin Mapping'],
        summary: 'Daftar mapping',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'tahun', in: 'query', schema: { type: 'integer' } },
          { name: 'kode_bidang_urusan', in: 'query', schema: { type: 'string' } },
          { name: 'include_inactive', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } },
        ],
        responses: { '200': { description: 'Berhasil' }, ...adminErrors },
      },
      post: {
        tags: ['Admin Mapping'],
        summary: 'Daftarkan resource CKAN + metadata Kemendagri',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'verify_ckan', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' }, description: 'Cek keberadaan resource di CKAN sebelum disimpan' },
        ],
        requestBody: adminBody(true),
        responses: { '201': { description: 'Dibuat' }, ...adminErrors },
      },
    },
    '/api/admin/mappings/{id}': {
      get: { tags: ['Admin Mapping'], summary: 'Detail mapping', security: [{ apiKeyAuth: [] }], parameters: [idPathParam], responses: { '200': { description: 'Berhasil' }, ...adminErrors } },
      put: {
        tags: ['Admin Mapping'],
        summary: 'Ubah mapping (parsial; semua field boleh dikirim sebagian)',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          idPathParam,
          { name: 'verify_ckan', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } },
        ],
        requestBody: adminBody(false),
        responses: { '200': { description: 'Diperbarui' }, ...adminErrors },
      },
      delete: {
        tags: ['Admin Mapping'],
        summary: 'Nonaktifkan (default) atau hapus permanen mapping',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          idPathParam,
          { name: 'permanent', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'false' } },
        ],
        responses: { '200': { description: 'Berhasil' }, ...adminErrors },
      },
    },
    '/api/admin/mappings/{id}/preview': {
      get: {
        tags: ['Admin Mapping'],
        summary: 'Pratinjau hasil transformasi SDPDN (5 baris pertama)',
        security: [{ apiKeyAuth: [] }],
        parameters: [idPathParam],
        responses: { '200': { description: 'Berhasil' }, ...adminErrors },
      },
    },
  },
};
