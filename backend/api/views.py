import uuid
import datetime
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.http import HttpResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from api.models import User, Kelas, Siswa, Absensi, Feedback, LaporanToken, MQTTConfig
from api.serializers import (
    UserSerializer, UserCreateSerializer, KelasSerializer, 
    SiswaSerializer, AbsensiSerializer, FeedbackSerializer, 
    LaporanTokenSerializer, MQTTConfigSerializer
)
from api.mqtt_service import mqtt_service

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'email': self.user.email,
        }
        if self.user.role == User.Role.WALI_KELAS and hasattr(self.user, 'kelas_diampu') and self.user.kelas_diampu:
            data['user']['kelas_id'] = self.user.kelas_diampu.id
            data['user']['kelas_nama'] = self.user.kelas_diampu.nama
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        role_filter = self.request.query_params.get('role')
        if role_filter:
            return self.queryset.filter(role=role_filter)
        return self.queryset

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password', '12345678')
        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password untuk user {user.username} berhasil di-reset.'})

class KelasViewSet(viewsets.ModelViewSet):
    queryset = Kelas.objects.all().order_by('nama')
    serializer_class = KelasSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_teacher() and hasattr(user, 'kelas_diampu') and user.kelas_diampu:
            return Kelas.objects.filter(id=user.kelas_diampu.id)
        return Kelas.objects.all()

class SiswaViewSet(viewsets.ModelViewSet):
    queryset = Siswa.objects.all().order_by('nama')
    serializer_class = SiswaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        kelas_id = self.request.query_params.get('kelas_id')

        qs = Siswa.objects.all()
        if user.is_teacher() and hasattr(user, 'kelas_diampu') and user.kelas_diampu:
            qs = qs.filter(kelas=user.kelas_diampu)
        elif kelas_id:
            qs = qs.filter(kelas_id=kelas_id)
            
        return qs.order_by('nama')

class AbsensiViewSet(viewsets.ModelViewSet):
    queryset = Absensi.objects.all()
    serializer_class = AbsensiSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Absensi.objects.all()

        if user.is_teacher() and hasattr(user, 'kelas_diampu') and user.kelas_diampu:
            qs = qs.filter(siswa__kelas=user.kelas_diampu)

        kelas_id = self.request.query_params.get('kelas_id')
        if kelas_id:
            qs = qs.filter(siswa__kelas_id=kelas_id)

        tanggal = self.request.query_params.get('tanggal')
        if tanggal:
            qs = qs.filter(tanggal=tanggal)

        bulan = self.request.query_params.get('bulan')
        tahun = self.request.query_params.get('tahun')
        if bulan and tahun:
            qs = qs.filter(tanggal__month=bulan, tanggal__year=tahun)

        return qs.order_by('-tanggal', 'siswa__nama')

    @action(detail=False, methods=['post'])
    def manual_mark(self, request):
        """Allows teacher to manually record or update student status with password verification."""
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password akun wajib diisi untuk konfirmasi verifikasi bypass.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(password):
            return Response({'error': 'Password akun salah! Presensi tidak diubah.'}, status=status.HTTP_403_FORBIDDEN)

        siswa_id = request.data.get('siswa_id')
        local_now = timezone.localtime(timezone.now())
        tanggal_str = request.data.get('tanggal', str(local_now.date()))
        status_val = request.data.get('status', 'HADIR')
        catatan = request.data.get('catatan', '')
        lupa_pulang = request.data.get('lupa_absen_pulang', False)

        if not siswa_id:
            return Response({'error': 'siswa_id wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            siswa = Siswa.objects.get(id=siswa_id)
        except Siswa.DoesNotExist:
            return Response({'error': 'Siswa tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        tanggal = datetime.datetime.strptime(tanggal_str, '%Y-%m-%d').date()
        now_t = local_now.time()

        absensi, created = Absensi.objects.update_or_create(
            siswa=siswa,
            tanggal=tanggal,
            defaults={
                'status': status_val,
                'sumber': Absensi.SumberChoices.MANUAL,
                'catatan_koreksi': catatan,
                'lupa_absen_pulang': lupa_pulang,
                'waktu_masuk': now_t if status_val in ['HADIR', 'TERLAMBAT'] else None,
                'waktu_scan': now_t if status_val in ['HADIR', 'TERLAMBAT'] else None,
            }
        )

        return Response(AbsensiSerializer(absensi).data)

    @action(detail=False, methods=['post'])
    def auto_mark_alfa(self, request):
        """Allows teacher/admin to auto-mark all students without attendance as ALPA for the day."""
        from api.attendance_service import auto_mark_alpa
        user = request.user
        target_date_str = request.data.get('tanggal')
        kelas_id = request.data.get('kelas_id')

        # If user is teacher, lock to their assigned class
        if user.is_teacher() and hasattr(user, 'kelas_diampu') and user.kelas_diampu:
            kelas_id = user.kelas_diampu.id

        force_today = request.data.get('force', True)
        result = auto_mark_alpa(
            target_date=target_date_str,
            kelas_id=kelas_id,
            allow_weekends=False,
            force_today=force_today
        )
        return Response(result)

    @action(detail=False, methods=['get'])
    def today_summary(self, request):
        """Returns summary count of attendance for today using Asia/Jakarta local date."""
        from api.attendance_service import auto_close_past_records
        auto_close_past_records()

        user = request.user
        local_now = timezone.localtime(timezone.now())
        today = local_now.date()
        
        siswa_qs = Siswa.objects.all()
        if user.is_teacher() and hasattr(user, 'kelas_diampu') and user.kelas_diampu:
            siswa_qs = siswa_qs.filter(kelas=user.kelas_diampu)

        total_siswa = siswa_qs.count()
        absensi_today = Absensi.objects.filter(siswa__in=siswa_qs, tanggal=today)

        hadir = absensi_today.filter(status=Absensi.StatusChoices.HADIR).count()
        terlambat = absensi_today.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
        izin = absensi_today.filter(status=Absensi.StatusChoices.IZIN).count()
        sakit = absensi_today.filter(status=Absensi.StatusChoices.SAKIT).count()
        alpa = absensi_today.filter(status=Absensi.StatusChoices.ALPA).count()
        
        pulang_count = absensi_today.filter(waktu_pulang__isnull=False).count()
        lupa_pulang_count = absensi_today.filter(lupa_absen_pulang=True).count()
        belum_absen = max(0, total_siswa - (hadir + terlambat + izin + sakit + alpa))

        return Response({
            'tanggal': str(today),
            'total_siswa': total_siswa,
            'hadir': hadir,
            'terlambat': terlambat,
            'izin': izin,
            'sakit': sakit,
            'alpa': alpa,
            'pulang': pulang_count,
            'lupa_absen_pulang': lupa_pulang_count,
            'belum_absen': belum_absen,
        })

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-tanggal', '-id')
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        siswa_id = self.request.query_params.get('siswa_id')
        qs = Feedback.objects.all()

        if user.is_teacher():
            qs = qs.filter(wali_kelas=user)

        if siswa_id:
            qs = qs.filter(siswa_id=siswa_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(wali_kelas=self.request.user)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUserRole])
def mqtt_config_view(request):
    """Admin endpoint to view and update MQTT Broker credentials."""
    config, _ = MQTTConfig.objects.get_or_create(id=1)

    if request.method == 'POST':
        serializer = MQTTConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            mqtt_service.restart()
            return Response({
                'config': serializer.data,
                'mqtt_status': mqtt_service.last_status,
                'message': 'Pengaturan server absen berhasil diperbarui dan direstart.'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = MQTTConfigSerializer(config)
    return Response({
        'config': serializer.data,
        'is_connected': mqtt_service.is_connected,
        'status_text': mqtt_service.last_status
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUserRole])
def admin_class_detail_view(request, pk):
    """Comprehensive Class Detail & Monitoring View for Admin."""
    try:
        kelas = Kelas.objects.select_related('wali_kelas').get(pk=pk)
    except Kelas.DoesNotExist:
        return Response({'error': 'Kelas tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    local_now = timezone.localtime(timezone.now())
    today = local_now.date()
    month = int(request.query_params.get('bulan', local_now.month))
    year = int(request.query_params.get('tahun', local_now.year))

    students = Siswa.objects.filter(kelas=kelas).order_by('nama')
    total_students = students.count()

    # 1. Today's live attendance
    today_abs = Absensi.objects.filter(siswa__in=students, tanggal=today)
    today_hadir = today_abs.filter(status=Absensi.StatusChoices.HADIR).count()
    today_terlambat = today_abs.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
    today_izin = today_abs.filter(status=Absensi.StatusChoices.IZIN).count()
    today_sakit = today_abs.filter(status=Absensi.StatusChoices.SAKIT).count()
    today_alpa = today_abs.filter(status=Absensi.StatusChoices.ALPA).count()
    today_pulang = today_abs.filter(waktu_pulang__isnull=False).count()
    today_lupa_pulang = today_abs.filter(lupa_absen_pulang=True).count()
    today_belum = max(0, total_students - (today_hadir + today_terlambat + today_izin + today_sakit + today_alpa))

    # 2. Monthly metrics
    month_abs = Absensi.objects.filter(siswa__in=students, tanggal__month=month, tanggal__year=year)
    total_month_records = month_abs.count()
    m_hadir = month_abs.filter(status=Absensi.StatusChoices.HADIR).count()
    m_terlambat = month_abs.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
    m_izin = month_abs.filter(status=Absensi.StatusChoices.IZIN).count()
    m_sakit = month_abs.filter(status=Absensi.StatusChoices.SAKIT).count()
    m_alpa = month_abs.filter(status=Absensi.StatusChoices.ALPA).count()
    m_lupa_pulang = month_abs.filter(lupa_absen_pulang=True).count()

    present_total = m_hadir + m_terlambat
    att_rate = round((present_total / total_month_records * 100), 1) if total_month_records > 0 else 0
    punct_rate = round((m_hadir / present_total * 100), 1) if present_total > 0 else 0

    # 3. Student list with cards and public token
    student_list = []
    tokens = {t.siswa_id: t.token for t in LaporanToken.objects.filter(siswa__in=students, bulan=month, tahun=year)}
    for s in students:
        token = tokens.get(s.id)
        if not token:
            lap_t, _ = LaporanToken.objects.get_or_create(siswa=s, bulan=month, tahun=year)
            token = lap_t.token

        s_abs = month_abs.filter(siswa=s)
        student_list.append({
            'id': s.id,
            'nama': s.nama,
            'nis': s.nis,
            'foto_url': s.foto_url,
            'epc_tag': s.epc_tag,
            'no_wa_ortu': s.no_wa_ortu,
            'report_token': token,
            'summary': {
                'hadir': s_abs.filter(status=Absensi.StatusChoices.HADIR).count(),
                'terlambat': s_abs.filter(status=Absensi.StatusChoices.TERLAMBAT).count(),
                'izin_sakit': s_abs.filter(status__in=[Absensi.StatusChoices.IZIN, Absensi.StatusChoices.SAKIT]).count(),
                'alpa': s_abs.filter(status=Absensi.StatusChoices.ALPA).count(),
                'lupa_pulang': s_abs.filter(lupa_absen_pulang=True).count(),
            }
        })

    # 4. Teacher Feedbacks for this class
    feedbacks = Feedback.objects.filter(siswa__in=students).order_by('-tanggal', '-id')[:10]

    return Response({
        'kelas': {
            'id': kelas.id,
            'nama': kelas.nama,
            'tahun_ajaran': kelas.tahun_ajaran,
            'jam_masuk': kelas.jam_masuk.strftime('%H:%M') if kelas.jam_masuk else '07:15',
            'toleransi_terlambat_menit': kelas.toleransi_terlambat_menit if kelas.toleransi_terlambat_menit is not None else 15,
            'batas_akhir_masuk': kelas.batas_akhir_masuk.strftime('%H:%M') if kelas.batas_akhir_masuk else '09:30',
            'jam_pulang': kelas.jam_pulang.strftime('%H:%M') if kelas.jam_pulang else '15:00',
            'topic_mqtt': kelas.topic_mqtt,
            'wali_kelas': {
                'id': kelas.wali_kelas.id,
                'nama': f"{kelas.wali_kelas.first_name} {kelas.wali_kelas.last_name}".strip() or kelas.wali_kelas.username,
                'username': kelas.wali_kelas.username,
                'email': kelas.wali_kelas.email,
                'phone_number': kelas.wali_kelas.phone_number,
            } if kelas.wali_kelas else None
        },
        'periode': {'bulan': month, 'tahun': year},
        'total_siswa': total_students,
        'today': {
            'tanggal': str(today),
            'hadir': today_hadir,
            'terlambat': today_terlambat,
            'izin': today_izin,
            'sakit': today_sakit,
            'alpa': today_alpa,
            'pulang': today_pulang,
            'lupa_absen_pulang': today_lupa_pulang,
            'belum_absen': today_belum,
        },
        'monthly': {
            'attendance_rate': att_rate,
            'punctuality_rate': punct_rate,
            'total_records': total_month_records,
            'hadir': m_hadir,
            'terlambat': m_terlambat,
            'izin': m_izin,
            'sakit': m_sakit,
            'alpa': m_alpa,
            'lupa_absen_pulang': m_lupa_pulang,
        },
        'students': student_list,
        'feedbacks': FeedbackSerializer(feedbacks, many=True).data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def simulator_scan_view(request):
    """Allows card scan simulation for testing entry scan, exit scan, and burst scan protection."""
    epc_tag = request.data.get('epc_tag')
    scan_type = request.data.get('scan_type')
    sim_time_str = request.data.get('sim_time')

    if not epc_tag:
        return Response({'error': 'epc_tag wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    force_time = None
    if sim_time_str:
        try:
            parts = sim_time_str.split(':')
            force_time = datetime.time(int(parts[0]), int(parts[1]))
        except Exception:
            pass

    absensi, message = mqtt_service.process_attendance(epc_tag, force_time=force_time, force_type=scan_type)
    if not absensi:
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': message,
        'absensi': AbsensiSerializer(absensi).data
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def teacher_performance_view(request):
    """Analytics view for teacher/wali kelas to monitor class performance metrics."""
    user = request.user
    if not user.is_teacher() or not hasattr(user, 'kelas_diampu') or not user.kelas_diampu:
        return Response({'error': 'Anda bukan wali kelas dari kelas manapun.'}, status=status.HTTP_403_FORBIDDEN)

    kelas = user.kelas_diampu
    students = Siswa.objects.filter(kelas=kelas)
    total_students = students.count()

    local_now = timezone.localtime(timezone.now())
    month = request.query_params.get('bulan', local_now.month)
    year = request.query_params.get('tahun', local_now.year)

    absensi_qs = Absensi.objects.filter(siswa__in=students, tanggal__month=month, tanggal__year=year)
    total_records = absensi_qs.count()

    hadir_count = absensi_qs.filter(status=Absensi.StatusChoices.HADIR).count()
    terlambat_count = absensi_qs.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
    izin_count = absensi_qs.filter(status=Absensi.StatusChoices.IZIN).count()
    sakit_count = absensi_qs.filter(status=Absensi.StatusChoices.SAKIT).count()
    alpa_count = absensi_qs.filter(status=Absensi.StatusChoices.ALPA).count()
    lupa_pulang_count = absensi_qs.filter(lupa_absen_pulang=True).count()

    present_total = hadir_count + terlambat_count
    attendance_rate = round((present_total / total_records * 100), 1) if total_records > 0 else 0
    punctuality_rate = round((hadir_count / present_total * 100), 1) if present_total > 0 else 0

    student_stats = []
    for s in students:
        s_abs = absensi_qs.filter(siswa=s)
        s_tot = s_abs.count()
        s_hadir = s_abs.filter(status=Absensi.StatusChoices.HADIR).count()
        s_terlambat = s_abs.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
        s_lupa_pulang = s_abs.filter(lupa_absen_pulang=True).count()
        s_alpa = s_abs.filter(status=Absensi.StatusChoices.ALPA).count()
        
        s_score = round((s_hadir / s_tot * 100), 1) if s_tot > 0 else 0
        student_stats.append({
            'id': s.id,
            'nama': s.nama,
            'nis': s.nis,
            'foto_url': s.foto_url,
            'hadir': s_hadir,
            'terlambat': s_terlambat,
            'lupa_pulang': s_lupa_pulang,
            'alpa': s_alpa,
            'punctuality_score': s_score
        })

    top_disciplined = sorted(student_stats, key=lambda x: x['punctuality_score'], reverse=True)[:5]
    needing_attention = sorted(student_stats, key=lambda x: (x['terlambat'] + x['lupa_pulang'] * 2 + x['alpa'] * 3), reverse=True)[:5]

    return Response({
        'kelas_nama': kelas.nama,
        'total_siswa': total_students,
        'periode': {'bulan': month, 'tahun': year},
        'metrics': {
            'attendance_rate': attendance_rate,
            'punctuality_rate': punctuality_rate,
            'total_records': total_records,
            'hadir': hadir_count,
            'terlambat': terlambat_count,
            'izin': izin_count,
            'sakit': sakit_count,
            'alpa': alpa_count,
            'lupa_absen_pulang': lupa_pulang_count,
        },
        'top_disciplined': top_disciplined,
        'needing_attention': needing_attention
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_report_token_view(request):
    """Generates unique access token for student monthly parent report."""
    siswa_id = request.data.get('siswa_id')
    local_now = timezone.localtime(timezone.now())
    bulan = request.data.get('bulan', local_now.month)
    tahun = request.data.get('tahun', local_now.year)

    if not siswa_id:
        return Response({'error': 'siswa_id wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        siswa = Siswa.objects.get(id=siswa_id)
    except Siswa.DoesNotExist:
        return Response({'error': 'Siswa tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    lap_token, created = LaporanToken.objects.get_or_create(
        siswa=siswa,
        bulan=int(bulan),
        tahun=int(tahun)
    )

    report_url = f"/report/{lap_token.token}"
    wa_message = f"Halo Bpk/Ibu Orang Tua dari {siswa.nama}, berikut laporan kehadiran bulanan ({bulan}/{tahun}):\n\n{request.build_absolute_uri('/')[:-1]}{report_url}\n\nTerima kasih."

    return Response({
        'token': lap_token.token,
        'report_url': report_url,
        'wa_message': wa_message,
        'no_wa_ortu': siswa.no_wa_ortu
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_report_view(request, token):
    """Public zero-login view for parents to inspect student's entry & exit attendance report."""
    try:
        lap_token = LaporanToken.objects.select_related('siswa', 'siswa__kelas', 'siswa__kelas__wali_kelas').get(token=token)
    except LaporanToken.DoesNotExist:
        return Response({'error': 'Token laporan tidak valid atau telah kadaluarsa.'}, status=status.HTTP_404_NOT_FOUND)

    siswa = lap_token.siswa
    bulan = lap_token.bulan
    tahun = lap_token.tahun

    absensi_qs = Absensi.objects.filter(siswa=siswa, tanggal__month=bulan, tanggal__year=tahun).order_by('tanggal')
    
    hadir_count = absensi_qs.filter(status=Absensi.StatusChoices.HADIR).count()
    terlambat_count = absensi_qs.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
    izin_count = absensi_qs.filter(status=Absensi.StatusChoices.IZIN).count()
    sakit_count = absensi_qs.filter(status=Absensi.StatusChoices.SAKIT).count()
    alpa_count = absensi_qs.filter(status=Absensi.StatusChoices.ALPA).count()
    lupa_pulang_count = absensi_qs.filter(lupa_absen_pulang=True).count()

    feedbacks = Feedback.objects.filter(siswa=siswa).order_by('-tanggal')

    daily_logs = [
        {
            'tanggal': str(a.tanggal),
            'waktu_masuk': a.waktu_masuk.strftime('%H:%M') if a.waktu_masuk else (a.waktu_scan.strftime('%H:%M') if a.waktu_scan else '-'),
            'waktu_pulang': a.waktu_pulang.strftime('%H:%M') if a.waktu_pulang else '-',
            'lupa_absen_pulang': a.lupa_absen_pulang,
            'status': a.status,
            'sumber': a.sumber,
            'catatan': a.catatan_koreksi or ''
        } for a in absensi_qs
    ]

    wali_kelas_nama = lap_token.siswa.kelas.wali_kelas.get_full_name() if (lap_token.siswa.kelas and lap_token.siswa.kelas.wali_kelas) else 'Wali Kelas'

    return Response({
        'siswa': {
            'nama': siswa.nama,
            'nis': siswa.nis,
            'kelas': siswa.kelas.nama if siswa.kelas else '-',
            'foto_url': siswa.foto_url,
        },
        'periode': {
            'bulan': bulan,
            'tahun': tahun,
        },
        'wali_kelas_nama': wali_kelas_nama,
        'summary': {
            'hadir': hadir_count,
            'terlambat': terlambat_count,
            'izin': izin_count,
            'sakit': sakit_count,
            'alpa': alpa_count,
            'lupa_absen_pulang': lupa_pulang_count,
            'total_hari': absensi_qs.count()
        },
        'daily_logs': daily_logs,
        'feedbacks': FeedbackSerializer(feedbacks, many=True).data
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_class_report_view(request):
    """Exports class attendance report to Excel (.xlsx)."""
    kelas_id = request.query_params.get('kelas_id')
    local_now = timezone.localtime(timezone.now())
    bulan = request.query_params.get('bulan', local_now.month)
    tahun = request.query_params.get('tahun', local_now.year)

    if not kelas_id:
        return Response({'error': 'kelas_id wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        kelas = Kelas.objects.get(id=kelas_id)
    except Kelas.DoesNotExist:
        return Response({'error': 'Kelas tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Rekap {kelas.nama}"

        ws.append([f"REKAPITULASI KEHADIRAN SISWA - {kelas.nama}"])
        ws.append([f"Periode: Bulan {bulan} / Tahun {tahun}"])
        ws.append([])

        headers = ["No", "NIS", "Nama Siswa", "Hadir", "Terlambat", "Izin", "Sakit", "Alpa", "Lupa Absen Pulang", "Persentase Hadir"]
        ws.append(headers)

        siswa_list = Siswa.objects.filter(kelas=kelas).order_by('nama')
        for i, s in enumerate(siswa_list, 1):
            absensi = Absensi.objects.filter(siswa=s, tanggal__month=bulan, tanggal__year=tahun)
            h = absensi.filter(status=Absensi.StatusChoices.HADIR).count()
            t = absensi.filter(status=Absensi.StatusChoices.TERLAMBAT).count()
            iz = absensi.filter(status=Absensi.StatusChoices.IZIN).count()
            sk = absensi.filter(status=Absensi.StatusChoices.SAKIT).count()
            al = absensi.filter(status=Absensi.StatusChoices.ALPA).count()
            lp = absensi.filter(lupa_absen_pulang=True).count()
            tot = absensi.count()
            pct = f"{round(((h + t) / tot * 100), 1)}%" if tot > 0 else "0%"

            ws.append([i, s.nis, s.nama, h, t, iz, sk, al, lp, pct])

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Rekap_Absensi_{kelas.nama}_{bulan}_{tahun}.xlsx"'
        wb.save(response)
        return response
    except Exception as e:
        return Response({'error': f'Gagal mengekspor laporan: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
