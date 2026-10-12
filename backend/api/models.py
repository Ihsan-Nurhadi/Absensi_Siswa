import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin Sekolah'
        WALI_KELAS = 'WALI_KELAS', 'Wali Kelas'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.WALI_KELAS)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def is_teacher(self):
        return self.role == self.Role.WALI_KELAS

class MQTTConfig(models.Model):
    host = models.CharField(max_length=255, default='broker.emqx.io')
    port = models.IntegerField(default=1883)
    username = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_connected = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"MQTT {self.host}:{self.port} ({'Aktif' if self.is_active else 'Nonaktif'})"

class Kelas(models.Model):
    nama = models.CharField(max_length=50, unique=True)
    tahun_ajaran = models.CharField(max_length=20, default='2025/2026')
    jam_masuk = models.TimeField(default='07:15:00')
    jam_pulang = models.TimeField(default='15:00:00')
    min_interval_pulang_jam = models.IntegerField(default=7, help_text="Jeda minimal jam antara scan masuk & scan pulang")
    wali_kelas = models.OneToOneField(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='kelas_diampu'
    )
    topic_mqtt = models.CharField(max_length=100, unique=True, default='sekolah/absen/kelas-default')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nama} ({self.tahun_ajaran})"

class Siswa(models.Model):
    nama = models.CharField(max_length=100)
    nis = models.CharField(max_length=20, unique=True)
    kelas = models.ForeignKey(Kelas, on_delete=models.CASCADE, related_name='siswa_list')
    epc_tag = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text="Kode Unik Kartu Siswa")
    no_wa_ortu = models.CharField(max_length=20, help_text="Nomor WA Orang Tua")
    foto_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nama} ({self.nis})"

class Absensi(models.Model):
    class StatusChoices(models.TextChoices):
        HADIR = 'HADIR', 'Hadir'
        TERLAMBAT = 'TERLAMBAT', 'Terlambat'
        IZIN = 'IZIN', 'Izin'
        SAKIT = 'SAKIT', 'Sakit'
        ALPA = 'ALPA', 'Alpa'

    class SumberChoices(models.TextChoices):
        SCAN_MQTT = 'SCAN_MQTT', 'Scan Kartu (MQTT)'
        MANUAL = 'MANUAL', 'Koreksi Manual'

    siswa = models.ForeignKey(Siswa, on_delete=models.CASCADE, related_name='absensi_list')
    tanggal = models.DateField()
    waktu_scan = models.TimeField(null=True, blank=True, help_text="Waktu scan pertama (masuk)")
    waktu_masuk = models.TimeField(null=True, blank=True)
    waktu_pulang = models.TimeField(null=True, blank=True)
    lupa_absen_pulang = models.BooleanField(default=False, help_text="True jika siswa hadir masuk tapi lupa scan pulang")
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.HADIR)
    sumber = models.CharField(max_length=20, choices=SumberChoices.choices, default=SumberChoices.SCAN_MQTT)
    catatan_koreksi = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('siswa', 'tanggal')
        ordering = ['-tanggal', 'siswa__nama']

    def __str__(self):
        return f"{self.siswa.nama} - {self.tanggal} ({self.status})"

class Feedback(models.Model):
    siswa = models.ForeignKey(Siswa, on_delete=models.CASCADE, related_name='feedback_list')
    wali_kelas = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='feedback_dibuat')
    isi = models.TextField()
    tanggal = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for {self.siswa.nama} on {self.tanggal}"

class LaporanToken(models.Model):
    siswa = models.ForeignKey(Siswa, on_delete=models.CASCADE, related_name='tokens')
    bulan = models.IntegerField()
    tahun = models.IntegerField()
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('siswa', 'bulan', 'tahun')

    def __str__(self):
        return f"Token {self.siswa.nama} ({self.bulan}/{self.tahun})"
