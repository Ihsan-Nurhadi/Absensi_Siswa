import datetime
from django.utils import timezone
from api.models import Siswa, Absensi, Kelas

def auto_mark_alpa(target_date=None, kelas_id=None, allow_weekends=False, force_today=False):
    """
    Menemukan seluruh siswa aktif yang BELUM memiliki record absensi pada tanggal target,
    kemudian otomatis mencatatkan record ALPA dengan sumber 'SISTEM_AUTO'.
    
    Parameters:
    - target_date (datetime.date): Tanggal yang dicek (default: hari ini di Asia/Jakarta).
    - kelas_id (int|None): Filter kelas tertentu (opsional).
    - allow_weekends (bool): Jika False, lewati hari Sabtu & Minggu (default: False).
    - force_today (bool): Jika True, izinkan proses untuk hari ini meski belum lewat jam pulang.
    
    Returns:
    - dict: {'count': int, 'date': str, 'students': list of names}
    """
    local_now = timezone.localtime(timezone.now())
    today = local_now.date()
    now_time = local_now.time()
    
    if target_date is None:
        target_date = today
    elif isinstance(target_date, str):
        target_date = datetime.datetime.strptime(target_date, '%Y-%m-%d').date()

    # Jangan proses hari Sabtu (5) & Minggu (6) kecuali dipaksa
    if not allow_weekends and target_date.weekday() >= 5:
        return {'count': 0, 'date': str(target_date), 'students': [], 'message': 'Hari libur akhir pekan.'}

    # Query siswa aktif
    siswa_qs = Siswa.objects.select_related('kelas').all()
    if kelas_id:
        siswa_qs = siswa_qs.filter(kelas_id=kelas_id)

    # Siswa yang sudah ada record di tanggal target (baik HADIR, TERLAMBAT, IZIN, SAKIT, ALPA)
    attended_siswa_ids = Absensi.objects.filter(
        tanggal=target_date,
        siswa__in=siswa_qs
    ).values_list('siswa_id', flat=True)

    unattended_siswa = siswa_qs.exclude(id__in=attended_siswa_ids)

    # Jika target_date adalah HARI INI dan tidak dipaksa (force_today=False):
    # Hanya tandai siswa yang kelasnya sudah melewati jam_pulang
    if target_date == today and not force_today:
        eligible_students = []
        for s in unattended_siswa:
            jam_pulang = s.kelas.jam_pulang if (s.kelas and s.kelas.jam_pulang) else datetime.time(15, 0)
            if now_time >= jam_pulang:
                eligible_students.append(s)
        unattended_siswa = eligible_students

    new_alpa_records = []
    created_names = []

    for s in unattended_siswa:
        new_alpa_records.append(
            Absensi(
                siswa=s,
                tanggal=target_date,
                status=Absensi.StatusChoices.ALPA,
                sumber=Absensi.SumberChoices.SISTEM_AUTO,
                catatan_koreksi='Otomatis: Siswa tidak melakukan scan kartu sepanjang hari.',
                lupa_absen_pulang=False
            )
        )
        created_names.append(f"{s.nama} ({s.kelas.nama if s.kelas else '-'})")

    if new_alpa_records:
        Absensi.objects.bulk_create(new_alpa_records)
        print(f"[Attendance Engine] AUTO-ALPA: {len(new_alpa_records)} siswa otomatis ditandai ALPA untuk tanggal {target_date}.")

    return {
        'count': len(new_alpa_records),
        'date': str(target_date),
        'students': created_names,
        'message': f"Berhasil menandai {len(new_alpa_records)} siswa sebagai ALPA pada {target_date}."
    }

def auto_close_past_records():
    """
    Memeriksa dan menutup record hari-hari lampau:
    1. Siswa yang masuk tapi tidak scan pulang -> lupa_absen_pulang = True
    2. Siswa yang sama sekali tidak absen di hari sekolah sebelumnya -> buatkan record ALPA
    """
    local_now = timezone.localtime(timezone.now())
    today = local_now.date()

    # 1. Update lupa_absen_pulang untuk hari lampau
    Absensi.objects.filter(
        tanggal__lt=today,
        waktu_masuk__isnull=False,
        waktu_pulang__isnull=True,
        lupa_absen_pulang=False,
        status__in=[Absensi.StatusChoices.HADIR, Absensi.StatusChoices.TERLAMBAT]
    ).update(lupa_absen_pulang=True)

    # 2. Auto-ALPA untuk kemarin (jika hari kerja)
    yesterday = today - datetime.timedelta(days=1)
    if yesterday.weekday() < 5:  # Senin - Jumat
        auto_mark_alpa(target_date=yesterday, allow_weekends=False, force_today=True)
