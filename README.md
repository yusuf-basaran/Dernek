https://yusuf-basaran.github.io/Dernek/index.html

🏛️ KKTC Yardımlaşma ve Dayanışma Derneği Resmî Web Portalı & Yönetim Konsolu
Kuzey Kıbrıs Türk Cumhuriyeti (KKTC) Fasıl 112 Dernekler ve Birlikler Yasası mevzuatına tam uyumlu; şeffaf sivil toplum yönetimi, çevrim içi bağış, üyelik kayıt akışları ve kapsamlı bir yönetim konsolu sunan modern, mobil uyumlu ve sunucusuz (serverless) web platformudur.
---
📌 Özellikler ve Modüller
1. Kullanıcı Arayüzü (Frontend)
Modern & Akıcı Tasarım: Apple/Stripe tarzı yüzen (floating glassmorphism) navigasyon çubuğu, duyarlı hamburger menü, mikro etkileşimler ve dalgalanma (ripple) animasyonları.
Sonsuz Kayan Sponsor Bandı (Marquee): Destekçi ve paydaş logolarını kesintisiz, akıcı bir döngüde gösteren ve fare üzerine gelindiğinde duraklayan banner.
Dinamik Medya Galerisi: Otomatik kayan, dokunmatik ve ok butonlarıyla yönlendirilebilen görsel kaydırıcı (slider).
Etki Sayaçları (CountUp): Sayfa kaydırıldıkça tetiklenen dinamik sayı animasyonları.
Yönetim Organları Sayfası (`yonetim.html`): Dernekler Yasası gereğince yalnızca yetkili kurulları (Yönetim Kurulu Asil/Yedek, Denetim Kurulu Asil/Yedek) hiyerarşik sıralamayla listeleyen özel sayfa.
Hukuki Güvenlik & KVKK: 89/2007 sayılı Kişisel Verilerin Korunması Yasası'na uygun aydınlatma metinleri, çerez onay çubuğu (Cookie Banner) ve dijital onay loglama mekanizması.
Tek Tıkla IBAN Kopyalama: Sayfanın alt ortasında modern yeşil onay rozetiyle beliren özel toast bildirimi.
2. Yönetim Konsolu (`admin.html`)
Yatay Sekmeli Navigasyon: Ekran alanını verimli kullanan, taşma durumunda akıcı kaydırma butonları (`<` ve `>`) sunan üst sekme yapısı.
Kurumsal Ayarlar: KKTC kütük/tescil no, adres, iletişim kanalları, IBAN hesapları ve sayaçların anlık güncellenmesi.
Yönetim Kurulu Yönetimi: Hiyerarşik sıra (`sort_order`), unvan ve fotoğraf yükleme desteğiyle kurul üyelerini ekleme/silme.
Destekçi / Sponsor Yönetimi: Kayan banta anlık logo ve kurum adı ekleme/silme.
Haber & Faaliyet Raporları: Kapak görselleriyle haber girişi; yıllık mali/denetim raporları için PDF yükleme ve yönetimi.
Üye Yönetimi: Başvuruları filtreleme, arama, onaylama/reddetme, rol atama (`member`, `editor`, `admin`, `super_admin`) ve tek tıkla CSV formatında dışa aktarma.
Finansal Hareketler: Sanal POS tahsilatları ve elden/bankadan yapılan manuel aidat/bağış kayıtlarının takibi.
---
🛠️ Teknoloji Yığını
Arayüz (Frontend): HTML5, CSS3 (Modern Flexbox & CSS Grid, Glassmorphism, CSS Variables), Vanilla ES Modules (JavaScript)
İkonografi: FontAwesome 6
Veritabanı & Kimlik Doğrulama: Supabase (PostgreSQL, Row Level Security - RLS, Auth, Storage)
Barındırma: GitHub Pages
---
📂 Dosya Yapısı
```plaintext
Dernek/
├── index.html              # Ana vitrin sayfası (Kurumsal, Raporlar, Haberler, Galeri, Sponsorlar)
├── yonetim.html            # Hiyerarşik yönetim ve denetim kurulu organları sayfası
├── admin.html              # Yönetim konsolu (Yatay sekmeli admin dashboard)
├── bagis.html              # Online bağış sayfası
├── uyelik.html             # Üyelik başvuru ve kayıt formu
├── login.html              # Üye ve yönetici kimlik doğrulama ekranı
├── css/
│   └── style.css           # Merkezi tasarım, animasyon ve responsive stil dosyası
├── js/
│   ├── supabase-client.js  # Supabase istemcisi, oturum kontrolleri ve yardımcı doğrulamalar
│   ├── admin.js            # Admin paneli sekme mantığı, CRUD işlemleri ve dosya yüklemeleri
│   └── legal.js            # Çerez bildirimleri, hukuki modallar ve onay loglama
└── README.md               # Proje teknik dokümantasyonu
```
---
🗄️ Veritabanı ve Supabase Kurulumu
Projeyi sıfırdan kurarken Supabase SQL Editor üzerinden aşağıdaki tabloları ve Storage bucket ayarlarını yapılandırın:
1. Storage Bucket'ları
Supabase paneli üzerinden Storage sekmesine gidip şu iki bucket'ı oluşturun ve Public olarak ayarlayın:
`media` (Haber kapak görselleri, galeri ve sponsor logoları)
`documents` (Tüzük ve faaliyet raporu PDF dosyaları)
2. Veritabanı Şeması ve RLS Kuralları
```sql
-- 1. Kurul Üyeleri Tablosu (Hiyerarşik Yönetim)
CREATE TABLE IF NOT EXISTS public.board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    board_type TEXT NOT NULL CHECK (board_type IN ('yonetim_asil', 'yonetim_yedek', 'denetim_asil', 'denetim_yedek')),
    photo_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes gorebilir" ON public.board_members FOR SELECT USING (true);
CREATE POLICY "Admin yonetimi" ON public.board_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Storage ve Tablo Yetkileri (Dosya Yükleme İzinleri)
CREATE POLICY "Giris yapan adminler dosya yukleyebilir" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('media', 'documents'));

CREATE POLICY "Giris yapan adminler dosya silebilir" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id IN ('media', 'documents'));

-- 3. Güvenli Yeni Kullanıcı Tetikleyicisi (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role := 'member';
    v_status public.membership_status := 'pending';
    v_city text := 'Lefkoşa';
BEGIN
    BEGIN
        IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
            v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN v_role := 'member'; END;

    BEGIN
        IF NEW.raw_user_meta_data->>'membership_status' IS NOT NULL THEN
            v_status := (NEW.raw_user_meta_data->>'membership_status')::public.membership_status;
        END IF;
    EXCEPTION WHEN OTHERS THEN v_status := 'pending'; END;

    IF NEW.raw_user_meta_data->>'city' IN ('Lefkoşa', 'Gazimağusa', 'Girne', 'Güzelyurt', 'İskele', 'Lefke') THEN
        v_city := NEW.raw_user_meta_data->>'city';
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, role, kktc_id_or_passport, phone, city, occupation, membership_status, kvkk_consent_accepted
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Kullanici'), '@', 1)),
        v_role,
        COALESCE(NEW.raw_user_meta_data->>'kktc_id_or_passport', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        v_city,
        COALESCE(NEW.raw_user_meta_data->>'occupation', ''),
        v_status,
        COALESCE((NEW.raw_user_meta_data->>'kvkk_consent_accepted')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
---
🚀 Kurulum ve Yayınlama
Depoyu Klonlayın:
```bash
   git clone https://github.com/yusuf-basaran/Dernek.git
   cd Dernek
   ```
Supabase Yapılandırması:
`js/supabase-client.js` dosyasını açıp projenize ait URL ve Anon Key bilgilerini doğrulayın:
```javascript
   export const SUPABASE_URL = "https://<PROJE-REF>.supabase.co";
   export const SUPABASE_ANON_KEY = "<ANON-KEY>";
   ```
Admin Yetkisi Verme:
Supabase Authentication sekmesinden oluşturduğunuz kullanıcının `profiles` tablosundaki `role` değerini `super_admin`, `membership_status` değerini ise `active` olarak güncelleyin.
Yayınlama:
GitHub deponuzda Settings > Pages sekmesine giderek kaynak dalı `main` olarak seçip GitHub Pages üzerinden anında canlıya alın.
---
📜 Lisans & Yasal Uyarı
Bu proje, Kuzey Kıbrıs Türk Cumhuriyeti mevzuatına uygun sivil toplum faaliyetlerini dijitalleştirmek amacıyla geliştirilmiştir. Tüm hakları saklıdır.
