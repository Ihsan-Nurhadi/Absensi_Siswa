# Task Specification — Sistem Absensi Siswa berbasis RFID

## 1. Ringkasan Proyek
Website untuk mencatat kehadiran siswa secara otomatis menggunakan RFID reader (kartu/tag RFID sebagai identitas siswa). Sistem menyediakan pemantauan absensi real-time, laporan bulanan, dan komunikasi sederhana antara wali kelas dan orang tua siswa.

## 2. Tech Stack
| Layer | Teknologi |
|---|---|
| Backend | Django (Django REST Framework untuk API) |
| Frontend | ReactJS |
| Database | SQLite |
| Autentikasi | Django session/token auth (JWT opsional) |

## 3. Peran Pengguna (Roles)

### 3.1 Admin
- Membuat & mengelola akun **wali kelas** (create, edit, nonaktifkan).
- Membuat & mengelola **kelas** (nama kelas, tahun ajaran, dsb).
- Setiap kelas hanya memiliki **satu wali kelas** (relasi one-to-one antara kelas dan wali kelas).
- Memantau data absensi siswa di **semua kelas** (dashboard global).
- Mengekspor laporan kehadiran siswa **per bulan**, per kelas (format Excel/PDF/CSV).
- Mengelola master data RFID reader/device per kelas (opsional, untuk keperluan pemetaan device ke kelas).

### 3.2 Wali Kelas
- Login menggunakan akun yang dibuatkan oleh admin.
- Hanya dapat mengakses data **kelas yang menjadi tanggung jawabnya**.
- Menambahkan siswa baru dan **mendaftarkan/memetakan tag RFID (epc tag)** ke siswa tersebut.
- Melihat riwayat & rekap absensi harian/bulanan siswa di kelasnya.
- Mengekspor laporan kehadiran bulanan untuk kelasnya sendiri.
- Memberikan **feedback/catatan** ke siswa tertentu (misal terkait kedisiplinan, catatan perkembangan, dsb).
- Mencantumkan dan mengelola **nomor WhatsApp orang tua** untuk setiap siswa di kelasnya.
- Memicu pengiriman laporan bulanan ke orang tua (lihat poin 3.3).

### 3.3 Orang Tua
- **Tidak memiliki akun/login** ke sistem.
- Menerima laporan kehadiran anak secara berkala (bulanan), dikirim melalui:
  - Link laporan (halaman publik dengan token unik per siswa/bulan), dan/atau
  - Pesan WhatsApp (teks ringkasan + link laporan), dan/atau
  - PDF laporan bulanan.
- Laporan berisi:
  - Rekap jumlah hadir/izin/sakit/alpa selama bulan berjalan.
  - **Grafik kehadiran** anak untuk bulan tersebut (visualisasi tren harian/mingguan).
  - Feedback dari wali kelas (jika ada).

## 4. Modul & Fitur Utama

### 4.1 Manajemen Pengguna
- CRUD user wali kelas oleh admin.
- Role-based access control (Admin, Wali Kelas).
- Reset password oleh admin.

### 4.2 Manajemen Kelas
- CRUD kelas oleh admin.
- Penetapan satu wali kelas per kelas.
- Daftar siswa per kelas.

### 4.3 Manajemen Siswa & RFID
- CRUD data siswa oleh wali kelas (nama, NIS, kelas, nomor WA orang tua, dsb).
- Pendaftaran/pemetaan **EPC tag RFID** unik ke masing-masing siswa.
- Validasi agar satu EPC tag hanya terhubung ke satu siswa aktif.

### 4.4 Pencatatan Absensi (Attendance Engine)
- Endpoint API untuk menerima scan dari RFID reader (device mengirim EPC tag + timestamp + id device/kelas).
- Sistem mencocokkan EPC tag → siswa → kelas, lalu mencatat status kehadiran (Hadir/Terlambat berdasarkan jam masuk).
- Wali kelas dapat menambahkan/mengoreksi status manual (Izin, Sakit, Alpa) untuk siswa yang tidak scan.

### 4.5 Dashboard Pemantauan
- **Admin:** dashboard seluruh kelas — ringkasan kehadiran harian, grafik per kelas, daftar kelas & wali kelas.
- **Wali Kelas:** dashboard kelasnya sendiri — daftar hadir hari ini, riwayat per siswa, statistik bulanan.

### 4.6 Feedback ke Siswa
- Wali kelas dapat menulis catatan/feedback per siswa (bebas teks, dengan tanggal).
- Feedback tersimpan dan bisa disertakan dalam laporan bulanan ke orang tua.

### 4.7 Laporan & Ekspor
- Laporan kehadiran bulanan per kelas (Admin & Wali Kelas) — ekspor Excel/CSV/PDF.
- Laporan kehadiran bulanan per siswa (untuk orang tua) — termasuk grafik kehadiran, dikirim/ditampilkan tanpa perlu login.
- Filter laporan berdasarkan rentang tanggal, kelas, dan siswa.

### 4.8 Notifikasi (opsional/lanjutan)
- Integrasi pengiriman WhatsApp (via API pihak ketiga, misal WhatsApp Business API) untuk mengirim ringkasan laporan bulanan ke nomor orang tua.

## 5. Alur Data Singkat
1. RFID reader membaca tag siswa → mengirim data (EPC tag, waktu, device/kelas) ke API backend.
2. Backend mencocokkan tag ke siswa terdaftar → mencatat absensi.
3. Wali kelas memantau & melengkapi data (izin/sakit/alpa, feedback).
4. Admin memantau seluruh kelas & mengekspor laporan lintas kelas.
5. Setiap akhir bulan, laporan per siswa dibuat otomatis dan dibagikan ke orang tua (link/WA/PDF) tanpa perlu akun.

## 6. Kebutuhan Non-Fungsional
- Keamanan: hanya user terautentikasi (admin/wali kelas) yang bisa mengakses data internal; laporan orang tua memakai token unik/expirable agar aman tanpa login.
- Skalabilitas data: SQLite cukup untuk skala sekolah menengah; struktur DB tetap dirancang agar mudah migrasi ke PostgreSQL bila diperlukan.
- Auditability: setiap perubahan data absensi manual (oleh wali kelas) tercatat waktunya (log sederhana).

## 7. Model Data (Ringkas)
- **User** (admin, wali_kelas) — username, password, role
- **Kelas** — nama, tahun_ajaran, wali_kelas (FK, one-to-one)
- **Siswa** — nama, NIS, kelas (FK), epc_tag (unique), no_wa_ortu
- **Absensi** — siswa (FK), tanggal, waktu_scan, status (hadir/terlambat/izin/sakit/alpa), sumber (scan/manual)
- **Feedback** — siswa (FK), wali_kelas (FK), isi, tanggal
- **LaporanBulanan** (generated/cache, opsional) — siswa, bulan, tahun, ringkasan, token_akses
