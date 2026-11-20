#include <WiFi.h>
#include <HTTPClient.h>

// Struktur untuk menyimpan kredensial dan target
struct RtspConfig {
  const char* cameraIp;
  int cameraPort;
  const char* rtspPath;     // contoh: "/Streaming/Channels/102" (Sub-stream)
  const char* vpsUploadUrl; // contoh: "http://vps-anda.com/api/upload-frame"
};

/**
 * Function utama: Mengambil 1 Keyframe H.264 dari RTSP & mengirimkannya ke VPS
 */
bool captureRtspH264AndSendToVps(RtspConfig config) {
  WiFiClient rtspClient;
  Serial.println("[RTSP] Menghubungkan ke kamera...");

  if (!rtspClient.connect(config.cameraIp, config.cameraPort)) {
    Serial.println("[RTSP] Gagal terhubung ke IP Kamera!");
    return false;
  }

  String baseUrl = "rtsp://" + String(config.cameraIp) + ":" + String(config.cameraPort) + String(config.rtspPath);
  
  // Helper lambda untuk mengirim request RTSP dan membaca respon
  auto sendRtspCmd = [&](String cmd, int cseq, String extraHeaders = "") -> String {
    String req = cmd + " " + baseUrl + " RTSP/1.0\r\n";
    req += "CSeq: " + String(cseq) + "\r\n";
    req += "User-Agent: ESP32-RTSP-Client\r\n";
    req += extraHeaders;
    req += "\r\n";
    
    rtspClient.print(req);
    
    unsigned long timeout = millis();
    while (rtspClient.available() == 0) {
      if (millis() - timeout > 5000) return "";
      delay(10);
    }
    
    String response = "";
    while (rtspClient.available()) {
      response += (char)rtspClient.read();
    }
    return response;
  };

  // 1. RTSP Handshake: OPTIONS -> DESCRIBE -> SETUP -> PLAY
  if (sendRtspCmd("OPTIONS", 1).indexOf("200 OK") == -1) return false;
  
  String descRes = sendRtspCmd("DESCRIBE", 2, "Accept: application/sdp\r\n");
  if (descRes.indexOf("200 OK") == -1) return false;

  // Menggunakan TCP Interleaved (RTP/AVP/TCP) agar data video lewat satu koneksi socket
  String setupRes = sendRtspCmd("SETUP", 3, "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n");
  if (setupRes.indexOf("200 OK") == -1) return false;

  // Ekstrak Session ID
  int sessionIdx = setupRes.indexOf("Session: ");
  if (sessionIdx == -1) return false;
  String sessionId = setupRes.substring(sessionIdx + 9);
  sessionId = sessionId.substring(0, sessionId.indexOf("\r\n"));
  if (sessionId.indexOf(";") != -1) {
    sessionId = sessionId.substring(0, sessionId.indexOf(";")); // Hapus timeout parameter jika ada
  }

  // Mulai streaming
  String playRes = sendRtspCmd("PLAY", 4, "Session: " + sessionId + "\r\nRange: npt=0.000-\r\n");
  if (playRes.indexOf("200 OK") == -1) return false;

  Serial.println("[RTSP] Stream dimulai. Menangkap Keyframe H.264...");

  // 2. Alokasi Buffer untuk menampung 1 Frame H.264 (Gunakan PSRAM jika tersedia)
  const size_t MAX_FRAME_SIZE = 150 * 1024; // 150 KB cukup untuk 1 frame sub-stream
  uint8_t* frameBuffer = (uint8_t*)ps_malloc(MAX_FRAME_SIZE);
  if (!frameBuffer) {
    frameBuffer = (uint8_t*)malloc(60 * 1024); // Fallback ke internal RAM (60 KB)
  }
  if (!frameBuffer) {
    Serial.println("[ERR] Memori tidak cukup!");
    rtspClient.stop();
    return false;
  }

  size_t frameLen = 0;
  bool frameCaptured = false;
  unsigned long streamTimeout = millis();

  // 3. Baca paket RTP over TCP (Diawali byte '$', diikuti channel 0, dan 2 byte panjang paket)
  while (rtspClient.connected() && (millis() - streamTimeout < 8000)) {
    if (rtspClient.available() >= 4) {
      if (rtspClient.read() == '$') {
        uint8_t channel = rtspClient.read();
        uint16_t packetLen = (rtspClient.read() << 8) | rtspClient.read();

        // Tunggu hingga seluruh payload RTP masuk
        unsigned long pktWait = millis();
        while (rtspClient.available() < packetLen && (millis() - pktWait < 2000)) {
          delay(1);
        }

        if (channel == 0 && packetLen > 12) { // Channel 0 = Video RTP, 12 byte pertama = RTP Header
          uint8_t rtpHeader[12];
          rtspClient.readBytes(rtpHeader, 12);
          bool markerBit = (rtpHeader[1] & 0x80) != 0; // Marker bit = akhir dari 1 frame video
          size_t payloadLen = packetLen - 12;

          if (frameLen + payloadLen + 4 < MAX_FRAME_SIZE) {
            // Tambahkan H.264 Start Code (0x00 0x00 0x00 0x01) sebelum payload NAL
            frameBuffer[frameLen++] = 0x00;
            frameBuffer[frameLen++] = 0x00;
            frameBuffer[frameLen++] = 0x00;
            frameBuffer[frameLen++] = 0x01;

            rtspClient.readBytes(frameBuffer + frameLen, payloadLen);
            frameLen += payloadLen;

            // Jika markerBit aktif dan ukuran frame sudah cukup besar (indikasi I-Frame/Keyframe)
            if (markerBit && frameLen > 5000) {
              frameCaptured = true;
              break;
            }
          } else {
            // Buang sisa byte jika buffer penuh
            for (size_t i = 0; i < payloadLen; i++) rtspClient.read();
          }
        } else {
          // Abaikan channel RTCP (channel 1)
          for (size_t i = 0; i < packetLen; i++) rtspClient.read();
        }
      }
    }
  }

  // Hentikan stream dengan sopan
  sendRtspCmd("TEARDOWN", 5, "Session: " + sessionId + "\r\n");
  rtspClient.stop();

  if (!frameCaptured) {
    Serial.println("[RTSP] Gagal menangkap frame utuh.");
    free(frameBuffer);
    return false;
  }

  Serial.printf("[RTSP] Frame tertangkap! Ukuran: %d bytes. Mengirim ke VPS...\n", frameLen);

  // 4. Kirim Raw H.264 Frame ke VPS via HTTP POST
  HTTPClient http;
  http.begin(config.vpsUploadUrl);
  http.addHeader("Content-Type", "application/octet-stream");
  http.addHeader("X-Frame-Format", "h264-raw");

  int httpResponseCode = http.POST(frameBuffer, frameLen);
  bool uploadSuccess = (httpResponseCode >= 200 && httpResponseCode < 300);

  if (uploadSuccess) {
    Serial.printf("[VPS] Berhasil terkirim! HTTP Code: %d\n", httpResponseCode);
  } else {
    Serial.printf("[VPS] Gagal kirim. Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  free(frameBuffer);
  return uploadSuccess;
}