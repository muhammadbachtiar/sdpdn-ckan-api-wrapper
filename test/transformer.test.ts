import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transformDatastore } from '../src/services/transformer.service';

const sample = {
  total: 58,
  fields: [
    { id: '_id', type: 'int' },
    { id: 'Kecamatan', type: 'text' },
    { id: 'Desa', type: 'text' },
    { id: 'Tahun', type: 'numeric' },
    { id: 'Jumlah', type: 'numeric' },
  ],
  records: [
    { _id: 1, Kecamatan: 'Belida Darat', Desa: 'Talang Beliung', Tahun: 2024, Jumlah: 661 },
    { _id: 11, Kecamatan: 'Gunung Megang', Desa: 'Bangun Sari', Tahun: 2024, Jumlah: 2969 },
  ],
};

test('menghapus _id, menormalisasi nama, meng-infer tipe', () => {
  const { field, data } = transformDatastore(sample);
  assert.deepEqual(
    field.map((f) => [f.name_field, f.data_type]),
    [['kecamatan', 'string'], ['desa', 'string'], ['tahun', 'integer'], ['jumlah', 'integer']],
  );
  assert.equal(field[0].length, 50);
  assert.equal(field[0].klasifikasi_data, 'terbuka');
  assert.deepEqual(data[0], { kecamatan: 'Belida Darat', desa: 'Talang Beliung', tahun: 2024, jumlah: 661 });
});

test('numeric desimal -> numeric', () => {
  const { field } = transformDatastore({
    total: 1,
    fields: [{ id: 'Rasio', type: 'numeric' }],
    records: [{ Rasio: 1.5 }],
  });
  assert.equal(field[0].data_type, 'numeric');
});

test('override & klasifikasi dataset dipakai bila ada', () => {
  const { field } = transformDatastore(sample, { desa: { length: 120, klasifikasi_data: 'dikecualikan' } }, 'terbatas');
  assert.equal(field[1].length, 120);
  assert.equal(field[1].klasifikasi_data, 'dikecualikan');
  assert.equal(field[0].klasifikasi_data, 'terbatas');
});

test('nama kolom bentrok setelah normalisasi dibuat unik', () => {
  const { field } = transformDatastore({
    total: 0,
    fields: [{ id: 'Nama Desa', type: 'text' }, { id: 'nama_desa', type: 'text' }],
    records: [],
  });
  assert.deepEqual(field.map((f) => f.name_field), ['nama_desa', 'nama_desa_2']);
});
