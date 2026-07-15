# WA Notif Papua — CLAUDE.md

Sistem notifikasi WhatsApp realtime untuk pemadaman listrik di PLN UIW Papua & Papua Barat, berbasis data SCADA (Powerscene/Survalent).

## Stack

- **Runtime**: Node.js + TypeScript (strict)
- **Framework**: Express
- **Database**: MySQL / MariaDB (`mysql2/promise`, connection pool)
- **WA Broker**: WHA Center API (device_id, JSON body, support grup & nomor)
- **Scheduler**: `node-cron` (rekap H-1 setiap 00:01 WIT)
- **Polling**: `setInterval` baca tabel `event` tiap N detik, posisi baca via `poller_state`
- **Process manager**: PM2 (`ecosystem.config.js`)

## Perintah

```bash
npm run dev        # dev server dengan hot-reload (ts-node-dev)
npm run build      # compile ke dist/
npm start          # jalankan dist/app.js
npm run typecheck  # cek TypeScript tanpa compile
npm run deploy     # build + pm2 start
npm run pm2:logs   # lihat log realtime
```

## Struktur file penting

| File | Fungsi |
|------|--------|
| `src/app.ts` | Entry point, startup DB + poller + scheduler |
| `src/services/poller.service.ts` | Loop polling event SCADA, klasifikasi gangguan vs pemeliharaan |
| `src/services/message.service.ts` | Format semua tipe pesan WA (padam, penormalan, rekap) |
| `src/services/db.service.ts` | Semua query MySQL |
| `src/services/whacenter.service.ts` | Kirim pesan ke WHA Center API |
| `src/scheduler/recap.scheduler.ts` | Cron rekap gangguan H-1 per UP3 |
| `src/utils/date.util.ts` | Format tanggal Indonesia, hitung durasi padam |
| `database/schema.sql` | DDL tabel `event`, `aset`, `notif_log`, `poller_state` |

## Database

Empat tabel:

- **`event`** — diisi oleh SCADA; script hanya membaca, **tidak ada kolom `processed`**
- **`aset`** — data master PMT/CB per UP3, diisi manual; kolom: `code, up3, ulp, source, name, zona, section, type, unit, load, pelanggan`
- **`notif_log`** — rekaman notifikasi yang sudah dikirim; digunakan untuk korelasi TRIP→CLOSE dan rekap H-1
- **`poller_state`** — satu baris, kolom `last_event_id`; menyimpan posisi baca terakhir

Kolom `code` di `aset` harus cocok persis dengan kolom `description` di `event` (contoh: `42.GISKY.F01.Z01`).

Tabel `event` hanya memiliki **primary key** sebagai index — tidak ada secondary index karena query poller menggunakan `WHERE id > last_event_id` (pure clustered index scan).

## Logika poller

1. Baca `last_event_id` dari `poller_state`
2. Ambil event dengan `id > last_event_id` (LIMIT 500), filter di aplikasi: hanya proses event dengan `timestamp <= NOW() - settling_seconds`
3. Proses event **TRIP** (CB/PMCB/LBS/REC TRIP) → **gangguan**:
   - Cari event AMF dengan `description` sama di batch yang sama
   - Kirim notif padam gangguan, simpan ke `notif_log`
4. Proses event **OPEN** (CB/PMCB/LBS/REC OPEN) → **pemeliharaan**:
   - Kirim notif padam pemeliharaan, simpan ke `notif_log`
5. Proses event **CLOSE** (CB/PMCB/LBS/REC CLOSE):
   - Cari entri terbuka di `notif_log` by `description`
   - Hitung durasi padam, kirim notif penormalan
   - Update `notif_log` dengan `time_on` dan `event_id_close`
6. Advance `last_event_id` ke `max(id)` batch yang diproses

Counter hanya diadvance setelah seluruh batch selesai — jika error fatal, counter tidak maju dan batch diretry poll berikutnya.

## Format kode aset (description)

```
42.GISKY.F01.Z01        — tanpa section
42.GISKY.F02.Z02.S01    — dengan section
```

Prefix `42` = kode UIW. `GISKY` = nama GI/sumber. `F01` = feeder. `Z01` = zona. `S01` = section.

## Tipe pesan WA

| Kondisi | Builder |
|---------|---------|
| CB/PMCB/LBS/REC **TRIP** | `buildPadamGangguan()` |
| CB/PMCB/LBS/REC **OPEN** | `buildPadamPemeliharaan()` |
| CB/PMCB/LBS/REC **CLOSE** (pasangan gangguan) | `buildPenormalanGangguan()` |
| CB/PMCB/LBS/REC **CLOSE** (pasangan pemeliharaan) | `buildPenormalanPemeliharaan()` |
| Cron 00:01 WIT | `buildRekapGangguan()` per UP3 |

## WHA Center API

- Grup: `POST {baseUrl}/api/sendGroup` — body: `device_id, number (diisi group id), message, file, schedule`
- Nomor individu: `POST {baseUrl}/api/send` — body: `device_id, number, message, file, schedule`
- Body: JSON; `file` dan `schedule` selalu dikirim `null` (tidak dipakai)
- Tidak ada header auth terpisah — `device_id` berfungsi sebagai identitas pengirim
- Response: `{ Status: boolean, Data: { message_id }, Message: string }`
- Ada 4 device_id, satu per pasangan region UP3 (Timika&Biak, Manokwari&Nabire, Sorong&Fakfak, Jayapura&Wamena). `sendMessage(message, up3)` memilih device_id lewat `deviceIdByUp3` di `env.ts` berdasarkan `up3` dari aset; target grup/nomor tetap sama untuk semua device_id.

## Environment variables

Salin `.env.example` → `.env`. Variabel wajib:

```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
WHACENTER_DEVICE_ID_TIMIKA_BIAK, WHACENTER_DEVICE_ID_MANOKWARI_NABIRE
WHACENTER_DEVICE_ID_SORONG_FAKFAK, WHACENTER_DEVICE_ID_JAYAPURA_WAMENA
WHACENTER_BASE_URL
WA_GROUP_TARGETS   — comma-separated group id WHA Center (dikirim via field "number")
WA_NUMBER_TARGETS  — comma-separated nomor individu (628xxxxxxxxxx)
```

## Konvensi kode

- Tidak ada `any` — gunakan tipe eksplisit atau generic
- Query DB selalu via `db.service.ts`, tidak langsung dari handler
- Format pesan selalu via `message.service.ts`
- Semua string format tanggal/waktu via `date.util.ts` (bukan `toLocaleString`)
- Error di poller/scheduler di-log tapi tidak menghentikan proses (graceful continue)
- Setiap fungsi di service wajib ada `console.log` untuk info/debug
