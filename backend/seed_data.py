import os
import django
import datetime
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Kelas, Siswa, Absensi, Feedback, MQTTConfig, LaporanToken

def seed():
    print("=== SEEDING DATA FOR ABSENSI SISWA SKEUOMORPHIC APP ===")

    # 1. Admin User
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'role': User.Role.ADMIN,
            'first_name': 'Kepala',
            'last_name': 'Sekolah',
            'email': 'admin@sekolah.sch.id'
        }
    )
    if created or not admin.check_password('admin123'):
        admin.set_password('admin123')
        admin.save()
        print("-> Admin user ready: username 'admin', password 'admin123'")

    # 2. Wali Kelas Users
    guru1, created = User.objects.get_or_create(
        username='guru_10a',
        defaults={
            'role': User.Role.WALI_KELAS,
            'first_name': 'Budi',
            'last_name': 'Santoso, S.Pd',
            'phone_number': '081234567890',
            'email': 'budi@sekolah.sch.id'
        }
    )
    if created or not guru1.check_password('guru123'):
        guru1.set_password('guru123')
        guru1.save()

    guru2, created = User.objects.get_or_create(
        username='guru_10b',
        defaults={
            'role': User.Role.WALI_KELAS,
            'first_name': 'Siti',
            'last_name': 'Aminah, M.Pd',
            'phone_number': '081987654321',
            'email': 'siti@sekolah.sch.id'
        }
    )
    if created or not guru2.check_password('guru123'):
        guru2.set_password('guru123')
        guru2.save()
    print("-> Wali Kelas users ready: 'guru_10a' & 'guru_10b' (password 'guru123')")

    # 3. Kelas
    kelas10a, _ = Kelas.objects.get_or_create(
        nama='Kelas X-A',
        defaults={
            'tahun_ajaran': '2025/2026',
            'jam_masuk': datetime.time(7, 15),
            'wali_kelas': guru1,
            'topic_mqtt': 'sekolah/absen/kelas-10a'
        }
    )
    kelas10b, _ = Kelas.objects.get_or_create(
        nama='Kelas X-B',
        defaults={
            'tahun_ajaran': '2025/2026',
            'jam_masuk': datetime.time(7, 15),
            'wali_kelas': guru2,
            'topic_mqtt': 'sekolah/absen/kelas-10b'
        }
    )
    print("-> Classes ready: Kelas X-A & Kelas X-B with MQTT topics")

    # 4. Siswa
    siswa_data_10a = [
        ('Ahmad Pratama', '1001', 'CARD-1001-A', '08111111111', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'),
        ('Anisa Rahmawati', '1002', 'CARD-1002-B', '08122222222', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80'),
        ('Bayu Kurniawan', '1003', 'CARD-1003-C', '08133333333', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80'),
        ('Dian Permata', '1004', 'CARD-1004-D', '08144444444', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80'),
        ('Fajar Nugraha', '1005', 'CARD-1005-E', '08155555555', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'),
    ]

    siswa_list_10a = []
    for nama, nis, tag, wa, foto in siswa_data_10a:
        s, _ = Siswa.objects.get_or_create(
            nis=nis,
            defaults={
                'nama': nama,
                'kelas': kelas10a,
                'epc_tag': tag,
                'no_wa_ortu': wa,
                'foto_url': foto
            }
        )
        siswa_list_10a.append(s)

    siswa_data_10b = [
        ('Gilang Ramadhan', '2001', 'CARD-2001-F', '08166666666', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'),
        ('Hania Putri', '2002', 'CARD-2002-G', '08177777777', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'),
        ('Indra Wijaya', '2003', 'CARD-2003-H', '08188888888', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=250&q=80'),
    ]
    for nama, nis, tag, wa, foto in siswa_data_10b:
        Siswa.objects.get_or_create(
            nis=nis,
            defaults={
                'nama': nama,
                'kelas': kelas10b,
                'epc_tag': tag,
                'no_wa_ortu': wa,
                'foto_url': foto
            }
        )
    print("-> Sample students seeded.")

    # 5. Absensi Records for current month
    today = timezone.now().date()
    for i in range(10, 0, -1):
        dt = today - datetime.timedelta(days=i)
        # Skip weekends
        if dt.weekday() >= 5:
            continue
        for s in siswa_list_10a:
            # Deterministic variation
            if (s.id + dt.day) % 7 == 0:
                status_val = Absensi.StatusChoices.TERLAMBAT
                scan_time = datetime.time(7, 28)
            elif (s.id + dt.day) % 11 == 0:
                status_val = Absensi.StatusChoices.IZIN
                scan_time = None
            elif (s.id + dt.day) % 13 == 0:
                status_val = Absensi.StatusChoices.SAKIT
                scan_time = None
            else:
                status_val = Absensi.StatusChoices.HADIR
                scan_time = datetime.time(7, 8)

            Absensi.objects.get_or_create(
                siswa=s,
                tanggal=dt,
                defaults={
                    'waktu_scan': scan_time,
                    'status': status_val,
                    'sumber': Absensi.SumberChoices.SCAN_MQTT if scan_time else Absensi.SumberChoices.MANUAL
                }
            )

    # Today's attendance for Ahmad Pratama & Anisa Rahmawati
    Absensi.objects.get_or_create(
        siswa=siswa_list_10a[0],
        tanggal=today,
        defaults={'waktu_scan': datetime.time(7, 5), 'status': Absensi.StatusChoices.HADIR, 'sumber': Absensi.SumberChoices.SCAN_MQTT}
    )
    Absensi.objects.get_or_create(
        siswa=siswa_list_10a[1],
        tanggal=today,
        defaults={'waktu_scan': datetime.time(7, 22), 'status': Absensi.StatusChoices.TERLAMBAT, 'sumber': Absensi.SumberChoices.SCAN_MQTT}
    )
    print("-> Attendance history generated.")

    # 6. Feedback Sticky Note
    Feedback.objects.get_or_create(
        siswa=siswa_list_10a[0],
        wali_kelas=guru1,
        defaults={'isi': 'Ahmad sangat aktif dalam diskusi kelompok dan selalu hadir tepat waktu.'}
    )
    Feedback.objects.get_or_create(
        siswa=siswa_list_10a[1],
        wali_kelas=guru1,
        defaults={'isi': 'Anisa perlu diperhatikan jam keberangkatannya agar tidak terlambat saat pelajaran matematika.'}
    )
    print("-> Sample teacher sticky note feedback seeded.")

    # 7. MQTT Config
    MQTTConfig.objects.get_or_create(
        id=1,
        defaults={
            'host': 'broker.emqx.io',
            'port': 1883,
            'is_active': True,
            'username': '',
            'password': ''
        }
    )

    # 8. Sample Public Report Token for Ahmad Pratama
    token_obj, _ = LaporanToken.objects.get_or_create(
        siswa=siswa_list_10a[0],
        bulan=today.month,
        tahun=today.year,
        defaults={'token': 'demo-token-ahmad-pratama-12345'}
    )
    print(f"-> Public parent report token generated: /report/{token_obj.token}")

    print("=== SEEDING COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    seed()
