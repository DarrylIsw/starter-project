# RIS Website

RIS Website adalah aplikasi web untuk mengelola proses riset LPPM: pengajuan penelitian internal, pengajuan surat, pelaporan penelitian, pelaporan luaran, logbook, dan manajemen informasi peneliti. Project ini memakai React untuk frontend dan Express untuk backend API, dengan dukungan PostgreSQL melalui library `pg`.

README ini ditulis untuk developer berikutnya yang akan melanjutkan maintenance, integrasi database, dan pengembangan fitur.

## Status Singkat

- Frontend RIS berada di `app/containers/Ris`.
- Backend Express berada di `server`.
- Data demo dan sebagian besar aksi mutasi saat ini masih disimpan di `localStorage` browser melalui `RisContext`.
- API backend saat ini terutama menyediakan endpoint baca dari PostgreSQL dan fallback jika database belum dikonfigurasi.
- Jangan menampilkan istilah penamaan internal seperti label tahapan migrasi atau nomor paket pekerjaan di UI aplikasi.

## Tech Stack

- React 18
- React Router v5
- Express 4
- PostgreSQL melalui `pg`
- Webpack 5
- Sass/CSS biasa untuk styling RIS
- Local browser storage untuk state demo/prototype

## Struktur Project

```text
starter-project/
├── app/
│   ├── containers/
│   │   ├── Ris/
│   │   │   ├── components/                  # Layout, Icon, UI primitives
│   │   │   ├── pages/                       # Halaman utama RIS
│   │   │   ├── RisContext.js                # Auth demo, state, localStorage
│   │   │   ├── data.js                      # Seed/demo data frontend
│   │   │   ├── workflow.js                  # Role, akses, status proposal internal
│   │   │   ├── letterWorkflow.js            # Workflow pengajuan surat
│   │   │   ├── externalResearchWorkflow.js  # Workflow pelaporan penelitian eksternal
│   │   │   ├── researcherProfileWorkflow.js # Workflow profil peneliti
│   │   │   └── ris.css                      # Styling utama RIS
│   │   └── pageListAsync.js                 # Entry async page template
│   └── ...
├── server/
│   ├── config/db.js                         # Konfigurasi PostgreSQL
│   ├── controllers/                         # Controller API
│   ├── models/                              # Raw SQL query
│   ├── routes/                              # Route API
│   ├── middlewares/                         # Auth optional, logger, error handler
│   └── index.js                             # Express app
├── public/                                  # Static assets
├── internals/                               # Webpack/scripts template
├── index.js                                # Entry backend
├── package.json
└── .env.example
```

## Setup Lokal

Pastikan Node dan npm tersedia. `package.json` masih berasal dari template lama dan menyatakan `node >= 12.13.0`, tetapi script sudah memakai `NODE_OPTIONS=--openssl-legacy-provider` agar build tetap berjalan pada Node modern.

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Jalankan development server:

```bash
npm start
```

Default port mengikuti `.env`, saat ini contoh memakai `PORT=3001`. Buka:

```text
http://localhost:3001
```

4. Build production:

```bash
npm run build
```

5. Jalankan lint/test project:

```bash
npm test
```

Catatan: gunakan `npm test` langsung. Jangan tambahkan argumen Jest seperti `--runInBand`, karena test script project ini menjalankan ESLint, bukan Jest.

## Environment

Contoh `.env`:

```env
PORT=3001
HOST=

DATABASE_URL=
PGHOST=
PGPORT=5432
PGDATABASE=
PGUSER=
PGPASSWORD=
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

Database bisa dikonfigurasi lewat `DATABASE_URL` atau kombinasi `PGHOST`, `PGDATABASE`, `PGUSER`, dan `PGPASSWORD`.

Health check:

```text
GET /api/health
```

Jika database belum dikonfigurasi, API tetap hidup dan mengembalikan metadata `database.configured: false`.

## Akun Demo

Password default untuk akun demo utama adalah `password`.

| Role tampilan | Email |
| --- | --- |
| Dosen / Peneliti | `lecturer@umn.ac.id` |
| Admin LPPM | `admin@umn.ac.id` |
| Reviewer | `reviewer@umn.ac.id` |
| Kepala LPPM / Manager | `manager@umn.ac.id` |
| Mahasiswa | `student@umn.ac.id` |

Akun yang dibuat lewat UI admin memakai password demo `password123`. Untuk production, ganti mekanisme ini dengan activation token atau reset-password email.

## Role dan Hak Akses

Definisi role utama ada di `app/containers/Ris/workflow.js`.

| Role kode | Fungsi |
| --- | --- |
| `super_admin` | Kepala LPPM/manager. Punya full access dan bisa mengelola semua akun. |
| `lppm_admin` | Admin LPPM. Mengelola skema, verifikasi proposal, profil peneliti, dan proses administratif. |
| `researcher` | Dosen/peneliti. Bisa membuat pengajuan penelitian internal jika eligible, mengajukan surat, melaporkan riset, dan mengelola profil sendiri. |
| `reviewer` | Reviewer adalah dosen dengan akses tambahan untuk penilaian proposal yang ditugaskan. |
| `finance` | Disiapkan sebagai role, tetapi menu/fitur khusus finance belum menjadi fokus implementasi. |
| `guest` | Role cadangan untuk akses terbatas. |

Catatan akses penting:

- Reviewer tetap mendapat akses dasar seperti dosen, plus form penilaian.
- Mahasiswa dapat memakai fitur yang sesuai, tetapi tidak dapat mendaftar skema penelitian internal.
- Admin LPPM dapat mengelola profil peneliti umum.
- Manager dapat mengelola seluruh sistem termasuk akun admin.

## Fitur Utama

### Dashboard

Halaman awal setelah login. Menampilkan ringkasan dan tindakan cepat sesuai role aktif.

File utama:

- `app/containers/Ris/pages/DashboardPage.js`
- `app/containers/Ris/components/Layout.js`

### Pengajuan Penelitian Internal

Alur ini mencakup daftar skema, pembuatan skema oleh admin, wizard proposal, verifikasi, pemilihan reviewer, penilaian, keputusan manager, kontrak, logbook, dan pelaporan luaran.

Halaman utama:

- `SchemesPage.js`
- `SchemeCreatePage.js`
- `ProposalWizardPage.js`
- `ProposalPreviewPage.js`
- `ReviewerAssignmentPage.js`
- `ReviewScoringPage.js`
- `ContractPage.js`
- `LogbookPage.js`
- `OutputReportPage.js`

Workflow dan validasi:

- `workflow.js`
- `data.js`

Beberapa aturan penting:

- Eligibility skema dicek melalui `isEligibleForScheme`.
- Student applicant diblokir dari pendaftaran skema.
- Proposal draft/revisi bisa dilanjutkan oleh pemilik draft.
- Reviewer hanya bisa menilai proposal yang ditugaskan.
- Manager membuat keputusan setelah reviewer submit nilai.
- Data form proposal dipersist ke `localStorage` agar input tidak hilang ketika user keluar dari form.

### Pengajuan Surat

Mendukung beberapa jenis surat penelitian dan perjalanan dinas, termasuk input pemohon, lampiran, status review, dan detail surat.

File utama:

- `LetterDashboardPage.js`
- `LetterWizardPage.js`
- `LetterDetailPage.js`
- `letterWorkflow.js`

### Pelaporan Penelitian

Menu pelaporan berisi:

- Logbook Penelitian
- Pelaporan Luaran
- Penelitian Eksternal

File utama:

- `LogbookPage.js`
- `OutputReportPage.js`
- `ExternalResearchDashboardPage.js`
- `ExternalResearchWizardPage.js`
- `ExternalResearchDetailPage.js`
- `externalResearchWorkflow.js`

Pelaporan penelitian eksternal mendukung kategori seperti grant/hibah, partner collaboration, university collaboration, dan independent/mandiri. Validasi dokumen mengikuti status aktivitas.

### Manajemen Informasi Peneliti

Fitur ini mengelola profil peneliti, dokumen, kelengkapan profil, verifikasi, pembuatan akun oleh admin, dan nonaktif akun.

File utama:

- `ResearcherProfileDashboardPage.js`
- `ResearcherProfileDetailPage.js`
- `ResearcherProfileEditorPage.js`
- `researcherProfileWorkflow.js`

Catatan:

- User biasa melihat detail profil sendiri, bukan dashboard agregat admin.
- Admin/manager melihat dashboard semua profil.
- Edit profil mendukung foto profil dan dokumen.
- Notifikasi email saat ini direpresentasikan sebagai data `emailOutbox` di state frontend, belum SMTP sungguhan.

## Backend API

Base path API adalah `/api`.

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Status service dan koneksi database. |
| `GET /api/research/schemes` | Baca tabel `schemes`. |
| `GET /api/research/drafts` | Baca tabel `research_drafts`. |
| `GET /api/letters` | Baca tabel `letter_requests`. |
| `GET /api/external-research` | Baca tabel `external_research`. |
| `GET /api/researcher-profiles` | Baca tabel `researcher_profiles`. |
| `GET /api/icons` | Endpoint bawaan template untuk icon preview. |
| `GET /api/docs` | Endpoint bawaan template untuk code/docs preview. |

Model SQL saat ini berada di `server/models`. Query yang tersedia masih sederhana dan read-only.

## Database

Query yang digunakan saat membuat database untuk projek ini

```text
database.sql
```

Konfigurasi database ada di:

```text
server/config/db.js
```

Tabel yang sudah diasumsikan oleh API:

- `schemes`
- `research_drafts`
- `letter_requests`
- `external_research`
- `researcher_profiles`

Jika migration/seed SQL belum berada di repo, sebaiknya tambahkan folder khusus seperti:

```text
server/migrations/
server/seeds/
```

atau:

```text
database/migrations/
database/seeds/
```

Simpan semua perubahan schema di source control agar hosting dan developer berikutnya bisa mereplikasi database tanpa file manual di luar repo.

## State Frontend dan Persistence

State RIS disimpan di `RisContext.js`.

LocalStorage key utama:

- `ris-react-module-four-data-v2`
- `ris-react-session-v5`

Ada cleanup untuk key lama di `LEGACY_KEYS`. Walaupun nama key masih memuat riwayat internal lama, jangan tampilkan penamaan itu ke UI.

Untuk reset data saat development, gunakan menu profile kanan atas lalu klik `Reset data demo`.

## Testing dan Quality Check

Perintah yang sudah digunakan:

```bash
npm test
npm run build
```

`npm test` saat ini menjalankan ESLint pada subset file:

```text
index.js
server
app/containers/Ris/actions.js
app/containers/Ris/constants.js
app/containers/Ris/reducers.js
```

Saran: perluas cakupan lint/test ke seluruh `app/containers/Ris` ketika refactor berikutnya sudah stabil.

## Catatan Build DLL

Template memakai DLL build melalui:

```bash
npm run build:dll
```

Package `pg` sengaja dikecualikan dari DLL browser bundle di `package.json` karena `pg` adalah dependency backend dan akan mencoba resolve core module Node seperti `dns`, `net`, dan `tls` jika dibundel ke frontend.

## GitHub Handoff Checklist

Sebelum upload ke GitHub:

- Pastikan `.env` tidak ikut commit.
- Jangan commit `node_modules`, `build`, `coverage`, atau `stats.json`.
- Commit `package.json` dan `package-lock.json` bersama perubahan dependency.
- Tambahkan migration/seed SQL ke repo jika database production bergantung pada file tersebut.
- Jalankan `npm test` dan `npm run build`.
- Pastikan README ini ikut commit.

## Saran Perbaikan Berikutnya

1. Pindahkan mutasi data dari `localStorage` ke backend API.

   Saat ini banyak aksi create/update/delete berjalan di state frontend. Untuk production, buat endpoint POST/PUT/PATCH/DELETE dan transaksi database untuk proposal, surat, profil, laporan, reviewer assignment, keputusan, dan kontrak.

2. Tambahkan autentikasi production.

   Login demo masih memakai akun dan password di data frontend. Gunakan backend auth, password hash, session/JWT, refresh token, dan role dari database.

3. Implementasikan email service sungguhan.

   `emailOutbox` saat ini hanya simulasi. Integrasikan SMTP, SendGrid, Mailgun, atau service kampus. Tambahkan retry, audit log, dan template email.

4. Rapikan schema migration dan seed.

   Simpan migration dan seed SQL di repo. Tambahkan script seperti `npm run db:migrate` dan `npm run db:seed`.

5. Tambahkan automated tests.

   Minimal:

   - Unit test untuk workflow role dan status.
   - Integration test untuk API.
   - E2E test Playwright untuk login, daftar proposal, review, approve, dan pelaporan.

6. Perluas lint coverage.

   Saat ini `npm test` belum melint seluruh folder RIS. Setelah kode stabil, arahkan lint ke seluruh `app/containers/Ris`.

7. Pisahkan domain state.

   `RisContext` sudah cukup untuk prototype, tetapi production akan lebih aman jika state dibagi per domain atau memakai data fetching layer seperti React Query/SWR.

8. Validasi file upload backend.

   UI sudah memiliki validasi ekstensi/ukuran di beberapa tempat. Production tetap wajib validasi ulang di backend, termasuk antivirus scan jika diperlukan.

9. Audit akses per role.

   Semua akses penting sudah dipusatkan di workflow files. Tetap lakukan audit berkala untuk memastikan sidebar, route guard, dan backend authorization selalu konsisten.

10. Normalisasi UI dan design system.

    Banyak komponen sudah berada di `components/Ui.js`, tetapi beberapa halaman masih punya pola markup masing-masing. Refactor bertahap ke komponen form, table, badge, modal, stepper, dan file upload yang reusable.

11. Tambahkan observability.

    Untuk production, tambahkan structured logging, request id, audit trail, dan error tracking.

12. Bersihkan dependency template yang tidak dipakai.

    Project masih membawa banyak dependency dari template awal. Setelah fitur stabil, lakukan audit dependency untuk mengurangi bundle size dan surface area keamanan.

## File yang Paling Sering Disentuh

```text
app/containers/Ris/workflow.js
app/containers/Ris/RisContext.js
app/containers/Ris/data.js
app/containers/Ris/ris.css
app/containers/Ris/components/Layout.js
app/containers/Ris/pages/ProposalWizardPage.js
app/containers/Ris/pages/ResearcherProfileDashboardPage.js
app/containers/Ris/pages/ResearcherProfileEditorPage.js
server/routes/index.js
server/config/db.js
```

Kalau developer baru hanya punya waktu singkat untuk memahami project, mulai dari `Layout.js`, `workflow.js`, `RisContext.js`, dan halaman yang sedang ingin diubah.
