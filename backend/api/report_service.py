import logging
from django.utils import timezone
from api.models import Kelas, Siswa, LaporanToken
from api.pdf_generator import get_nama_bulan

logger = logging.getLogger(__name__)

def process_monthly_auto_reports(target_date=None, kelas_id=None, force=False):
    """
    Scans classes that have auto report enabled on target_date's day (or force=True).
    Creates or refreshes monthly report tokens for each student in those classes.
    Returns summary dict.
    """
    if target_date is None:
        target_date = timezone.localtime(timezone.now()).date()

    target_day = target_date.day
    target_month = target_date.month
    target_year = target_date.year

    kelas_qs = Kelas.objects.filter(enable_auto_report=True)

    if kelas_id:
        kelas_qs = kelas_qs.filter(id=kelas_id)
    elif not force:
        # Match class tanggal_auto_report with today's day of month
        kelas_qs = kelas_qs.filter(tanggal_auto_report=target_day)

    total_tokens_created = 0
    total_tokens_existing = 0
    processed_classes = []

    for k in kelas_qs:
        siswa_list = Siswa.objects.filter(kelas=k)
        class_tokens = []

        for s in siswa_list:
            lap_token, created = LaporanToken.objects.get_or_create(
                siswa=s,
                bulan=target_month,
                tahun=target_year
            )
            if created:
                total_tokens_created += 1
            else:
                total_tokens_existing += 1

            nama_bln = get_nama_bulan(target_month)
            report_path = f"/report/{lap_token.token}"
            wa_text = (
                f"Halo Bapak/Ibu Orang Tua dari *{s.nama}*,\n\n"
                f"Berikut Laporan Rekapitulasi Presensi Kehadiran Siswa Periode *{nama_bln} {target_year}*:\n"
                f"[Tautan Rapor]: {report_path}\n\n"
                f"Laporan lengkap beserta rincian scan masuk, scan pulang, dan dokumen PDF formal "
                f"dapat diunduh langsung melalui tautan di atas. Terima kasih.\n"
                f"— Wali Kelas {k.nama}"
            )

            class_tokens.append({
                'siswa_id': s.id,
                'siswa_nama': s.nama,
                'nis': s.nis,
                'no_wa_ortu': s.no_wa_ortu,
                'token': lap_token.token,
                'report_url': report_path,
                'wa_message': wa_text,
                'is_new': created
            })

        processed_classes.append({
            'kelas_id': k.id,
            'kelas_nama': k.nama,
            'total_siswa': siswa_list.count(),
            'students': class_tokens
        })

    logger.info(
        f"Auto report processed for {target_date}: {len(processed_classes)} classes, "
        f"{total_tokens_created} new tokens, {total_tokens_existing} existing tokens."
    )

    return {
        'status': 'success',
        'target_date': str(target_date),
        'target_month': target_month,
        'nama_bulan': get_nama_bulan(target_month),
        'target_year': target_year,
        'total_classes_processed': len(processed_classes),
        'total_tokens_created': total_tokens_created,
        'total_tokens_existing': total_tokens_existing,
        'classes': processed_classes
    }
