import { prisma } from '../src/config/prisma';

// Data CONTOH. Kode/nama urusan harus diverifikasi sesuai referensi Kemendagri.
async function main() {
  await prisma.datasetMapping.upsert({
    where: { ckanResourceId: 'dd98572b-15db-4b6e-a632-e7a1e7198e71' },
    update: {},
    create: {
      ckanResourceId: 'dd98572b-15db-4b6e-a632-e7a1e7198e71',
      namaData: 'Jumlah Penduduk Berdasarkan Kecamatan dan Desa atau Kelurahan Kabupaten Muara Enim',
      tahun: 2024,
      kodeUrusan: '2',
      namaUrusan: 'Urusan Pemerintahan Wajib yang Tidak Berkaitan dengan Pelayanan Dasar',
      kodeBidangUrusan: '2.12',
      namaBidangUrusan: 'Urusan Pemerintahan Bidang Administrasi Kependudukan dan Pencatatan Sipil',
      satuan: 'Jiwa',
    },
  });
  console.log('Seed selesai');
}

main().finally(() => prisma.$disconnect());
