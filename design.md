# Design Specification — Sistem Absensi Siswa

## 1. Gaya Visual: Skeuomorphism
Desain mengadopsi pendekatan **skeuomorphism** — elemen UI meniru objek fisik nyata agar terasa familiar, hangat, dan intuitif (bukan flat design generik).

### 1.1 Prinsip Visual
- Elemen terlihat "nyata" lewat **shadow berlapis, gradient halus, tekstur, dan highlight cahaya** — seolah bisa disentuh.
- Kartu (card) menyerupai **kartu fisik/kertas laporan** dengan sedikit ketebalan (elevation) dan sudut membulat lembut.
- Tombol memiliki efek **tekan (pressed state)** yang jelas — nampak menonjol saat idle, "masuk"/cekung saat diklik.
- Ikon bergaya **semi-realistis** (bukan flat/line icon murni) — contoh: ikon kelas seperti map buku/rak buku, ikon kalender seperti kalender sobek, ikon grafik seperti kertas grafik.
- Warna dasar hangat & lembut: krem, putih gading, biru dongker muda, hijau daun — hindari warna neon/flat saturasi tinggi.
- Tipografi: gunakan font dengan karakter humanis (contoh: Poppins/Nunito untuk UI, atau serif ringan untuk laporan) agar terasa ramah, bukan teknis.
- Tekstur halus (paper/linen subtle noise) pada background dashboard, bukan warna solid flat.

### 1.2 Elemen Skeuomorphic Kunci
| Komponen | Referensi Visual |
|---|---|
| Kartu siswa | Seperti kartu pelajar fisik (foto, nama, kelas, garis identitas) |
| Kalender absensi | Seperti kalender dinding sobek per hari |
| Tombol ekspor laporan | Seperti tombol "print/cap stempel" |
| Grafik kehadiran | Seperti kertas grafik/logbook dengan garis dan bayangan halus |
| Status kehadiran (badge) | Seperti stiker/stempel (Hadir = stempel hijau, Alpa = stempel merah pudar) |
| Notifikasi feedback | Seperti sticky note / catatan tempel |

## 2. Aturan Konten (Penting)
> **Tidak boleh ada kata "RFID" atau "RFID reader" di dashboard/tampilan pengguna.**

- Ganti terminologi teknis dengan istilah yang natural dan ramah pengguna, misalnya:
  - "Scan Kartu" atau "Absen Otomatis" (bukan "RFID scan")
  - "Kartu Siswa" (bukan "tag RFID" / "EPC tag")
  - "Perangkat Absen" (bukan "RFID reader/device")
- Istilah teknis (epc_tag, device_id, dsb) tetap boleh digunakan di level data/database/API, tapi **tidak pernah muncul di UI**.

## 3. Prinsip UX
Tujuan: **sesimpel dan seramah mungkin**, minim komponen yang tidak perlu.

### 3.1 Guidelines Umum
- Satu halaman = satu tujuan utama. Hindari dashboard yang penuh widget sekaligus.
- Prioritaskan **informasi yang actionable**: apa yang perlu dilihat/dilakukan user hari ini.
- Gunakan **progressive disclosure** — detail sekunder disembunyikan di balik klik/expand, bukan langsung ditampilkan semua.
- Maksimal 3-4 aksi utama per halaman (hindari terlalu banyak tombol/menu bersaing).
- Navigasi sederhana: sidebar/menu dengan label jelas berbasis peran (role-aware navigation) — wali kelas tidak melihat menu admin, dsb.

### 3.2 Per Halaman

**Dashboard Admin**
- Ringkasan cepat: total kelas, total siswa, persentase kehadiran hari ini (kartu besar di atas).
- Daftar kelas dalam bentuk kartu (bukan tabel padat) — klik kartu untuk detail kelas.
- Tombol ekspor laporan diletakkan jelas di tiap kartu kelas/halaman detail, bukan tersembunyi di menu.

**Dashboard Wali Kelas**
- Fokus utama: **daftar hadir hari ini** dalam bentuk daftar kartu siswa dengan status berupa "stempel" visual.
- Aksi cepat per siswa: tandai izin/sakit, tulis feedback — lewat ikon kecil di kartu, bukan form terpisah yang rumit.
- Statistik bulanan ditampilkan sebagai satu grafik ringkas (bukan banyak angka bertumpuk).

**Laporan Orang Tua (halaman publik, tanpa login)**
- Sangat minimalis: nama anak, foto (jika ada), ringkasan kehadiran bulan ini, satu grafik kehadiran, dan catatan feedback wali kelas (jika ada).
- Tidak ada navigasi/menu kompleks — halaman berdiri sendiri, mudah dibaca dari HP.
- Tombol unduh PDF yang jelas dan besar.

### 3.3 Yang Harus Dihindari
- Tabel data mentah yang panjang tanpa visual pendukung.
- Terlalu banyak filter/dropdown di satu layar.
- Istilah teknis di UI (lihat aturan konten di atas).
- Modal bertumpuk (modal di dalam modal).
- Warna status yang membingungkan (pastikan konsisten: hijau=hadir, kuning=izin/sakit, merah pudar=alpa).

## 4. Komponen UI Inti (Ringkas)
- **Card** — dasar dari hampir semua tampilan (siswa, kelas, laporan) dengan shadow lembut & sudut membulat.
- **Stamp Badge** — status kehadiran bergaya stempel.
- **Sticky Note** — untuk feedback wali kelas.
- **Torn Calendar Widget** — untuk navigasi tanggal/bulan laporan.
- **Graph Paper Chart** — untuk visualisasi tren kehadiran bulanan.
- **Press Button** — tombol utama (ekspor, simpan, kirim laporan) dengan efek tekan.

## 5. Responsivitas
- Dashboard admin & wali kelas: prioritas desktop/tablet (dipakai di lingkungan sekolah/kantor).
- Laporan orang tua: **mobile-first**, karena kemungkinan besar dibuka dari WhatsApp di HP.
