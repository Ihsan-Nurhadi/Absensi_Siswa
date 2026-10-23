// Utility konversi tanggal & nama bulan bahasa Indonesia

export const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

/**
 * Mengembalikan nama bulan dari angka 1-12
 * @param {number|string} bulanAngka - Angka bulan (1-12)
 * @returns {string} Nama bulan dalam bahasa Indonesia
 */
export const getNamaBulan = (bulanAngka) => {
  const idx = parseInt(bulanAngka, 10) - 1;
  return NAMA_BULAN[idx] || `Bulan ${bulanAngka}`;
};

/**
 * Mengembalikan daftar opsi bulan untuk elemen <select>
 * @returns {Array<{value: number, label: string}>}
 */
export const getOpsiBulan = () => {
  return NAMA_BULAN.map((nama, idx) => ({
    value: idx + 1,
    label: nama
  }));
};
