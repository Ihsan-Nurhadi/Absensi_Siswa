#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <LittleFS.h>
#include <MD5Builder.h>
#include <mbedtls/base64.h>
#include <time.h>

// ====== Opsi ======
#define USE_TOUCH 1        // 1 = aktifkan touch (CST820), 0 = matikan
#define TAP_PIN   0        // tombol BOOT (GPIO0) sebagai pengganti sentuhan, -1 = nonaktif

// ====== Konfigurasi WiFi ======
const char* WIFI_SSID     = "NMSIOTPULAUBAYU";
const char* WIFI_PASSWORD = "N@y@k@Pr4t4m4!<>";

// ====== Konfigurasi MQTT ======
const char* MQTT_SERVER = "emqx.nayakanms.com";               // isi dengan host lengkap
const uint16_t MQTT_PORT = 1884;
const char* MQTT_USER   = "nyk_ws";
const char* MQTT_PASS   = "ws";
const char* MQTT_TOPIC  = "rfid/ws/display";     // format payload: NAMA,STATUS
const char* MQTT_ACK_TOPIC = "rfid/ws/ack";      // konfirmasi: NAMA,STATUS,JAM

// ====== Konfigurasi Kamera RTSP (Tiandy / Tapo) & Upload VPS ======
const char* CAM_HOST        = "192.168.1.105";
const uint16_t CAM_PORT     = 554;               // Port RTSP standar (554)
const char* CAM_RTSP_PATH   = "/1/2";            // Tiandy sub-stream: "/1/2" | Tapo C500 sub-stream: "/stream2"
const char* CAM_USER        = "admin";
const char* CAM_PASS        = "admin1234";
const char* VPS_UPLOAD_URL  = "https://110.232.92.134:3004/api/attendance/snapshot-upload/";
const char* DEVICE_API_KEY  = "absensi-device-secret-2026";

// ====== Waktu (NTP, WIB = UTC+7) ======
const long GMT_OFFSET_SEC = 7 * 3600;            // WITA = 8*3600, WIT = 9*3600
const char* DAY_NAMES[]   = {"Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"};
const char* MONTH_NAMES[] = {"Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"};

// ====== Pengaturan kecerahan, rekap, dan mode malam ======
const unsigned long SUCCESS_MS       = 3000;     // lama tampilan hasil scan
const unsigned long DIM_AFTER_MS     = 60000;    // redup setelah 60 detik tanpa aktivitas
const unsigned long RECAP_TIMEOUT_MS = 30000;    // rekap kembali otomatis setelah 30 detik
const uint8_t BRIGHT_FULL  = 255;
const uint8_t BRIGHT_DIM   = 40;                 // redup (siang)
const uint8_t BRIGHT_NIGHT = 8;                  // mode malam
const int NIGHT_START_HOUR = 18;                 // mode malam mulai jam 18:00
const int NIGHT_END_HOUR   = 6;                  // sampai jam 06:00

// ====== Warna (RGB565) ======
constexpr uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}
constexpr uint16_t COL_BG      = rgb(10, 14, 26);
constexpr uint16_t COL_HEADER  = rgb(20, 30, 52);
constexpr uint16_t COL_CARD    = rgb(24, 34, 58);
constexpr uint16_t COL_ACCENT  = rgb(0, 200, 255);
constexpr uint16_t COL_DIM     = rgb(140, 150, 172);
constexpr uint16_t COL_NIGHT   = rgb(60, 66, 84);
constexpr uint16_t COL_OK      = rgb(46, 204, 113);
constexpr uint16_t COL_BAD     = rgb(231, 76, 60);
constexpr uint16_t COL_SUCCESS = rgb(16, 110, 70);    // hijau (berhasil)
constexpr uint16_t COL_SUCC_DK = rgb(8, 70, 45);
constexpr uint16_t COL_WARN    = rgb(176, 108, 10);   // oranye (sudah absen)
constexpr uint16_t COL_WARN_DK = rgb(110, 66, 4);
constexpr uint16_t COL_ERR     = rgb(178, 34, 34);    // merah (tidak terdaftar)
constexpr uint16_t COL_ERR_DK  = rgb(110, 16, 16);
constexpr uint16_t COL_LATE    = rgb(168, 130, 0);    // kuning tua (terlambat)
constexpr uint16_t COL_LATE_DK = rgb(96, 74, 0);
constexpr uint16_t COL_TAG     = rgb(255, 225, 77);
constexpr uint16_t COL_WHITE   = rgb(255, 255, 255);

// ====== Display (ESP32-2432S024) ======
class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel;
  lgfx::Bus_SPI       _bus;
  lgfx::Light_PWM     _light;
#if USE_TOUCH
  lgfx::Touch_CST816S _touch;
#endif
public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host    = SPI2_HOST;
      cfg.spi_mode    = 0;
      cfg.freq_write  = 20000000;   // jika perlu lebih cepat, coba 40000000
      cfg.freq_read   = 16000000;
      cfg.spi_3wire   = false;
      cfg.use_lock    = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk = 14;
      cfg.pin_mosi = 13;
      cfg.pin_miso = 12;
      cfg.pin_dc   = 2;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }
    {
      auto cfg = _panel.config();
      cfg.pin_cs   = 15;
      cfg.pin_rst  = -1;
      cfg.pin_busy = -1;
      cfg.panel_width  = 240;
      cfg.panel_height = 320;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.readable   = true;
      cfg.invert     = false;
      cfg.rgb_order  = false;
      cfg.dlen_16bit = false;
      cfg.bus_shared = true;
      _panel.config(cfg);
    }
    {
      auto cfg = _light.config();
      cfg.pin_bl      = 27;
      cfg.invert      = false;
      cfg.freq        = 44100;
      cfg.pwm_channel = 7;
      _light.config(cfg);
      _panel.setLight(&_light);
    }
#if USE_TOUCH
    {
      auto cfg = _touch.config();
      cfg.x_min = 0;   cfg.x_max = 239;
      cfg.y_min = 0;   cfg.y_max = 319;
      cfg.pin_int = 21;
      cfg.pin_rst = 25;
      cfg.bus_shared = false;
      cfg.offset_rotation = 0;
      cfg.i2c_port = 1;
      cfg.i2c_addr = 0x15;
      cfg.pin_sda  = 33;
      cfg.pin_scl  = 32;
      cfg.freq     = 400000;
      _touch.config(cfg);
      _panel.setTouch(&_touch);
    }
#endif
    setPanel(&_panel);
  }
};

LGFX tft;
LGFX_Sprite clockSpr(&tft);     // buffer jam (anti kedip)
LGFX_Sprite barSpr(&tft);       // buffer progress bar (anti kedip)
WiFiClient espClient;
PubSubClient client(espClient);

// ====== Data rekap ======
#define MAX_ENTRIES 40
struct Entry {
  char    name[16];
  uint8_t type;       // 0 hadir, 1 sudah absen, 2 tidak terdaftar, 3 terlambat
  char    clk[9];     // HH:MM:SS
};
Entry entries[MAX_ENTRIES];
int      entryCount  = 0;
int      counts[4]   = {0, 0, 0, 0};
uint32_t todayKey    = 0;       // YYYYMMDD
bool     recapLoaded = false;
int      pendingCount = 0;      // jumlah konfirmasi yang belum terkirim

const char* TYPE_LABEL[4] = {"HADIR", "SUDAH", "TOLAK", "TELAT"};

// ====== State ======
enum Screen { SCR_IDLE, SCR_SUCCESS, SCR_RECAP, SCR_NIGHT };
Screen screen = SCR_IDLE;

String currentName   = "";
String currentStatus = "";
String scanTime      = "";
String lastName      = "";
String lastTime      = "";
volatile bool newMsg = false;

unsigned long successStart = 0;
unsigned long recapStart   = 0;
unsigned long lastActivity = 0;
unsigned long lastDayCheck = 0;
unsigned long lastFlush    = 0;
unsigned long lastMqttTry  = 0;
unsigned long lastWifiTry  = 0;

bool lastWifiOk = false, lastMqttOk = false;
bool statusDrawn = false;
bool nightNow = false;
uint8_t curBright = 255;

int  lastSec  = -1;
int  lastDay  = -1;
int  lastBarW = -1;

// =====================================================
//                        WAKTU
// =====================================================
bool getNow(struct tm &ti) {
  return getLocalTime(&ti, 0) && ti.tm_year > 120;   // true jika sudah sinkron
}

String nowString() {
  struct tm ti;
  if (!getNow(ti)) return "--:--:--";
  char buf[16];
  strftime(buf, sizeof(buf), "%H:%M:%S", &ti);
  return String(buf);
}

uint32_t getDayKey() {
  struct tm ti;
  if (!getNow(ti)) return 0;
  return (uint32_t)(ti.tm_year + 1900) * 10000 + (uint32_t)(ti.tm_mon + 1) * 100 + ti.tm_mday;
}

bool isNightNow() {
  struct tm ti;
  if (!getNow(ti)) return false;
  return (ti.tm_hour >= NIGHT_START_HOUR || ti.tm_hour < NIGHT_END_HOUR);
}

// =====================================================
//                    JENIS STATUS
// =====================================================
// 0 = OK (hijau), 1 = sudah absen (oranye), 2 = tidak terdaftar (merah), 3 = terlambat (kuning)
int getType(const String& status) {
  String u = status;
  u.toUpperCase();
  if (u.indexOf("TIDAK")  >= 0) return 2;
  if (u.indexOf("SUDAH")  >= 0) return 1;
  if (u.indexOf("LAMBAT") >= 0) return 3;
  return 0;
}

void getColors(int type, uint16_t &bg, uint16_t &dk) {
  switch (type) {
    case 1:  bg = COL_WARN;    dk = COL_WARN_DK; break;
    case 2:  bg = COL_ERR;     dk = COL_ERR_DK;  break;
    case 3:  bg = COL_LATE;    dk = COL_LATE_DK; break;
    default: bg = COL_SUCCESS; dk = COL_SUCC_DK; break;
  }
}

uint16_t typeColor(int type) {
  switch (type) {
    case 1:  return rgb(224, 138, 18);
    case 2:  return rgb(231, 76, 60);
    case 3:  return rgb(212, 170, 0);
    default: return COL_OK;
  }
}

// =====================================================
//               REKAP (RAM + LittleFS)
// =====================================================
void pushEntry(const String& name, int type, const String& clk) {
  if (entryCount >= MAX_ENTRIES) {
    memmove(&entries[0], &entries[1], sizeof(Entry) * (MAX_ENTRIES - 1));
    entryCount = MAX_ENTRIES - 1;
  }
  Entry &e = entries[entryCount++];
  strncpy(e.name, name.c_str(), sizeof(e.name) - 1);
  e.name[sizeof(e.name) - 1] = 0;
  e.type = (uint8_t)type;
  strncpy(e.clk, clk.c_str(), sizeof(e.clk) - 1);
  e.clk[sizeof(e.clk) - 1] = 0;
  if (type >= 0 && type < 4) counts[type]++;
}

void clearRecap() {
  entryCount = 0;
  for (int i = 0; i < 4; i++) counts[i] = 0;
}

void saveEntry(const String& name, int type, const String& clk) {
  if (todayKey == 0) return;                 // jam belum sinkron, jangan disimpan
  String n = name;
  n.replace("|", " ");
  if (n.length() > 15) n = n.substring(0, 15);
  File f = LittleFS.open("/recap.txt", FILE_APPEND);
  if (!f) return;
  f.printf("%lu|%s|%d|%s\n", (unsigned long)todayKey, n.c_str(), type, clk.c_str());
  f.close();
}

void loadRecap() {
  clearRecap();
  File f = LittleFS.open("/recap.txt", FILE_READ);
  if (!f) return;
  bool any = false;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    int p1 = line.indexOf('|');
    int p2 = line.indexOf('|', p1 + 1);
    int p3 = line.indexOf('|', p2 + 1);
    if (p1 < 0 || p2 < 0 || p3 < 0) continue;
    if ((uint32_t)line.substring(0, p1).toInt() != todayKey) continue;   // bukan hari ini
    pushEntry(line.substring(p1 + 1, p2), line.substring(p2 + 1, p3).toInt(), line.substring(p3 + 1));
    any = true;
  }
  f.close();
  if (!any) LittleFS.remove("/recap.txt");
}

// Muat rekap saat jam pertama kali sinkron, dan kosongkan saat ganti hari
void checkDay() {
  uint32_t key = getDayKey();
  if (key == 0) return;
  if (!recapLoaded) {
    todayKey = key;
    recapLoaded = true;
    loadRecap();
  } else if (key != todayKey) {
    todayKey = key;
    clearRecap();
    LittleFS.remove("/recap.txt");
  }
}

// =====================================================
//          ANTREAN KONFIRMASI (OFFLINE -> ONLINE)
// =====================================================
void countPending() {
  pendingCount = 0;
  File f = LittleFS.open("/pending.txt", FILE_READ);
  if (!f) return;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) pendingCount++;
  }
  f.close();
}

void publishOrQueue(const String& payload) {
  if (client.connected() && client.publish(MQTT_ACK_TOPIC, payload.c_str())) return;
  if (pendingCount >= 100) return;           // batasi antrean
  File f = LittleFS.open("/pending.txt", FILE_APPEND);
  if (!f) return;
  f.println(payload);
  f.close();
  pendingCount++;
}

void flushPending() {
  if (pendingCount <= 0 || !client.connected()) return;
  File f = LittleFS.open("/pending.txt", FILE_READ);
  if (!f) { pendingCount = 0; return; }
  bool allOk = true;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    if (!client.publish(MQTT_ACK_TOPIC, line.c_str())) { allOk = false; break; }
  }
  f.close();
  if (allOk) {
    LittleFS.remove("/pending.txt");
    pendingCount = 0;
  }
}

// =====================================================
//                    TAMPILAN LCD
// =====================================================
void drawHeader() {
  tft.fillRect(0, 0, 320, 32, COL_HEADER);
  tft.fillRect(12, 8, 4, 16, COL_ACCENT);
  tft.setTextColor(COL_WHITE, COL_HEADER);
  tft.setTextDatum(middle_left);
  tft.setFont(&fonts::FreeSansBold9pt7b);
  tft.drawString("ABSENSI RFID", 24, 16);
}

void drawStatus(bool force = false) {
  bool wifiOk = (WiFi.status() == WL_CONNECTED);
  bool mqttOk = client.connected();
  if (!force && statusDrawn && wifiOk == lastWifiOk && mqttOk == lastMqttOk) return;

  lastWifiOk = wifiOk;
  lastMqttOk = mqttOk;
  statusDrawn = true;

  if (screen == SCR_NIGHT) return;           // header disembunyikan saat mode malam

  tft.fillRect(180, 0, 140, 32, COL_HEADER);
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.setTextDatum(middle_left);
  tft.setTextColor(COL_DIM, COL_HEADER);

  tft.fillCircle(196, 16, 4, wifiOk ? COL_OK : COL_BAD);
  tft.drawString("WiFi", 205, 16);

  tft.fillCircle(256, 16, 4, mqttOk ? COL_OK : COL_BAD);
  tft.drawString("MQTT", 265, 16);
}

void drawLastScan() {
  tft.fillRect(30, 190, 270, 22, COL_CARD);
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.setTextDatum(middle_left);
  tft.setTextColor(COL_DIM, COL_CARD);
  String s = "Terakhir: ";
  if (lastName.length() == 0) {
    s += "-";
  } else {
    String n = lastName;
    if (n.length() > 12) n = n.substring(0, 12);
    s += n + "  " + lastTime;
  }
  tft.drawString(s, 30, 200);
}

void drawClock(bool force = false) {
  if (screen != SCR_IDLE && screen != SCR_NIGHT) return;

  struct tm ti;
  bool ok = getNow(ti);
  int sec = ok ? ti.tm_sec : -2;
  if (!force && sec == lastSec) return;      // gambar ulang hanya saat detik berganti
  lastSec = sec;

  // Mode malam: hanya jam redup di tengah layar
  if (screen == SCR_NIGHT) {
    clockSpr.fillSprite(TFT_BLACK);
    clockSpr.setTextColor(COL_NIGHT, TFT_BLACK);
    clockSpr.setTextDatum(middle_center);
    clockSpr.setFont(&fonts::FreeSansBold24pt7b);
    clockSpr.drawString(nowString(), 130, 23);
    clockSpr.pushSprite(30, 97);
    return;
  }

  // Jam besar: digambar di sprite dulu, lalu dikirim sekali ke layar
  clockSpr.fillSprite(COL_BG);
  clockSpr.setTextColor(COL_WHITE, COL_BG);
  clockSpr.setTextDatum(middle_center);
  clockSpr.setFont(&fonts::FreeSansBold24pt7b);
  clockSpr.drawString(nowString(), 130, 23);
  clockSpr.pushSprite(30, 58);

  // Tanggal: hanya digambar saat hari berganti
  if (ok && (force || ti.tm_mday != lastDay)) {
    lastDay = ti.tm_mday;
    char buf[40];
    snprintf(buf, sizeof(buf), "%s, %d %s %d",
             DAY_NAMES[ti.tm_wday], ti.tm_mday, MONTH_NAMES[ti.tm_mon], ti.tm_year + 1900);
    tft.fillRect(0, 106, 320, 26, COL_BG);
    tft.setTextColor(COL_ACCENT, COL_BG);
    tft.setTextDatum(middle_center);
    tft.setFont(&fonts::FreeSans12pt7b);
    tft.drawString(buf, 160, 118);
  }
}

void drawIdle() {
  tft.fillRect(0, 32, 320, 208, COL_BG);

  // Kartu "Tempelkan kartu"
  tft.fillRoundRect(16, 148, 288, 76, 10, COL_CARD);
  tft.drawCircle(44, 169, 11, COL_ACCENT);
  tft.drawCircle(44, 169, 10, COL_ACCENT);
  tft.fillCircle(44, 169, 4, COL_ACCENT);

  tft.setTextColor(COL_WHITE, COL_CARD);
  tft.setTextDatum(middle_left);
  tft.setFont(&fonts::FreeSansBold12pt7b);
  tft.drawString("Tempelkan kartu", 66, 169);

  drawLastScan();

  // Petunjuk di bawah kartu
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.drawString("Sentuh layar untuk rekap hari ini", 160, 232);

  lastDay = -1;
  drawClock(true);
}

void drawProgress(bool force = false) {
  unsigned long el = millis() - successStart;
  if (el > SUCCESS_MS) el = SUCCESS_MS;
  int w = 280 - (int)((280UL * el) / SUCCESS_MS);
  if (!force && w == lastBarW) return;
  lastBarW = w;

  // Digambar di sprite lalu dikirim sekali (tanpa kedip)
  uint16_t bgc, dk;
  getColors(getType(currentStatus), bgc, dk);
  barSpr.fillSprite(dk);
  barSpr.fillRoundRect(0, 0, 280, 6, 3, dk);
  if (w > 6) barSpr.fillRoundRect(0, 0, w, 6, 3, COL_WHITE);
  barSpr.pushSprite(20, 228);
}

void drawSuccess(const String& name, const String& status) {
  int type = getType(status);
  uint16_t bg, dk;
  getColors(type, bg, dk);

  tft.fillRect(0, 32, 320, 208, bg);

  // Lingkaran ikon: centang, silang, atau jam
  tft.fillCircle(160, 70, 26, COL_WHITE);
  if (type == 2) {
    // silang (tidak terdaftar)
    tft.drawWideLine(150, 60, 170, 80, 3, bg);
    tft.drawWideLine(170, 60, 150, 80, 3, bg);
  } else if (type == 3) {
    // jam (terlambat)
    tft.drawCircle(160, 70, 19, bg);
    tft.drawCircle(160, 70, 18, bg);
    tft.drawWideLine(160, 70, 160, 56, 2, bg);
    tft.drawWideLine(160, 70, 170, 76, 2, bg);
    tft.fillCircle(160, 70, 3, bg);
  } else {
    // centang (berhasil / sudah absen)
    tft.drawWideLine(148, 71, 156, 79, 3, bg);
    tft.drawWideLine(156, 79, 173, 60, 3, bg);
  }

  // Nama (besar)
  tft.setTextColor(COL_WHITE, bg);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::FreeSansBold24pt7b);
  if (tft.textWidth(name) > 300) tft.setFont(&fonts::FreeSansBold18pt7b);
  if (tft.textWidth(name) > 300) tft.setFont(&fonts::FreeSansBold12pt7b);
  tft.drawString(name, 160, 118);

  // Status dalam pil
  tft.fillRoundRect(40, 142, 240, 36, 18, dk);
  tft.setFont(&fonts::FreeSansBold12pt7b);
  if (tft.textWidth(status) > 220) tft.setFont(&fonts::FreeSansBold9pt7b);
  tft.setTextColor(COL_TAG, dk);
  tft.drawString(status, 160, 160);

  // Waktu scan
  tft.setTextColor(rgb(235, 235, 235), bg);
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.drawString("Waktu: " + scanTime, 160, 198);

  drawProgress(true);
}

void drawRecap() {
  tft.fillRect(0, 32, 320, 208, COL_BG);

  // Empat kotak penghitung: Hadir, Sudah, Telat, Tolak
  const int order[4] = {0, 1, 3, 2};
  for (int i = 0; i < 4; i++) {
    int t = order[i];
    int x = 6 + i * 78;
    tft.fillRoundRect(x, 38, 74, 44, 6, COL_CARD);
    tft.fillRect(x + 6, 38, 62, 4, typeColor(t));
    tft.setTextDatum(middle_center);
    tft.setTextColor(COL_WHITE, COL_CARD);
    tft.setFont(&fonts::FreeSansBold12pt7b);
    tft.drawString(String(counts[t]), x + 37, 57);
    tft.setTextColor(COL_DIM, COL_CARD);
    tft.setFont(&fonts::FreeSans9pt7b);
    String lbl = TYPE_LABEL[t];
    tft.drawString(lbl, x + 37, 74);
  }

  // Daftar 5 scan terbaru (terbaru di atas)
  int shown = entryCount < 5 ? entryCount : 5;
  for (int r = 0; r < shown; r++) {
    Entry &e = entries[entryCount - 1 - r];
    int y = 88 + r * 24;
    tft.fillRoundRect(6, y, 308, 22, 5, COL_CARD);
    tft.fillCircle(18, y + 11, 5, typeColor(e.type));

    String n = String(e.name);
    if (n.length() > 11) n = n.substring(0, 11);
    tft.setFont(&fonts::FreeSans9pt7b);
    tft.setTextDatum(middle_left);
    tft.setTextColor(COL_WHITE, COL_CARD);
    tft.drawString(n, 30, y + 11);

    tft.setTextColor(typeColor(e.type), COL_CARD);
    tft.drawString(TYPE_LABEL[e.type < 4 ? e.type : 0], 150, y + 11);

    tft.setTextDatum(middle_right);
    tft.setTextColor(COL_DIM, COL_CARD);
    tft.drawString(e.clk, 308, y + 11);
  }

  if (entryCount == 0) {
    tft.setTextDatum(middle_center);
    tft.setTextColor(COL_DIM, COL_BG);
    tft.setFont(&fonts::FreeSans12pt7b);
    tft.drawString("Belum ada absen hari ini", 160, 140);
  }

  // Keterangan bawah
  String f = "Sentuh untuk kembali";
  if (pendingCount > 0) f += "   |   Antrean kirim: " + String(pendingCount);
  tft.setTextDatum(middle_center);
  tft.setTextColor(COL_DIM, COL_BG);
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.drawString(f, 160, 228);
}

// =====================================================
//                  PERPINDAHAN LAYAR
// =====================================================
void showIdle() {
  bool fromNight = (screen == SCR_NIGHT);
  screen = SCR_IDLE;
  if (fromNight) {
    tft.fillScreen(COL_BG);
    drawHeader();
    drawStatus(true);
  }
  drawIdle();
}

void showNight() {
  screen = SCR_NIGHT;
  tft.fillScreen(TFT_BLACK);
  lastSec = -1;
  drawClock(true);
}

void showRecap() {
  screen = SCR_RECAP;
  recapStart = millis();
  drawRecap();
}

// Kecerahan: penuh saat aktif, redup setelah diam, sangat redup di mode malam
void applyBrightness() {
  uint8_t target;
  if (screen == SCR_NIGHT) {
    target = BRIGHT_NIGHT;
  } else if (screen != SCR_SUCCESS && millis() - lastActivity > DIM_AFTER_MS) {
    target = BRIGHT_DIM;
  } else {
    target = BRIGHT_FULL;
  }
  if (target != curBright) {
    curBright = target;
    tft.setBrightness(target);
  }
}

// =====================================================
//                       SENTUHAN
// =====================================================
bool tapDetected() {
  static bool wasDown = false;
  static unsigned long lastTap = 0;
  bool down = false;

#if USE_TOUCH
  int32_t tx, ty;
  if (tft.getTouch(&tx, &ty)) down = true;
#endif
#if TAP_PIN >= 0
  if (digitalRead(TAP_PIN) == LOW) down = true;
#endif

  bool tap = down && !wasDown && (millis() - lastTap > 250);
  if (tap) lastTap = millis();
  wasDown = down;
  return tap;
}

void handleTap() {
  bool wasDimmed = (millis() - lastActivity > DIM_AFTER_MS);
  lastActivity = millis();

  switch (screen) {
    case SCR_NIGHT:                       // bangunkan layar
      showIdle();
      break;
    case SCR_IDLE:
      if (wasDimmed) break;               // sentuhan pertama saat redup hanya membangunkan
      showRecap();
      break;
    case SCR_RECAP:
      showIdle();
      break;
    case SCR_SUCCESS:                     // tutup lebih cepat
      successStart = millis() - SUCCESS_MS;
      break;
  }
}

// =====================================================
//                         MQTT
// =====================================================
// Ambil hanya karakter yang bisa dicetak (buang STX/ETX dsb.)
String cleanPayload(byte* payload, unsigned int length) {
  String out;
  for (unsigned int i = 0; i < length; i++) {
    char c = (char)payload[i];
    if (c >= 32 && c <= 126) out += c;
  }
  out.trim();
  return out;
}

// Payload "NAMA,STATUS" -> dipecah di koma pertama
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = cleanPayload(payload, length);
  Serial.print("Pesan [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);
  if (msg.length() == 0) return;

  int idx = msg.indexOf(',');
  if (idx < 0) {
    currentName   = msg;     // tidak ada koma: seluruh teks jadi nama
    currentStatus = "";
  } else {
    currentName   = msg.substring(0, idx);
    currentStatus = msg.substring(idx + 1);
    currentName.trim();
    currentStatus.trim();
  }
  newMsg = true;
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiTry < 5000) return;
  lastWifiTry = millis();
  Serial.println("WiFi putus, mencoba menyambung ulang...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void maintainMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (client.connected()) return;
  if (lastMqttTry != 0 && millis() - lastMqttTry < 5000) return;
  lastMqttTry = millis();

  Serial.print("Menghubungkan ke MQTT...");
  String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);

  if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("terhubung");
    client.subscribe(MQTT_TOPIC);
    flushPending();                       // kirim konfirmasi yang tertunda
  } else {
    Serial.print("gagal, rc=");
    Serial.println(client.state());
  }
}

volatile bool snapshotBusy = false;

struct SnapshotTaskParam {
  String nama;
  String status;
};

static String md5Hex(const String& s) {
  MD5Builder md5;
  md5.begin();
  md5.add(s);
  md5.calculate();
  return md5.toString();
}

static String extractAttr(const String& hdr, const String& key) {
  int idx = hdr.indexOf(key + "=\"");
  if (idx < 0) return "";
  int start = idx + key.length() + 2;
  int end = hdr.indexOf('"', start);
  if (end < 0) return "";
  return hdr.substring(start, end);
}

static String base64EncodeSimple(const String& in) {
  size_t outLen = 0;
  uint8_t out[128];
  if (mbedtls_base64_encode(out, sizeof(out) - 1, &outLen, (const uint8_t*)in.c_str(), in.length()) == 0) {
    out[outLen] = 0;
    return String((char*)out);
  }
  return "";
}

static String buildRtspAuthHeader(const String& wwwAuth, const String& method, const String& uri) {
  if (wwwAuth.length() == 0) return "";
  if (wwwAuth.indexOf("Digest") >= 0) {
    String realm = extractAttr(wwwAuth, "realm");
    String nonce = extractAttr(wwwAuth, "nonce");
    String ha1 = md5Hex(String(CAM_USER) + ":" + realm + ":" + String(CAM_PASS));
    String ha2 = md5Hex(method + ":" + uri);
    String resp = md5Hex(ha1 + ":" + nonce + ":" + ha2);
    return "Authorization: Digest username=\"" + String(CAM_USER) + "\", realm=\"" + realm +
           "\", nonce=\"" + nonce + "\", uri=\"" + uri + "\", response=\"" + resp + "\"\r\n";
  }
  String b64 = base64EncodeSimple(String(CAM_USER) + ":" + String(CAM_PASS));
  return "Authorization: Basic " + b64 + "\r\n";
}

// Ambil 1 Keyframe H.264 (SPS + PPS + IDR Frame) dari RTSP kamera lokal lalu POST ke VPS
void captureAndUploadTask(void* pvParameters) {
  SnapshotTaskParam* param = (SnapshotTaskParam*)pvParameters;
  String nama = param->nama;
  String status = param->status;
  delete param;

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient rtspClient;
    rtspClient.setTimeout(5);
    Serial.printf("[RTSP] Menghubungkan ke %s:%d%s ...\n", CAM_HOST, CAM_PORT, CAM_RTSP_PATH);

    if (rtspClient.connect(CAM_HOST, CAM_PORT)) {
      String baseUrl = String("rtsp://") + CAM_HOST + ":" + String(CAM_PORT) + String(CAM_RTSP_PATH);
      String wwwAuth = "";

      auto sendRtspCmd = [&](const String& cmd, const String& url, int cseq, const String& extraHeaders = "") -> String {
        String req = cmd + " " + url + " RTSP/1.0\r\n";
        req += "CSeq: " + String(cseq) + "\r\n";
        req += "User-Agent: ESP32-RTSP-Client\r\n";
        req += buildRtspAuthHeader(wwwAuth, cmd, url);
        req += extraHeaders;
        req += "\r\n";
        rtspClient.print(req);

        String response = "";
        unsigned long t0 = millis();
        while (millis() - t0 < 5000) {
          while (rtspClient.available()) {
            response += (char)rtspClient.read();
          }
          int hdrEnd = response.indexOf("\r\n\r\n");
          if (hdrEnd >= 0) {
            // Jika ada Content-Length (SDP), tunggu body selesai terbaca
            int clIdx = response.indexOf("Content-Length:");
            if (clIdx < 0) clIdx = response.indexOf("Content-length:");
            if (clIdx >= 0) {
              int clEnd = response.indexOf("\r\n", clIdx);
              int contentLen = response.substring(clIdx + 15, clEnd).toInt();
              if ((int)response.length() >= hdrEnd + 4 + contentLen) break;
            } else {
              break;
            }
          }
          delay(5);
        }
        return response;
      };

      int cseq = 1;
      sendRtspCmd("OPTIONS", baseUrl, cseq++);

      String descRes = sendRtspCmd("DESCRIBE", baseUrl, cseq++, "Accept: application/sdp\r\n");
      if (descRes.indexOf("401 Unauthorized") >= 0) {
        int waIdx = descRes.indexOf("WWW-Authenticate:");
        if (waIdx >= 0) {
          int waEnd = descRes.indexOf("\r\n", waIdx);
          wwwAuth = descRes.substring(waIdx + 17, waEnd);
          wwwAuth.trim();
          descRes = sendRtspCmd("DESCRIBE", baseUrl, cseq++, "Accept: application/sdp\r\n");
        }
      }

      if (descRes.indexOf("200 OK") >= 0) {
        // Parse video track control URL dari SDP
        String trackUrl = baseUrl + "/trackID=1";
        int mVid = descRes.indexOf("m=video");
        if (mVid >= 0) {
          int ctrlIdx = descRes.indexOf("a=control:", mVid);
          if (ctrlIdx >= 0) {
            int ctrlEnd = descRes.indexOf("\r\n", ctrlIdx);
            String ctrl = descRes.substring(ctrlIdx + 10, ctrlEnd);
            ctrl.trim();
            if (ctrl.startsWith("rtsp://")) trackUrl = ctrl;
            else if (ctrl.startsWith("/")) trackUrl = String("rtsp://") + CAM_HOST + ":" + String(CAM_PORT) + ctrl;
            else trackUrl = baseUrl + "/" + ctrl;
          }
        }

        // Alokasi buffer frame H.264 Annex-B (prioritas PSRAM, fallback RAM internal 90 KB)
        size_t maxFrameSize = 140 * 1024;
        uint8_t* frameBuf = (uint8_t*)ps_malloc(maxFrameSize);
        if (!frameBuf) {
          maxFrameSize = 90 * 1024;
          frameBuf = (uint8_t*)malloc(maxFrameSize);
        }

        if (frameBuf) {
          size_t frameLen = 0;

          auto appendStartCode = [&]() {
            if (frameLen + 4 < maxFrameSize) {
              frameBuf[frameLen++] = 0x00;
              frameBuf[frameLen++] = 0x00;
              frameBuf[frameLen++] = 0x00;
              frameBuf[frameLen++] = 0x01;
            }
          };

          // Ekstrak SPS & PPS dari SDP (sprop-parameter-sets) jika tersedia
          bool hasSpsPps = false;
          int spropIdx = descRes.indexOf("sprop-parameter-sets=");
          if (spropIdx >= 0) {
            int sStart = spropIdx + 21;
            int sEnd = descRes.indexOf("\r\n", sStart);
            int semi = descRes.indexOf(';', sStart);
            if (semi > 0 && (sEnd < 0 || semi < sEnd)) sEnd = semi;
            String sprop = descRes.substring(sStart, sEnd);
            sprop.trim();
            int comma = sprop.indexOf(',');
            String parts[2] = { comma >= 0 ? sprop.substring(0, comma) : sprop,
                                comma >= 0 ? sprop.substring(comma + 1) : "" };
            for (int p = 0; p < 2; p++) {
              if (parts[p].length() > 0) {
                size_t decLen = 0;
                uint8_t dec[128];
                if (mbedtls_base64_decode(dec, sizeof(dec), &decLen, (const uint8_t*)parts[p].c_str(), parts[p].length()) == 0 && decLen > 0) {
                  if (frameLen + 4 + decLen < maxFrameSize) {
                    appendStartCode();
                    memcpy(frameBuf + frameLen, dec, decLen);
                    frameLen += decLen;
                    hasSpsPps = true;
                  }
                }
              }
            }
          }

          String setupRes = sendRtspCmd("SETUP", trackUrl, cseq++, "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n");
          int sessIdx = setupRes.indexOf("Session:");
          if (setupRes.indexOf("200 OK") >= 0 && sessIdx >= 0) {
            int sessEnd = setupRes.indexOf("\r\n", sessIdx);
            String sessionId = setupRes.substring(sessIdx + 8, sessEnd);
            int semi = sessionId.indexOf(';');
            if (semi > 0) sessionId = sessionId.substring(0, semi);
            sessionId.trim();

            String playRes = sendRtspCmd("PLAY", baseUrl, cseq++, "Session: " + sessionId + "\r\nRange: npt=0.000-\r\n");
            if (playRes.indexOf("200 OK") >= 0) {
              Serial.println("[RTSP] Stream aktif, menunggu IDR Keyframe H.264...");
              bool inIdr = false;
              bool frameCaptured = false;
              unsigned long streamT0 = millis();
              size_t spsBaseline = frameLen;

              while (rtspClient.connected() && (millis() - streamT0 < 8000)) {
                if (rtspClient.available() < 4) { delay(1); continue; }
                if (rtspClient.read() != '$') continue;

                uint8_t ch = rtspClient.read();
                uint16_t pktLen = ((uint16_t)rtspClient.read() << 8) | rtspClient.read();
                if (pktLen == 0 || pktLen > 16000) continue;

                // Tunggu payload packetLen masuk
                unsigned long w0 = millis();
                while (rtspClient.available() < pktLen && millis() - w0 < 2000) delay(1);
                if (rtspClient.available() < pktLen) break;

                if (ch != 0 || pktLen <= 12) {
                  for (uint16_t i = 0; i < pktLen; i++) rtspClient.read();
                  continue;
                }

                uint8_t* pkt = (uint8_t*)malloc(pktLen);
                if (!pkt) break;
                rtspClient.readBytes(pkt, pktLen);

                bool markerBit = (pkt[1] & 0x80) != 0;
                uint8_t* rtpPayload = pkt + 12;
                int payloadLen = pktLen - 12;

                // Lewati RTP CSRC / header extension jika ada
                int csrcCount = pkt[0] & 0x0F;
                int extOffset = csrcCount * 4;
                if (pkt[0] & 0x10 && payloadLen > extOffset + 4) {
                  int extWords = ((uint16_t)rtpPayload[extOffset + 2] << 8) | rtpPayload[extOffset + 3];
                  extOffset += 4 + extWords * 4;
                }
                if (extOffset > 0 && extOffset < payloadLen) {
                  rtpPayload += extOffset;
                  payloadLen -= extOffset;
                }

                if (payloadLen > 2) {
                  uint8_t nalHeader = rtpPayload[0];
                  uint8_t nalType = nalHeader & 0x1F;

                  if (nalType >= 1 && nalType <= 23) {
                    // Single NAL Unit
                    if (nalType == 7 || nalType == 8) {
                      if (!hasSpsPps && frameLen + 4 + payloadLen < maxFrameSize) {
                        appendStartCode();
                        memcpy(frameBuf + frameLen, rtpPayload, payloadLen);
                        frameLen += payloadLen;
                        spsBaseline = frameLen;
                      }
                    } else if (nalType == 5) {
                      inIdr = true;
                      if (frameLen + 4 + payloadLen < maxFrameSize) {
                        appendStartCode();
                        memcpy(frameBuf + frameLen, rtpPayload, payloadLen);
                        frameLen += payloadLen;
                      }
                      if (markerBit) {
                        frameCaptured = true;
                        free(pkt);
                        break;
                      }
                    } else if (inIdr && markerBit) {
                      frameCaptured = true;
                      free(pkt);
                      break;
                    }
                  } else if (nalType == 28) {
                    // FU-A Fragmentation Unit (RFC 6184)
                    uint8_t fuHeader = rtpPayload[1];
                    bool startBit = (fuHeader & 0x80) != 0;
                    bool endBit   = (fuHeader & 0x40) != 0;
                    uint8_t origNalType = fuHeader & 0x1F;

                    if (origNalType == 5) {
                      if (startBit) {
                        inIdr = true;
                        uint8_t reconstructedNal = (nalHeader & 0xE0) | origNalType;
                        if (frameLen + 5 + (payloadLen - 2) < maxFrameSize) {
                          appendStartCode();
                          frameBuf[frameLen++] = reconstructedNal;
                          memcpy(frameBuf + frameLen, rtpPayload + 2, payloadLen - 2);
                          frameLen += (payloadLen - 2);
                        } else {
                          inIdr = false;
                          frameLen = spsBaseline;
                        }
                      } else if (inIdr) {
                        if (frameLen + (payloadLen - 2) < maxFrameSize) {
                          memcpy(frameBuf + frameLen, rtpPayload + 2, payloadLen - 2);
                          frameLen += (payloadLen - 2);
                        } else {
                          inIdr = false;
                          frameLen = spsBaseline;
                        }
                      }
                      if (inIdr && (endBit || markerBit)) {
                        frameCaptured = true;
                        free(pkt);
                        break;
                      }
                    }
                  } else if (nalType == 24) {
                    // STAP-A Aggregation Packet
                    int off = 1;
                    while (off + 2 < payloadLen) {
                      uint16_t nSize = ((uint16_t)rtpPayload[off] << 8) | rtpPayload[off + 1];
                      off += 2;
                      if (off + nSize <= payloadLen && nSize > 0) {
                        uint8_t subType = rtpPayload[off] & 0x1F;
                        if (subType == 7 || subType == 8 || subType == 5) {
                          if (subType == 5) inIdr = true;
                          if (frameLen + 4 + nSize < maxFrameSize) {
                            appendStartCode();
                            memcpy(frameBuf + frameLen, rtpPayload + off, nSize);
                            frameLen += nSize;
                          }
                        }
                      }
                      off += nSize;
                    }
                    if (inIdr && markerBit) {
                      frameCaptured = true;
                      free(pkt);
                      break;
                    }
                  }
                }
                free(pkt);
              }

              sendRtspCmd("TEARDOWN", baseUrl, cseq++, "Session: " + sessionId + "\r\n");
              rtspClient.stop();

              if (frameCaptured && frameLen > 0) {
                Serial.printf("[RTSP] IDR Keyframe OK: %d bytes. Mengirim ke VPS...\n", (int)frameLen);
                WiFiClientSecure secClient;
                secClient.setInsecure();
                HTTPClient vpsHttp;
                vpsHttp.begin(secClient, VPS_UPLOAD_URL);
                vpsHttp.addHeader("Content-Type", "application/octet-stream");
                vpsHttp.addHeader("X-Frame-Format", "h264-raw");
                vpsHttp.addHeader("X-Device-Key", DEVICE_API_KEY);
                vpsHttp.addHeader("X-Student-Name", nama);
                vpsHttp.addHeader("X-Attendance-Status", status);
                vpsHttp.setTimeout(8000);
                int resCode = vpsHttp.POST(frameBuf, frameLen);
                Serial.printf("[VPS] Upload H264 HTTP %d: %s\n", resCode, vpsHttp.getString().c_str());
                vpsHttp.end();
              } else {
                Serial.println("[RTSP] Gagal menangkap IDR Keyframe H.264.");
              }
            } else {
              Serial.println("[RTSP] PLAY gagal");
              rtspClient.stop();
            }
          } else {
            Serial.println("[RTSP] SETUP gagal: " + setupRes);
            rtspClient.stop();
          }
          free(frameBuf);
        } else {
          Serial.println("[RTSP] RAM tidak cukup untuk frameBuf");
          rtspClient.stop();
        }
      } else {
        Serial.println("[RTSP] DESCRIBE gagal: " + descRes);
        rtspClient.stop();
      }
    } else {
      Serial.println("[RTSP] Gagal konek TCP ke kamera");
    }
  }

  snapshotBusy = false;
  vTaskDelete(NULL);
}

void triggerSnapshotUpload(const String& nama, const String& status) {
  if (snapshotBusy) return;
  snapshotBusy = true;
  SnapshotTaskParam* param = new SnapshotTaskParam{nama, status};
  xTaskCreatePinnedToCore(captureAndUploadTask, "CamUpload", 10240, param, 1, NULL, 0);
}

// =====================================================
//                    SETUP & LOOP
// =====================================================
void setup() {
  Serial.begin(115200);

  if (!LittleFS.begin(true)) Serial.println("LittleFS gagal dimulai");
  countPending();

#if TAP_PIN >= 0
  pinMode(TAP_PIN, INPUT_PULLUP);
#endif

  tft.init();
  tft.setBrightness(255);
  tft.setRotation(1);          // landscape 320x240
  tft.fillScreen(COL_BG);

  // Sprite anti kedip
  clockSpr.setColorDepth(16);
  clockSpr.createSprite(260, 46);    // sekitar 24 KB RAM
  barSpr.setColorDepth(16);
  barSpr.createSprite(280, 6);       // sekitar 3 KB RAM

  drawHeader();
  drawStatus(true);
  drawIdle();
  lastActivity = millis();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(GMT_OFFSET_SEC, 0, "pool.ntp.org", "time.google.com", "time.nist.gov");

  Serial.print("Menghubungkan ke WiFi");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi terhubung, IP: ");
    Serial.println(WiFi.localIP());
  }

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
  client.setSocketTimeout(3);

  drawStatus(true);
}

void loop() {
  maintainWiFi();
  maintainMQTT();
  client.loop();

  // Tiap detik: cek ganti hari (rekap), status mode malam
  if (millis() - lastDayCheck > 1000) {
    lastDayCheck = millis();
    checkDay();
    nightNow = isNightNow();
  }

  // Kirim ulang antrean konfirmasi bila ada
  if (pendingCount > 0 && client.connected() && millis() - lastFlush > 10000) {
    lastFlush = millis();
    flushPending();
  }

  // ---- Pesan baru: tampilkan nama dan status ----
  if (newMsg) {
    newMsg = false;
    scanTime = nowString();
    lastName = currentName;
    lastTime = scanTime;

    int type = getType(currentStatus);
    pushEntry(currentName, type, scanTime);                 // rekap di RAM
    saveEntry(currentName, type, scanTime);                 // rekap di flash
    publishOrQueue(currentName + "," + currentStatus + "," + scanTime);   // konfirmasi

    lastActivity = millis();
    if (screen == SCR_NIGHT) {                              // bangunkan dari mode malam
      tft.fillScreen(COL_BG);
      drawHeader();
      drawStatus(true);
    }
    screen = SCR_SUCCESS;
    successStart = millis();
    applyBrightness();
    drawSuccess(currentName, currentStatus);

    // Ambil foto snapshot Tiandy HANYA saat scan berhasil (hadir / terlambat / pulang)
    if (type == 0 || type == 3) {
      triggerSnapshotUpload(currentName, currentStatus);
    }
  }

  // ---- Sentuhan / tombol BOOT ----
  if (tapDetected()) handleTap();

  // ---- Timer tiap layar ----
  if (screen == SCR_SUCCESS) {
    drawProgress();
    if (millis() - successStart >= SUCCESS_MS) {
      showIdle();
    }
  } else if (screen == SCR_RECAP) {
    if (millis() - recapStart >= RECAP_TIMEOUT_MS) showIdle();
  } else if (screen == SCR_IDLE) {
    // Diam 60 detik di luar jam kerja -> mode malam
    if (nightNow && millis() - lastActivity > DIM_AFTER_MS) showNight();
  } else if (screen == SCR_NIGHT) {
    // Pagi tiba -> kembali ke layar tunggu (tetap redup sampai ada aktivitas)
    if (!nightNow) showIdle();
  }

  applyBrightness();
  drawStatus();     // hanya digambar ulang kalau status WiFi/MQTT berubah
  drawClock();      // hanya digambar ulang saat detik berganti
}