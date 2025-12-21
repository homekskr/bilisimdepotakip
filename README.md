# Bilişim Malzemeleri Depo Takip Sistemi

Modern, mobil uyumlu web uygulaması olarak geliştirilmiş bilişim malzemeleri depo takip sistemi.

## 🚀 Özellikler

- ✅ **Kullanıcı Yönetimi**: 4 farklı rol (Başkan, Bilgi İşlem Yöneticisi, Depo Görevlisi, Personel)
- ✅ **Malzeme Yönetimi**: Ekle, düzenle, sil, ara
- ✅ **Zimmet Sistemi**: Malzeme çıkış ve iade takibi
- ✅ **Talep ve Onay**: İki aşamalı onay sistemi (Yönetici → Başkan)
- ✅ **Barkod Okuyucu**: Kamera ile barkod okuma
- ✅ **Raporlama**: Detaylı raporlar ve PDF export
- ✅ **Gerçek Zamanlı**: Supabase ile anlık veri senkronizasyonu
- ✅ **Mobil Uyumlu**: Responsive tasarım

## 🛠️ Teknolojiler

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Hosting**: Vercel
- **Barkod**: QuaggaJS
- **PDF**: Browser Print API

## 📦 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Supabase Projesi Oluştur

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. SQL Editor'de `supabase-setup.sql` dosyasını çalıştırın

### 3. Environment Variables

`.env.example` dosyasını `.env` olarak kopyalayın ve Supabase bilgilerinizi girin:

```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

## 🌐 Deployment (Vercel)

### 1. GitHub'a Push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Vercel'e Deploy

1. [Vercel](https://vercel.com) hesabı oluşturun
2. "New Project" → GitHub repo'nuzu seçin
3. Environment Variables ekleyin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## 👥 Kullanıcı Rolleri

### Başkan
- Tüm talepleri görüntüleme
- Yönetici onaylı talepleri onaylama/reddetme
- Tüm raporlara erişim

### Bilgi İşlem Yöneticisi
- Malzeme ekleme/düzenleme
- Talepleri görüntüleme ve onaylama/reddetme
- Raporlara erişim

### Depo Görevlisi
- Malzeme ekleme/düzenleme
- Zimmet çıkışı yapma
- Zimmet iadesi alma
- Onaylanan talepleri zimmetleme

### Personel
- Malzemeleri görüntüleme
- Talep oluşturma
- Kendi taleplerini görüntüleme

## 📱 Barkod Okuyucu

Barkod okuyucu özelliği için:
- **Masaüstü**: Webcam gereklidir
- **Mobil**: Kamera izni gereklidir
- **HTTPS**: Güvenlik nedeniyle HTTPS gereklidir (localhost'ta sorun olmaz)

## 📊 Veritabanı Şeması

- **profiles**: Kullanıcı profilleri ve rolleri
- **materials**: Malzeme envanteri
- **assignments**: Zimmet kayıtları
- **requests**: Talep ve onay süreçleri

Detaylı şema için `supabase-setup.sql` dosyasına bakın.

## 🔒 Güvenlik

- Row Level Security (RLS) politikaları aktif
- Rol bazlı erişim kontrolü
- Supabase Auth ile güvenli kimlik doğrulama

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 Destek

Sorularınız için issue açabilirsiniz.

---

**Geliştirici**: Antigravity AI
**Tarih**: 2024
