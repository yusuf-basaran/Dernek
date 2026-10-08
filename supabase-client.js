import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Supabase Proje Bağlantı Bilgileri
export const SUPABASE_URL = 'https://ejtcditnmrinxcookwnu.supabase.co';

// DİKKAT: Tarayıcı tarafında RLS politikalarının çalışması için yalnızca 'anon' (public) anahtarı kullanılmalıdır.
// Supabase panelinde: Settings -> API -> Project API keys altındaki 'anon' / 'public' anahtarını buraya yapıştırın.
export const SUPABASE_ANON_KEY = 'BURAYA_PANELDEKI_ANON_PUBLIC_KEYI_YAPISTIRIN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Aktif oturumu ve 'profiles' tablosundaki kullanıcı kaydını getirir.
 */
export async function getCurrentUserProfile() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    console.error('Profil yükleme hatası:', profileError.message);
    return null;
  }

  return { user: session.user, profile };
}

/**
 * Sayfa koruma yardımcısı: İzin verilen roller dışındakileri ve oturum açmamışları yönlendirir.
 */
export async function requireAuth(allowedRoles = []) {
  const authData = await getCurrentUserProfile();
  if (!authData) {
    window.location.href = 'login.html';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(authData.profile.role)) {
    alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
    window.location.href = authData.profile.role === 'member' ? 'uye-paneli.html' : 'index.html';
    return null;
  }

  return authData;
}

/**
 * KKTC Telefon Formatı Doğrulayıcı
 * Formatlar: +90 392, 0392, +90 533/542/548 veya 0533/0542/0548
 */
export function validateKKTCPhone(phone) {
  const cleaned = phone.replace(/[\s\(\)\-]/g, '');
  const kktcLandline = /^(\+90392|0392)[0-9]{7}$/;
  const kktcMobile = /^(\+90533|\+90542|\+90548|0533|0542|0548)[0-9]{7}$/;
  return kktcLandline.test(cleaned) || kktcMobile.test(cleaned);
}
