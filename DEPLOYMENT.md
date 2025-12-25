# GitHub ve Vercel Deployment Rehberi

Mevcut projenizi güncelledik ve deployment için hazır hale getirdik.

## 1. GitHub'a Gönderme

Repository adresiniz güncellendi: `https://github.com/homekskr/bilisimdepotakip.git`

Kodlarınızı bu yeni repository'e göndermek için terminalde şu komutu çalıştırın:

```powershell
git push -u origin main
```

*Eğer daha önce başka bir kod varsa ve hata alırsanız, üzerine yazmak için `-f` ekleyebilirsiniz:*
```powershell
git push -f origin main
```

## 2. Vercel'de Canlıya Alma

1.  [Vercel.com](https://vercel.com) adresine gidin.
2.  "Add New..." > "Project" seçin.
3.  GitHub hesabınızdaki `bilisimdepotakip` (homekskr) deposunu seçip "Import" deyin.
4.  **Environment Variables** kısmını genişletin ve `.env` dosyasındaki değerleri ekleyin:
    *   **VITE_SUPABASE_URL**: `https://oiippmzjeaixszgwebzs.supabase.co`
    *   **VITE_SUPABASE_ANON_KEY**: `(Bu anahtarı proje klasöründeki .env dosyasından kopyalayın)`
5.  "Deploy" butonuna basın.

Tebrikler! Uygulamanız yayında.
