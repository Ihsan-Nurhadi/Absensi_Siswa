import io
import datetime
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm

NAMA_BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

def get_nama_bulan(bulan_num):
    try:
        b = int(bulan_num)
        if 1 <= b <= 12:
            return NAMA_BULAN_ID[b - 1]
    except (ValueError, TypeError):
        pass
    return f"Bulan {bulan_num}"

def build_student_report_pdf(buffer, siswa, bulan, tahun, absensi_qs, feedbacks, wali_kelas_nama="Wali Kelas"):
    """
    Generates a formal, beautiful A4 PDF report for a student's monthly attendance.
    """
    nama_bln = get_nama_bulan(bulan)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        alignment=1 # Center
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1 # Center
    )

    period_style = ParagraphStyle(
        'PeriodStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0284c7'),
        alignment=1 # Center
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b'),
        alignment=1
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )

    cell_left_style = ParagraphStyle(
        'TableCellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#334155'),
        alignment=0
    )

    story = []

    # 1. KOP SURAT SEKOLAH
    kop_data = [
        [
            Paragraph("<b>SISTEM INFORMASI PRESENSI & ABSENSI SISWA DIGITAL</b>", title_style)
        ],
        [
            Paragraph("REKAPITULASI RESMI KEHADIRAN SISWA BULANAN", subtitle_style)
        ],
        [
            Paragraph(f"Tahun Ajaran {siswa.kelas.tahun_ajaran if siswa.kelas else '2025/2026'}", subtitle_style)
        ]
    ]
    kop_table = Table(kop_data, colWidths=[18 * cm])
    kop_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(kop_table)
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#64748b'), spaceBefore=1, spaceAfter=8))

    # 2. JUDUL PERIODE
    story.append(Paragraph(f"LAPORAN KEHADIRAN BULANAN — PERIODE {nama_bln.upper()} {tahun}", period_style))
    story.append(Spacer(1, 4 * mm))

    # 3. BIODATA SISWA (Tabel 2 Kolom)
    bio_data = [
        [
            Paragraph(f"<b>Nama Siswa:</b> {siswa.nama}", cell_left_style),
            Paragraph(f"<b>Kelas:</b> {siswa.kelas.nama if siswa.kelas else '-'}", cell_left_style)
        ],
        [
            Paragraph(f"<b>NIS:</b> {siswa.nis}", cell_left_style),
            Paragraph(f"<b>Wali Kelas:</b> {wali_kelas_nama}", cell_left_style)
        ],
        [
            Paragraph(f"<b>No. WA Orang Tua:</b> {siswa.no_wa_ortu or '-'}", cell_left_style),
            Paragraph(f"<b>Dicetak Pada:</b> {timezone.localtime(timezone.now()).strftime('%d/%m/%Y %H:%M')} WIB", cell_left_style)
        ]
    ]
    bio_table = Table(bio_data, colWidths=[9 * cm, 9 * cm])
    bio_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(bio_table)
    story.append(Spacer(1, 4 * mm))

    # 4. STATISTIK RINGKASAN KEHADIRAN (Summary Grid)
    hadir_cnt = absensi_qs.filter(status='HADIR').count()
    terlambat_cnt = absensi_qs.filter(status='TERLAMBAT').count()
    izin_cnt = absensi_qs.filter(status='IZIN').count()
    sakit_cnt = absensi_qs.filter(status='SAKIT').count()
    alpa_cnt = absensi_qs.filter(status='ALPA').count()
    lupa_pulang_cnt = absensi_qs.filter(lupa_absen_pulang=True).count()
    total_hari = absensi_qs.count()
    persen_hadir = f"{round(((hadir_cnt + terlambat_cnt) / total_hari * 100), 1)}%" if total_hari > 0 else "0%"

    stat_headers = [
        Paragraph("<b>Hadir Tepat Waktu</b>", table_header_style),
        Paragraph("<b>Terlambat</b>", table_header_style),
        Paragraph("<b>Izin</b>", table_header_style),
        Paragraph("<b>Sakit</b>", table_header_style),
        Paragraph("<b>Alpa</b>", table_header_style),
        Paragraph("<b>Lupa Pulang</b>", table_header_style),
        Paragraph("<b>% Kehadiran</b>", table_header_style)
    ]
    stat_values = [
        Paragraph(f"<b><font size=11 color='#16a34a'>{hadir_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#ea580c'>{terlambat_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#0284c7'>{izin_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#9333ea'>{sakit_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#dc2626'>{alpa_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#e11d48'>{lupa_pulang_cnt}</font></b>", cell_style),
        Paragraph(f"<b><font size=11 color='#0f172a'>{persen_hadir}</font></b>", cell_style)
    ]
    stat_table = Table([stat_headers, stat_values], colWidths=[2.57 * cm] * 7)
    stat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#94a3b8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(stat_table)
    story.append(Spacer(1, 5 * mm))

    # 5. TABEL RINCIAN LOG ABSENSI HARIAN
    story.append(Paragraph("<b>RINCIAN LOG PRESENSI HARIAN</b>", ParagraphStyle(
        'SectionHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#0f172a')
    )))
    story.append(Spacer(1, 2 * mm))

    table_data = [
        [
            Paragraph("<b>No</b>", table_header_style),
            Paragraph("<b>Tanggal</b>", table_header_style),
            Paragraph("<b>Jam Masuk</b>", table_header_style),
            Paragraph("<b>Jam Pulang</b>", table_header_style),
            Paragraph("<b>Status</b>", table_header_style),
            Paragraph("<b>Metode / Catatan</b>", table_header_style)
        ]
    ]

    for idx, a in enumerate(absensi_qs, 1):
        w_masuk = a.waktu_masuk.strftime('%H:%M WIB') if a.waktu_masuk else (a.waktu_scan.strftime('%H:%M WIB') if a.waktu_scan else '-')
        w_pulang = a.waktu_pulang.strftime('%H:%M WIB') if a.waktu_pulang else ('Lupa Pulang' if a.lupa_absen_pulang else '-')
        
        status_color = '#16a34a' if a.status == 'HADIR' else ('#ea580c' if a.status == 'TERLAMBAT' else ('#0284c7' if a.status == 'IZIN' else ('#9333ea' if a.status == 'SAKIT' else '#dc2626')))
        status_html = f"<b><font color='{status_color}'>{a.get_status_display()}</font></b>"
        if a.lupa_absen_pulang:
            status_html += " <font color='#e11d48' size=6>(Lupa Pulang)</font>"

        sumber_desc = a.catatan_koreksi if a.catatan_koreksi else (
            "Kartu RFID" if a.sumber == 'SCAN_MQTT' else (
                "Koreksi Guru" if a.sumber == 'MANUAL' else "Auto Sistem"
            )
        )

        table_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph(a.tanggal.strftime('%d/%m/%Y'), cell_style),
            Paragraph(w_masuk, cell_style),
            Paragraph(w_pulang, cell_style),
            Paragraph(status_html, cell_style),
            Paragraph(sumber_desc, cell_left_style)
        ])

    if len(table_data) == 1:
        table_data.append([
            Paragraph("-", cell_style),
            Paragraph("Tidak ada data presensi pada bulan ini", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style)
        ])

    log_table = Table(table_data, colWidths=[1 * cm, 2.5 * cm, 2.8 * cm, 2.8 * cm, 3.5 * cm, 5.4 * cm])
    table_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]

    # Alternating row colors
    for r in range(1, len(table_data)):
        if r % 2 == 0:
            table_styles.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor('#f8fafc')))

    log_table.setStyle(TableStyle(table_styles))
    story.append(log_table)
    story.append(Spacer(1, 5 * mm))

    # 6. CATATAN & FEEDBACK WALI KELAS (Jika Ada)
    if feedbacks.exists():
        fb_content = "<br/>".join([f"• <b>{f.tanggal.strftime('%d/%m/%Y')}:</b> {f.isi}" for f in feedbacks[:3]])
        feedback_box = [
            [Paragraph("<b>Catatan / Feedback Pembinaan Wali Kelas:</b>", table_header_style)],
            [Paragraph(fb_content, cell_left_style)]
        ]
        fb_table = Table(feedback_box, colWidths=[18 * cm])
        fb_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#fde68a')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fef3c7')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether(fb_table))
        story.append(Spacer(1, 6 * mm))

    # 7. KOLOM TANDA TANGAN (Signatures)
    current_date_str = timezone.localtime(timezone.now()).strftime('%d %B %Y')
    # Convert month in date string to Indonesian
    m_idx = timezone.localtime(timezone.now()).month
    current_date_indonesia = f"{timezone.localtime(timezone.now()).day} {NAMA_BULAN_ID[m_idx - 1]} {timezone.localtime(timezone.now()).year}"

    sig_data = [
        [
            Paragraph("Mengetahui,<br/>Orang Tua / Wali Murid", cell_style),
            Paragraph(f"Dibuat di Sekolah,<br/>{current_date_indonesia}<br/>Wali Kelas {siswa.kelas.nama if siswa.kelas else ''}", cell_style)
        ],
        [
            Paragraph("<br/><br/><br/>( ............................................ )", cell_style),
            Paragraph(f"<br/><br/><br/>( <b>{wali_kelas_nama}</b> )", cell_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[9 * cm, 9 * cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story)
    return buffer
