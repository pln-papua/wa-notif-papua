# WA Notif Papua — CLAUDE.md

Sistem notifikasi WhatsApp realtime untuk pemadaman listrik di PLN UIW Papua & Papua Barat, berbasis data SCADA (Powerscene/Survalent).

## Stack

- **Runtime**: Node.js + TypeScript (strict)
- **Framework**: Express
- **Database**: MySQL / MariaDB (`mysql2/promise`, connection pool)
- **WA Broker**: Wablas API (token-based, support grup & nomor)
- **Scheduler**: `node-cron` (rekap H-1 setiap 00:01 WIT)
- **Polling**: `setInterval` baca tabel `event` tiap N detik

## Perintah

```bash
npm run dev        # dev server dengan hot-reload (ts-node-dev)
npm run build      # compile ke dist/
npm start          # jalankan dist/app.js
npm run typecheck  # cek TypeScript tanpa compile
```

## Struktur file penting

| File | Fungsi |
|------|--------|
| `src/app.ts` | Entry point, startup DB + poller + scheduler |
| `src/services/poller.service.ts` | Loop polling event SCADA, klasifikasi gangguan vs pemeliharaan |
| `src/services/message.service.ts` | Format semua tipe pesan WA (padam, penormalan, rekap) |
| `src/services/db.service.ts` | Semua query MySQL |
| `src/services/wablas.service.ts` | Kirim pesan ke Wablas API |
| `src/scheduler/recap.scheduler.ts` | Cron rekap gangguan H-1 per UP3 |
| `src/utils/date.util.ts` | Format tanggal Indonesia, hitung durasi padam |
| `database/schema.sql` | DDL tabel `event`, `aset`, `notif_log` |

## Database

Tiga tabel utama:

- **`event`** — diisi oleh SCADA; script hanya membaca + update `processed=1`
- **`aset`** — data master PMT/CB per UP3, diisi manual; kolom: `code, up3, ulp, source, name, zona, section, type, unit, load, pelanggan`
- **`notif_log`** — rekaman notifikasi yang sudah dikirim; digunakan untuk korelasi OPEN→CLOSE dan rekap H-1

Kolom `code` di `aset` harus cocok persis dengan kolom `description` di `event` (contoh: `42.GISKY.F01.Z01`).

## Logika poller

1. Ambil event dengan `processed=0` dan `timestamp < NOW() - settling_seconds`
2. Proses event **OPEN** (CB/PMCB/LBS/REC OPEN):
   - Cari event OCR/GFR/TRIP ON dan AMF dengan `description` sama dalam window waktu → **gangguan**
   - Jika tidak ada → **pemeliharaan**
   - Kirim notif WA, simpan ke `notif_log`, tandai event sebagai processed
3. Proses event **CLOSE**:
   - Cari entri terbuka di `notif_log` by `description`
   - Hitung durasi padam, kirim notif penormalan
   - Update `notif_log` dengan `time_on` dan `event_id_close`

## Format kode aset (description)

```
42.GISKY.F01.Z01        — tanpa section
42.GISKY.F02.Z02.S01    — dengan section
```

Prefix `42` = kode UIW. `GISKY` = nama GI/sumber. `F01` = feeder. `Z01` = zona. `S01` = section.

## Tipe pesan WA

| Kondisi | Builder |
|---------|---------|
| CB OPEN + OCR/GFR/TRIP | `buildPadamGangguan()` |
| CB OPEN saja | `buildPadamPemeliharaan()` |
| CB CLOSE (pasangan gangguan) | `buildPenormalanGangguan()` |
| CB CLOSE (pasangan pemeliharaan) | `buildPenormalanPemeliharaan()` |
| Cron 00:01 WIT | `buildRekapGangguan()` per UP3 |

## Environment variables

Salin `.env.example` → `.env`. Variabel wajib:

```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
WABLAS_TOKEN, WABLAS_BASE_URL
WA_TARGETS   — comma-separated group ID atau nomor WA
```

`WA_TARGETS` yang mengandung `@g.us` dikirim ke endpoint grup Wablas, sisanya ke endpoint pesan biasa.

## Konvensi kode

- Tidak ada `any` — gunakan tipe eksplisit atau generic
- Query DB selalu via `db.service.ts`, tidak langsung dari handler
- Format pesan selalu via `message.service.ts`
- Semua string format tanggal/waktu via `date.util.ts` (bukan `toLocaleString`)
- Error di poller/scheduler di-log tapi tidak menghentikan proses (graceful continue)
