from django.core.management.base import BaseCommand
from api.attendance_service import auto_mark_alpa, auto_close_past_records

class Command(BaseCommand):
    help = 'Menutup presensi harian secara otomatis: Menandai siswa yang tidak scan sepanjang hari sebagai ALPA dan menutup lupa scan pulang.'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, help='Tanggal spesifik (format: YYYY-MM-DD)')
        parser.add_argument('--kelas_id', type=int, help='ID Kelas spesifik (opsional)')
        parser.add_argument('--allow_weekends', action='store_true', help='Izinkan eksekusi di hari Sabtu/Minggu')

    def handle(self, *args, **options):
        target_date = options.get('date')
        kelas_id = options.get('kelas_id')
        allow_weekends = options.get('allow_weekends', False)

        self.stdout.write("Menjalankan konsolidasi absensi lampau...")
        auto_close_past_records()

        self.stdout.write(f"Memproses Exception ALPA harian untuk tanggal {target_date or 'hari ini'}...")
        res = auto_mark_alpa(
            target_date=target_date,
            kelas_id=kelas_id,
            allow_weekends=allow_weekends,
            force_today=True
        )

        self.stdout.write(self.style.SUCCESS(f"Selesai! {res.get('message', '')}"))
        if res.get('students'):
            self.stdout.write(f"Siswa ditandai ALPA: {', '.join(res['students'])}")
