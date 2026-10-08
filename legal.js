import { supabase } from './supabase-client.js';

export const LEGAL_TEXTS = {
  kvkk: `
    <h4>89/2007 Sayılı Kişisel Verilerin Korunması Yasası Kapsamında Aydınlatma Metni</h4>
    <p>Veri Sorumlusu sıfatıyla KKTC Yardımlaşma ve Dayanışma Derneği ("Dernek"), Fasıl 112 Dernekler Yasası tahtında tutulan resmî kütükler, üyelik kayıtları, bağış tahsilatları ve yasal muhasebe süreçleri gereğince kişisel verilerinizi işlemektedir.</p>
    <h4>İşlenen Kişisel Veriler</h4>
    <p>Kimlik Bilgileri (Ad, Soyad, KKTC Kimlik / Pasaport No), İletişim Bilgileri (Telefon, E-posta, İkamet İlçesi), Mesleki ve Finansal Bilgiler (Ödeme referansları, Nestpay işlem kodları).</p>
    <h4>Verilerin Aktarımı</h4>
    <p>Toplanan kişisel veriler; KKTC İçişleri Bakanlığı, Kaymakamlıklar, Gelir ve Vergi Dairesi ile yasal denetim kurumları haricinde kesinlikle üçüncü kişi ya da kuruluşlara ticari amaçla aktarılmaz.</p>
    <h4>Yasal Haklarınız</h4>
    <p>Derneğimize başvurarak verilerinizin işlenip işlenmediğini öğrenme, yanlış verilerin düzeltilmesini talep etme ve üyeliğin sona ermesi halinde yasal saklama süreleri sonrasında silinmesini isteme hakkına sahipsiniz.</p>
  `,
  charter: `
    <h4>KKTC Resmî Dernek Tüzüğü Yükümlülükleri</h4>
    <p>Dernek üyeleri, Fasıl 112 Dernekler ve Birlikler Yasası ve dernek tüzüğü hükümlerine riayet etmekle, belirlenen yıllık/dönemsel aidatları süresinde ifa etmekle ve derneğin saygınlığına zarar verecek fiillerden kaçınmakla yükümlüdür.</p>
  `,
  cookies: `
    <h4>Çerez (Cookie) Aydınlatma Metni</h4>
    <p>Web sitemiz, oturum güvenliğinizi sağlamak (Supabase Auth oturum tokenları) ve site deneyimini optimize etmek amacıyla zorunlu teknik çerezler kullanmaktadır. Bu çerezler sitenin çalışması için zorunlu olup üçüncü taraf ticari takip veya profil çıkarma verisi içermez.</p>
  `
};

export function initCookieBanner() {
  const isConsentGiven = localStorage.getItem('kktc_cookie_consent');
  if (isConsentGiven) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-content">
      <div class="cookie-text">
        <i class="fa-solid fa-cookie-bite"></i> Sitemizde yasal mevzuata uygun olarak oturum güvenliğini sağlamak amacıyla zorunlu çerezler kullanılmaktadır. Detaylar için <a id="cookie-read-link">Çerez Politikamızı</a> inceleyebilirsiniz.
      </div>
      <div class="cookie-actions">
        <button class="btn btn-outline btn-sm" id="cookie-reject-btn" style="color:#fff; border-color:#fff;">Yalnızca Zorunlu</button>
        <button class="btn btn-secondary btn-sm" id="cookie-accept-btn">Kabul Ediyorum</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
  banner.style.display = 'block';

  document.getElementById('cookie-read-link').addEventListener('click', () => {
    openLegalModal('Çerez Politikası', LEGAL_TEXTS.cookies);
  });

  const saveConsent = async (type) => {
    localStorage.setItem('kktc_cookie_consent', type);
    banner.style.display = 'none';
    await supabase.from('consent_logs').insert([{
      identifier: 'visitor-anonymous',
      consent_type: 'cookie',
      is_accepted: type === 'all',
      user_agent: navigator.userAgent
    }]);
  };

  document.getElementById('cookie-accept-btn').addEventListener('click', () => saveConsent('all'));
  document.getElementById('cookie-reject-btn').addEventListener('click', () => saveConsent('essential_only'));
}

export function openLegalModal(title, htmlContent) {
  let modal = document.getElementById('global-legal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'global-legal-modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <h3 id="legal-modal-title" style="color:var(--primary);"></h3>
        <div class="legal-modal-body" id="legal-modal-text"></div>
        <button class="btn btn-primary btn-block" id="close-legal-modal-btn">Okudum, Anladım</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-legal-modal-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  document.getElementById('legal-modal-title').innerText = title;
  document.getElementById('legal-modal-text').innerHTML = htmlContent;
  modal.style.display = 'flex';
}
