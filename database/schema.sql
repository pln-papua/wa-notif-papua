-- ============================================================
-- Schema for WA Notif Papua - PLN UIW Papua & Papua Barat
-- ============================================================

-- Tabel aset: data master PMT/CB per UP3
CREATE TABLE IF NOT EXISTS aset (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(100) NOT NULL UNIQUE,  -- 42.GISKY.F01.Z01
  up3        VARCHAR(50)  NOT NULL,          -- JAYAPURA
  ulp        VARCHAR(50)  NOT NULL,          -- ABEPURA
  `source`   VARCHAR(50)  NOT NULL,          -- GI SKYLINE
  `name`     VARCHAR(100) NOT NULL,          -- GARUDA
  zona       VARCHAR(10)  NOT NULL,          -- 01
  section    VARCHAR(10)  NOT NULL DEFAULT '00',
  `type`     VARCHAR(20)  NOT NULL,          -- FEEDER / PENYULANG
  unit       VARCHAR(20)  NOT NULL,          -- CB / PMCB / LBS / REC
  `load`     INT          NOT NULL DEFAULT 0,
  pelanggan  INT          NOT NULL DEFAULT 0,
  INDEX idx_code (code),
  INDEX idx_up3  (up3)
);

-- Tabel event: data event dari SCADA (Powerscene/Survalent)
-- Script hanya membaca tabel ini; SCADA yang mengisi.
-- Tidak ada kolom processed — posisi baca dilacak via poller_state.
CREATE TABLE IF NOT EXISTS event (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(100) NOT NULL,   -- 42.GISKY.F01.Z01
  message     VARCHAR(200) NOT NULL,   -- CB OPEN / OCR ON / AMF;300;23;24;250
  timestamp   DATETIME(3)  NOT NULL
  -- Tidak ada secondary index: query poller hanya pakai PK (id > last_id)
  -- sehingga clustered index cukup. Menambah index di sini hanya membebani INSERT dari SCADA.
);

-- Tabel poller_state: menyimpan posisi baca terakhir (bookmark ID)
-- Selalu hanya 1 baris (id=1). Query event menggunakan WHERE id > last_event_id
-- sehingga scan selalu pada primary key (clustered index) — efisien meski data besar.
CREATE TABLE IF NOT EXISTS poller_state (
  id            INT     PRIMARY KEY DEFAULT 1,
  last_event_id BIGINT  NOT NULL    DEFAULT 0
);
INSERT IGNORE INTO poller_state (id, last_event_id) VALUES (1, 0);

-- Tabel notif_log: rekaman notifikasi yang sudah dikirim
CREATE TABLE IF NOT EXISTS notif_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  description     VARCHAR(100)                   NOT NULL,
  type            ENUM('gangguan','pemeliharaan') NOT NULL,
  event_id_open   INT                            NOT NULL,
  event_id_close  INT                            DEFAULT NULL,
  indikasi        VARCHAR(20)                    DEFAULT NULL,  -- OCR / GFR / TRIP
  amfr            DECIMAL(10,2)                  DEFAULT NULL,
  amfs            DECIMAL(10,2)                  DEFAULT NULL,
  amft            DECIMAL(10,2)                  DEFAULT NULL,
  amfn            DECIMAL(10,2)                  DEFAULT NULL,
  time_off        DATETIME(3)                    NOT NULL,
  time_on         DATETIME(3)                    DEFAULT NULL,
  wa_sent_open    TINYINT(1)                     NOT NULL DEFAULT 0,
  wa_sent_close   TINYINT(1)                     NOT NULL DEFAULT 0,
  created_at      DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_description (description),
  INDEX idx_time_off    (time_off),
  INDEX idx_open_only   (description, event_id_close)
);
