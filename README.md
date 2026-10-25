# SakuCart - Smart Grocery & Budget Safety Tracker (PWA)

> **Aplikasi Web Progresif (PWA) Mobile-First untuk Mahasiswa Kos: Anti-Boncos di Kasir Supermarket, Kalkulator Diskon Bertingkat, dan Deteksi Fluktuasi Harga Real-Time.**

---

## 🎯 Latar Belakang & Masalah Rian (Studi Kasus Anak Kos)

Rian adalah mahasiswa perantauan yang hidup mandiri di kamar kos 3x3 meter dengan uang saku bulanan terbatas dari orang tuanya. Setiap tanggal 1, Rian belanja kebutuhan primer (beras, minyak goreng, sabun cuci, pasta gigi, mie instan) di supermarket grosir.

Masalah yang selalu dihadapi Rian:
1. **Panik di Depan Kasir**: Total belanjaan melonjak melebihi isi dompet saat antrean mengular di belakangnya, sehingga terpaksa membatalkan barang belanjaan di kasir.
2. **Jebakan Label Promo Rak**: Promo bertingkat *"Diskon 50% + Ekstra 20%"* sering dikira diskon 70%, padahal diskon kedua memotong dari sisa harga setelah diskon pertama. Begitu pula dilema ukuran kemasan (3 x 1L seharga Rp 18.000 vs 5L jeriken Rp 85.000).
3. **Struk Belanja Cepat Pudar**: Kertas struk termal cepat hilang dan tintanya memudar, membuat Rian tidak tahu pasti apakah harga telur dan beras bulan ini sedang naik tajam atau justru murah.
4. **Ergonomi Belanja**: Rian mendorong troli dengan satu tangan dan memegang ponsel dengan tangan lainnya. Aplikasi harus dirancang mobile-first (maksimal 430px) dengan tombol sentuh yang besar dan navigasi ibu jari.

---

## 📋 Matriks Fitur & Spesifikasi Kebutuhan Sistem (SRS)

| Kode | Nama Fitur | Spesifikasi & Perilaku Sistem | Status Validasi |
| :--- | :--- | :--- | :--- |
| **F-01** | **Pencatatan Lengkap Belanjaan** | Menyimpan nama produk, kategori, satuan (*kg, liter, pcs, pack, dus, botol*), jumlah barang (Qty), dan harga satuan normal. | **Must Have** (Terpenuhi) |
| **F-02** | **Kalkulasi Otomatis Qty** | Perubahan angka Qty melalui tombol stepper (+/-) langsung mengalikan harga satuan secara real-time ke subtotal item tanpa menekan tombol hitung manual. | **Must Have** (Terpenuhi) |
| **F-03** | **Kalkulator Diskon Bertingkat** | Mendukung input diskon tunggal (*contoh: 25%*), diskon bertingkat (*contoh: 50+20 atau 30+10*), serta potongan nominal tunai (*contoh: 15000*). Menampilkan persentase bersih efektif (*contoh: 50%+20% = 60% nett, bukan 70%*). | **Must Have** (Terpenuhi) |
| **F-04** | **Deteksi Fluktuasi Harga vs Bulan Lalu** | Menampilkan indikator visual seketika saat harga dimasukkan:<br>• **Panah Merah ke Atas (↑)**: Jika harga naik dibanding bulan lalu (Inflasi)<br>• **Panah Hijau ke Bawah (↓)**: Jika harga turun (Hemat/Murah)<br>• **Tanda Sama Dengan (=)**: Jika harga stabil/tetap. | **Must Have** (Terpenuhi) |
| **F-05** | **Pengendali Anggaran (Budget Safety Cap)** | Memantau batas dompet kas Rian dengan kartu indikator dinamis:<br>• **Hijau (Aman)**: Belanjaan < 75% limit<br>• **Kuning (Waspada)**: Belanjaan 75% - 95% limit<br>• **Merah Berkedip (Bahaya Boncos)**: Belanjaan melebihi uang kas dompet disertai pesan peringatan dan getaran (haptik). | **Must Have** (Terpenuhi) |
| **F-06** | **Riwayat & Basis Data Belanjaan** | Fitur *"Selesai & Simpan Belanjaan"* menyimpan sesi belanja ke arsip dan otomatis memperbarui harga acuan untuk bulan berikutnya di penyimpanan lokal (`localStorage`). | **Must Have** (Terpenuhi) |
| **Bonus** | **Duel Promo (Unit Price Comparator)** | Fitur pembanding harga per satuan untuk memecahkan dilema Rian (misal: 3x1L @ Rp 18.000 vs 5L @ Rp 85.000) dengan mahkota pemenang dan jumlah rupiah yang dihemat. | **Nilai Tambah** (Terpenuhi) |

---

## 📱 Arsitektur Mobile & Standar Tampilan PWA

1. **Format Layar**: Dirancang khusus untuk tampilan smartphone (*Mobile UI*) dengan batas lebar maksimal 430px (berada di tengah layar saat dibuka lewat desktop).
2. **Bottom Navigation Bar**: Menu navigasi mengapung di bagian bawah layar (*Belanja, Promo & Satuan, Riwayat, Anggaran*) yang mudah dijangkau ibu jari saat mendorong troli.
3. **Ergonomi Sentuh**: Stepper kuantitas berukuran besar, chip saran barang otomatis, dan tanpa tabel desktop yang melorot ke samping.
4. **PWA Standalone & Dukungan Offline**: Dilengkapi `manifest.json`, ikon SVG maskable, dan `sw.js` (Service Worker) sehingga tetap berfungsi di basement supermarket yang minim sinyal.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dibangun menggunakan **Vanilla HTML5, CSS3, dan JavaScript (ES6+)** tanpa ketergantungan library eksternal yang rumit:

1. Buka terminal pada folder proyek.
2. Jalankan server lokal:
   ```bash
   python -m http.server 3000
   ```
3. Buka browser dan akses:
   ```
   http://localhost:3000
   ```
4. Di ponsel (Android Chrome / iOS Safari):
   - Tekan menu browser lalu pilih **"Add to Home screen"** / **"Tambahkan ke Layar Utama"** untuk menginstal aplikasi sebagai aplikasi mandiri (PWA).