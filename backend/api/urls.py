from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from api.views import (
    CustomTokenObtainPairView,
    UserViewSet,
    KelasViewSet,
    SiswaViewSet,
    AbsensiViewSet,
    FeedbackViewSet,
    mqtt_config_view,
    admin_class_detail_view,
    teacher_performance_view,
    simulator_scan_view,
    generate_report_token_view,
    public_report_view,
    export_class_report_view,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'classes', KelasViewSet, basename='kelas')
router.register(r'students', SiswaViewSet, basename='siswa')
router.register(r'attendance', AbsensiViewSet, basename='absensi')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # MQTT Config & Class Detail (Admin only)
    path('mqtt/config/', mqtt_config_view, name='mqtt_config'),
    path('admin/classes/<int:pk>/detail/', admin_class_detail_view, name='admin_class_detail'),
    path('performance/teacher/', teacher_performance_view, name='teacher_performance'),
    
    # Attendance Scan Simulator & Report Actions
    path('simulator/scan/', simulator_scan_view, name='simulator_scan'),
    path('report/token/generate/', generate_report_token_view, name='generate_report_token'),
    path('public/report/<str:token>/', public_report_view, name='public_report'),
    path('export/report/', export_class_report_view, name='export_report'),

    path('', include(router.urls)),
]
