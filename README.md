# WA Notif Papua

Sistem notifikasi WhatsApp realtime untuk pemadaman listrik di **PLN UIW Papua & Papua Barat**, berbasis data event SCADA (Powerscene/Survalent).

## Fitur

- Notifikasi otomatis saat CB/PMCB/LBS/Recloser **OPEN** (padam gangguan & pemeliharaan)
- Notifikasi otomatis saat **CLOSE** (penormalan) beserta durasi padam
- Deteksi otomatis jenis padam: **gangguan** (ada OCR/GFR/TRIP) vs **pemeliharaan**
- Informasi arus gangguan (AMFR, AMFS, AMFT, AMFN) dari event AMF
- Frekuensi gangguan bulanan & tahunan per PMT/CB
- Rekap harian gangguan H-1 per UP3 (cron 00:01 WIT)
- Pengiriman ke grup & nomor WhatsApp via Wablas API

## Prasyarat

- Node.js >= 18
- MySQL / MariaDB
- Akun Wablas dengan token aktif
- PM2 (untuk production): `npm install -g pm2`

## Instalasi

```bash
# Clone / copy project
cd wa-notif-papua

# Install dependencies
npm install

# Buat file .env
cp .env.example .env
```

Edit `.env` dengan konfigurasi yang sesuai.

## Konfigurasi `.env`

```env
# Server
PORT=3000

# Database MySQL/MariaDB
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=scada_history

# Polling
POLLING_INTERVAL_MS=5000    # interval cek event (ms)
SETTLING_SECONDS=15         # tunggu N detik sebelum proses event

# Wablas
WABLAS_TOKEN=your_token
WABLAS_BASE_URL=https://my.wablas.com

# Target WA — pisahkan dengan koma
# Grup: gunakan group ID format xxxx@g.us
# Individu: gunakan nomor format 628xxxxxxxxxx
WA_TARGETS=628xxxxxxxxxx@g.us,628xxxxxxxxxx
```

## Setup Database

Jalankan DDL schema di MySQL:

```bash
mysql -u root -p scada_history < database/schema.sql
```

Lalu insert data master aset per UP3 ke tabel `aset`. Kolom `code` **harus cocok persis** dengan kolom `description` di tabel `event` SCADA.

Contoh insert:

```sql
INSERT INTO aset (code, up3, ulp, source, name, zona, section, type, unit, load, pelanggan)
VALUES ('42.GISKY.F01.Z01', 'JAYAPURA', 'ABEPURA', 'GI SKYLINE', 'GARUDA', '01', '00', 'FEEDER', 'CB', 4500, 125);
```

## Menjalankan

### Development

```bash
npm run dev        # hot-reload via ts-node-dev
npm run typecheck  # cek TypeScript tanpa compile
```

### Production (PM2)

```bash
# Build + start sekaligus
npm run deploy

# Daftarkan agar otomatis start saat server reboot
pm2 save
pm2 startup        # ikuti instruksi yang muncul
```

#### Perintah PM2 lainnya

```bash
npm run pm2:status   # lihat status proses
npm run pm2:logs     # lihat log realtime
npm run pm2:restart  # restart proses
npm run pm2:reload   # reload tanpa downtime
npm run pm2:stop     # stop proses
```

Log tersimpan di folder `logs/`:
- `logs/out.log` — output normal
- `logs/err.log` — error log

#### Log rotation (jalankan sekali setelah deploy pertama)

```bash
npm run logs:rotate
```

Perintah ini menginstall `pm2-logrotate` dan mengkonfigurasinya:
- Rotasi otomatis setiap hari tengah malam
- Rotasi juga dipicu jika ukuran file melebihi 10 MB
- Log lama dikompresi ke `.gz`
- Menyimpan log 7 hari terakhir, sisanya dihapus otomatis

## Format kode aset

Kolom `description` di tabel `event` SCADA mengikuti format:

```
42.GISKY.F01.Z01          — zona tanpa section
42.GISKY.F02.Z02.S01      — dengan section
```

| Bagian | Keterangan |
|--------|-----------|
| `42`   | Kode UIW Papua |
| `GISKY` | Nama GI / sumber |
| `F01`  | Nomor feeder |
| `Z01`  | Zona |
| `S01`  | Section (opsional) |

## Format pesan WhatsApp

### Padam Gangguan
```
NOTIFIKASI SISTEM SCADA
==============================
SENIN, 11/05/2026 13:01:34
==============================
Info padam gangguan
--------------------------------------------------
Event Id    : 101
UP3         : JAYAPURA
ULP         : ABEPURA
Name        : GARUDA
Type        : FEEDER
Zona        : 01
Section     : -
Event       : CB OPEN
Time        : 11/05/2026 13:01:05.211
--------------------------------------------------
Indikasi    : GFR
AMFR        : 300
AMFS        : 23
AMFT        : 24
AMFN        : 250
--------------------------------------------------
Frekuensi gangguan bulanan  : 2
Frekuensi gangguan tahunan  : 10
Load (kW)   : 4500
Pelanggan   : 125
```

### Padam Pemeliharaan
```
NOTIFIKASI SISTEM SCADA
==============================
SENIN, 11/05/2026 13:01:34
==============================
Info padam manuver/ pemeliharaan
--------------------------------------------------
Event Id    : 102
...
Load (kW)   : 4500
Pelanggan   : 125
```

### Penormalan
```
NOTIFIKASI SISTEM SCADA
==============================
Info penormalan gangguan
--------------------------------------------------
...
Time Off    : 11/05/2026 13:01:05.211
Time On     : 11/05/2026 13:25:04.231
Duration    : 0 hari 0 jam 24 menit 3 detik
...
```

## Arsitektur

```
SCADA (Powerscene)
      │ insert events
      ▼
   [event table]
      │ polling tiap N detik
      ▼
 poller.service.ts
      │ klasifikasi OPEN → gangguan / pemeliharaan
      │ korelasi CLOSE ← notif_log
      ▼
 message.service.ts ──► wablas.service.ts ──► WhatsApp Group
      │
      ▼
  [notif_log table]
      │
      ▼
 recap.scheduler.ts (00:01 WIT) ──► Rekap H-1 per UP3
```

## API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/health` | Cek status server & koneksi DB |

## Struktur Project

```
wa-notif-papua/
├── src/
│   ├── config/
│   │   ├── env.ts              # Konfigurasi environment
│   │   └── database.ts         # MySQL connection pool
│   ├── models/
│   │   ├── event.model.ts      # Tipe event SCADA + helper
│   │   ├── aset.model.ts       # Tipe master aset
│   │   └── notif-log.model.ts  # Tipe log notifikasi
│   ├── services/
│   │   ├── db.service.ts       # Semua query MySQL
│   │   ├── wablas.service.ts   # Kirim pesan Wablas
│   │   ├── message.service.ts  # Format pesan WA
│   │   └── poller.service.ts   # Loop polling event
│   ├── scheduler/
│   │   └── recap.scheduler.ts  # Cron rekap H-1
│   ├── utils/
│   │   └── date.util.ts        # Format tanggal Indonesia
│   ├── routes/
│   │   └── index.ts            # Express routes
│   └── app.ts                  # Entry point
├── database/
│   └── schema.sql              # DDL tabel
├── logs/                       # Log PM2 (auto-generated)
├── dist/                       # Output build TypeScript
├── ecosystem.config.js         # Konfigurasi PM2
├── .env.example                # Template environment variables
└── .env                        # Konfigurasi aktif (tidak di-commit)
```
