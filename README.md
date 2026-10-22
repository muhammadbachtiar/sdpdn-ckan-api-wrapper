# SDPDN CKAN API Wrapper

Wrapper **read-only** atas CKAN datastore → format SDPDN untuk SPLP.

## Setup
```bash
npm install
cp .env.example .env          # isi DATABASE_URL, SPLP_JWT_SECRET, ADMIN_API_KEY, dll.
npx prisma migrate dev --name init
npm run seed                  # opsional: data contoh (verifikasi kode urusan!)
npm run dev                   # http://localhost:3000/docs
```

## Endpoint
| Endpoint | Auth | Keterangan |
| --- | --- | --- |
| `GET /api/v1/datalist?page=` | `Authorization: Bearer <JWT SPLP>` | Katalog |
| `GET /api/v1/datalist/detail?id=&page=` | Bearer JWT | Wrapping `datastore_search` → SDPDN |
| `/api/admin/mappings` (CRUD) | `x-api-key` | Kelola mapping (lihat Swagger `/docs`) |

## Field mapping
- **MANDATORY**: `ckan_resource_id`, `nama_data`, `tahun`, `kode_urusan`, `nama_urusan`, `kode_bidang_urusan`, `nama_bidang_urusan`
- **OPTIONAL**: semua lainnya (kosong → fallback tayang, lihat `src/domain/dataset-fields.ts`)

## Aturan CKAN
Hanya `GET` ke `/api/3/action/datastore_search` dan `/api/3/action/package_show`; dijaga interceptor di `src/services/ckan.service.ts`.
