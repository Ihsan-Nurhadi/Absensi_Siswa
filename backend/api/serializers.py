from rest_framework import serializers
from api.models import User, Kelas, Siswa, Absensi, Feedback, LaporanToken, MQTTConfig

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'phone_number']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 'phone_number']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            role=validated_data.get('role', User.Role.WALI_KELAS),
            phone_number=validated_data.get('phone_number', '')
        )
        return user

class MQTTConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MQTTConfig
        fields = '__all__'

class KelasSerializer(serializers.ModelSerializer):
    wali_kelas_detail = UserSerializer(source='wali_kelas', read_only=True)
    wali_kelas_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.WALI_KELAS),
        source='wali_kelas',
        write_only=True,
        required=False,
        allow_null=True
    )
    total_siswa = serializers.SerializerMethodField()

    class Meta:
        model = Kelas
        fields = ['id', 'nama', 'tahun_ajaran', 'jam_masuk', 'jam_pulang', 'min_interval_pulang_jam', 'wali_kelas', 'wali_kelas_detail', 'wali_kelas_id', 'topic_mqtt', 'total_siswa', 'created_at']

    def get_total_siswa(self, obj):
        return obj.siswa_list.count()

class SiswaSerializer(serializers.ModelSerializer):
    kelas_nama = serializers.ReadOnlyField(source='kelas.nama')

    class Meta:
        model = Siswa
        fields = ['id', 'nama', 'nis', 'kelas', 'kelas_nama', 'epc_tag', 'no_wa_ortu', 'foto_url', 'created_at']

class AbsensiSerializer(serializers.ModelSerializer):
    siswa_nama = serializers.ReadOnlyField(source='siswa.nama')
    siswa_nis = serializers.ReadOnlyField(source='siswa.nis')
    kelas_nama = serializers.ReadOnlyField(source='siswa.kelas.nama')

    class Meta:
        model = Absensi
        fields = [
            'id', 'siswa', 'siswa_nama', 'siswa_nis', 'kelas_nama', 'tanggal', 
            'waktu_scan', 'waktu_masuk', 'waktu_pulang', 'lupa_absen_pulang',
            'status', 'sumber', 'catatan_koreksi', 'created_at'
        ]

class FeedbackSerializer(serializers.ModelSerializer):
    siswa_nama = serializers.ReadOnlyField(source='siswa.nama')
    wali_kelas_nama = serializers.ReadOnlyField(source='wali_kelas.get_full_name')

    class Meta:
        model = Feedback
        fields = ['id', 'siswa', 'siswa_nama', 'wali_kelas', 'wali_kelas_nama', 'isi', 'tanggal']

class LaporanTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = LaporanToken
        fields = '__all__'
