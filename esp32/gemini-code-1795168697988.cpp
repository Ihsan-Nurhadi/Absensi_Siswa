void setup() {
  Serial.begin(115200);
  WiFi.begin("NAMA_WIFI", "PASSWORD_WIFI");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  RtspConfig camConfig = {
    .cameraIp = "192.168.1.100",
    .cameraPort = 554,
    .rtspPath = "/Streaming/Channels/102", // Gunakan Sub-stream (resolusi rendah)
    .vpsUploadUrl = "http://ip-vps-anda.com/upload"
  };

  captureRtspH264AndSendToVps(camConfig);
}

void loop() {
  // Panggil berkala jika dibutuhkan
}