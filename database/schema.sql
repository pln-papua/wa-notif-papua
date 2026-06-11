-- ============================================================
-- Schema for WA Notif Papua - PLN UIW Papua & Papua Barat
-- ============================================================

-- Tabel aset: data master PMT/CB per UP3
CREATE TABLE IF NOT EXISTS aset (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  apktcode   VARCHAR(30)  NOT NULL UNIQUE,  -- 42.KOTA1.F01.Z01
  up3        VARCHAR(20)  NOT NULL,          -- NABIRE
  ulp        VARCHAR(20)  NOT NULL,          -- NABIRE KOTA
  aset       VARCHAR(15)  NOT NULL,          -- FEEDER / ZONA / SECTION
  nama       VARCHAR(50)  NOT NULL,          -- FEEDER MERBAU
  feeder     VARCHAR(15)  NOT NULL,          -- MERBAU
  zona       VARCHAR(10)  DEFAULT NULL,      -- 1, 2 (NULL untuk level FEEDER)
  section    VARCHAR(10)  DEFAULT NULL,      -- 1, MNV1 (NULL untuk level FEEDER/ZONA)
  beban      VARCHAR(10)  DEFAULT NULL,        -- kW
  pelanggan  VARCHAR(10)  DEFAULT NULL,
  INDEX idx_apktcode (apktcode),
  INDEX idx_up3      (up3)
);

-- Tabel scada_alarm: data alarm dari SCADA (Powerscene/Survalent)
-- Script hanya membaca tabel ini; SCADA yang mengisi.
-- Tidak ada kolom processed — posisi baca dilacak via poller_state.
-- Format kolom description: "DEVICE_NAME, 42.KOTA1.F01.Z02" atau
--   "DEVICE_NAME, 42.KOTA1.F01.Z02:FAULTTYPE:AMFR:AMFS:AMFT:AMFN"
-- Format kolom event: CB_TRIP, CB_OPEN, CB_CLOSE, CB_CLOSE Manually Inputted, dst.
-- CREATE TABLE scada_alarm (
--   id          BIGINT AUTO_INCREMENT PRIMARY KEY,
--   pid         BIGINT NOT NULL DEFAULT 0,
--   type        INT NOT NULL,
--   origin      VARCHAR(50),
--   description VARCHAR(200),
--   value       INT,
--   event       VARCHAR(100),
--   processtime DATETIME(3)
--   -- ... kolom lain diisi SCADA
-- );

-- Tabel poller_state: menyimpan posisi baca terakhir (bookmark ID)
-- Selalu hanya 1 baris (id=1). Query scada_alarm menggunakan WHERE id > last_event_id
-- sehingga scan selalu pada primary key (clustered index) — efisien meski data besar.
CREATE TABLE IF NOT EXISTS poller_state (
  id            INT     PRIMARY KEY DEFAULT 1,
  last_event_id BIGINT  NOT NULL    DEFAULT 0
);
INSERT IGNORE INTO poller_state (id, last_event_id) VALUES (1, 0);

-- Tabel notif_log: rekaman notifikasi yang sudah dikirim
CREATE TABLE IF NOT EXISTS notif_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  description     VARCHAR(100)                   NOT NULL,  -- apktcode dari aset
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
