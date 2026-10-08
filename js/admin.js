import { supabase, requireAuth } from './supabase-client.js';

let cachedMembers = [];

function showAdminToast(message, isError = false) {
  const toast = document.getElementById('admin-toast');
  const text = document.getElementById('admin-toast-text');
  const icon = document.getElementById('admin-toast-icon');

  if (!toast) return;

  text.innerText = message;
  if (isError) {
    icon.className = 'fa-solid fa-circle-exclamation';
    icon.style.color = '#ef4444';
  } else {
    icon.className = 'fa-solid fa-circle-check';
    icon.style.color = '#34d399';
  }

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function generateSlug(text) {
  const trMap = { 'ç':'c', 'ğ':'g', 'ı':'i', 'i':'i', 'ö':'o', 'ş':'s', 'ü':'u', 'Ç':'c', 'Ğ':'g', 'İ':'i', 'Ö':'o', 'Ş':'s', 'Ü':'u' };
  return text
    .split('')
    .map(c => trMap[c] || c)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function initAdminDashboard() {
  const auth = await requireAuth(['admin', 'super_admin']);
  if (!auth) return;

  document.getElementById('admin-user-title').innerText = `${auth.profile.full_name} (${auth.profile.role})`;

  // Üst Yatay Sekme Değişimi
  document.querySelectorAll('.admin-top-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-top-nav button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).style.display = 'block';
    });
  });

  // Çıkış Butonu
  document.getElementById('admin-logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  // Verileri Yükle
  await loadCorporateSettings();
  await loadAdminNews();
  await loadAdminReports();
  await loadGalleryMedia();
  await loadMembers();
  await loadPayments();
}

// 1. KURUMSAL AYARLAR
async function loadCorporateSettings() {
  const { data: s } = await supabase.from('settings_corporate').select('*').eq('id', 1).single();
  if (s) {
    document.getElementById('set-assoc-name').value = s.association_name;
    document.getElementById('set-reg-no').value = s.registry_no;
    document.getElementById('set-mission').value = s.mission;
    document.getElementById('set-vision').value = s.vision;
    document.getElementById('set-address').value = s.address;
    document.getElementById('set-phone').value = s.phone;
    document.getElementById('set-wa').value = s.whatsapp;
    document.getElementById('set-ibans').value = JSON.stringify(s.ibans, null, 2);
    document.getElementById('set-counters').value = JSON.stringify(s.impact_counters, null, 2);

    if (s.charter_pdf_url) {
      document.getElementById('current-charter-status').innerHTML = `Mevcut Tüzük: <a href="${s.charter_pdf_url}" target="_blank" style="color:var(--primary); font-weight:600;">PDF Dosyasını Gör</a>`;
    }
  }
}

document.getElementById('corporate-settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      association_name: document.getElementById('set-assoc-name').value,
      registry_no: document.getElementById('set-reg-no').value,
      mission: document.getElementById('set-mission').value,
      vision: document.getElementById('set-vision').value,
      address: document.getElementById('set-address').value,
      phone: document.getElementById('set-phone').value,
      whatsapp: document.getElementById('set-wa').value,
      ibans: JSON.parse(document.getElementById('set-ibans').value),
      impact_counters: JSON.parse(document.getElementById('set-counters').value),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('settings_corporate').update(payload).eq('id', 1);
    if (error) showAdminToast('Hata: ' + error.message, true);
    else showAdminToast('Kurumsal ayarlar başarıyla kaydedildi!');
  } catch (err) {
    showAdminToast('JSON formatı geçersiz!', true);
  }
});

// 2. HABERLER & DUYURULAR
async function loadAdminNews() {
  const { data: news, error } = await supabase.from('news_announcements').select('*').order('published_at', { ascending: false });
  const tbody = document.getElementById('admin-news-tbody');
  tbody.innerHTML = '';

  if (error || !news || news.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Henüz eklenmiş haber bulunmamaktadır.</td></tr>';
    return;
  }

  news.forEach(n => {
    tbody.innerHTML += `
      <tr>
        <td>${new Date(n.published_at).toLocaleDateString('tr-TR')}</td>
        <td><span class="badge ${n.category === 'Haber' ? 'badge-success' : 'badge-warning'}">${n.category}</span></td>
        <td><strong>${n.title}</strong></td>
        <td><small style="color:var(--text-muted);">${n.summary.substring(0, 50)}...</small></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="deleteNewsItem('${n.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

document.getElementById('news-add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-news-btn');
  btn.disabled = true;
  btn.innerText = 'Yayınlanıyor...';

  const title = document.getElementById('news-title').value;
  const category = document.getElementById('news-category').value;
  const summary = document.getElementById('news-summary').value;
  const content = document.getElementById('news-content').value;
  const imageFile = document.getElementById('news-image-file').files[0];

  let cover_image_url = 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600';

  if (imageFile) {
    const fileName = `news_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, imageFile);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      cover_image_url = publicUrl;
    } else {
      console.warn('Görsel storage yüklenemedi:', uploadError.message);
    }
  }

  const slug = `${generateSlug(title)}-${Date.now()}`;

  const payload = {
    title,
    slug,
    category,
    summary,
    content,
    cover_image_url,
    is_published: true,
    published_at: new Date().toISOString()
  };

  const { error } = await supabase.from('news_announcements').insert([payload]);

  btn.disabled = false;
  btn.innerText = 'Haberi Yayınla';

  if (error) {
    showAdminToast('Haber eklenirken hata: ' + error.message, true);
  } else {
    showAdminToast('Haber başarıyla yayınlandı!');
    e.target.reset();
    loadAdminNews();
  }
});

window.deleteNewsItem = async (id) => {
  if (confirm('Bu haberi silmek istediğinize emin misiniz?')) {
    const { error } = await supabase.from('news_announcements').delete().eq('id', id);
    if (error) showAdminToast('Silme hatası: ' + error.message, true);
    else {
      showAdminToast('Haber silindi.');
      loadAdminNews();
    }
  }
};

// 3. FAALİYET RAPORLARI
async function loadAdminReports() {
  const { data: reports, error } = await supabase.from('annual_reports').select('*').order('year', { ascending: false });
  const tbody = document.getElementById('admin-reports-tbody');
  tbody.innerHTML = '';

  if (error || !reports || reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Henüz faaliyet raporu yüklenmemiştir.</td></tr>';
    return;
  }

  reports.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${r.year}</strong></td>
        <td>${r.title}</td>
        <td><a href="${r.file_url}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-pdf"></i> İncele</a></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="deleteReportItem('${r.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

document.getElementById('report-add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-report-btn');
  btn.disabled = true;
  btn.innerText = 'Yükleniyor...';

  const year = parseInt(document.getElementById('report-year').value, 10);
  const title = document.getElementById('report-title').value;
  const file = document.getElementById('report-file').files[0];

  if (!file) {
    showAdminToast('Lütfen bir PDF rapor dosyası seçiniz.', true);
    btn.disabled = false;
    btn.innerText = 'Raporu Yükle ve Yayınla';
    return;
  }

  const fileName = `report_${year}_${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);

  if (uploadError) {
    showAdminToast('PDF yükleme hatası: ' + uploadError.message, true);
    btn.disabled = false;
    btn.innerText = 'Raporu Yükle ve Yayınla';
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

  const payload = {
    year,
    title,
    file_url: publicUrl
  };

  const { error } = await supabase.from('annual_reports').insert([payload]);

  btn.disabled = false;
  btn.innerText = 'Raporu Yükle ve Yayınla';

  if (error) {
    showAdminToast('Rapor kaydedilemedi: ' + error.message, true);
  } else {
    showAdminToast('Faaliyet raporu başarıyla yüklendi!');
    e.target.reset();
    loadAdminReports();
  }
});

window.deleteReportItem = async (id) => {
  if (confirm('Bu raporu silmek istediğinize emin misiniz?')) {
    const { error } = await supabase.from('annual_reports').delete().eq('id', id);
    if (error) showAdminToast('Silme hatası: ' + error.message, true);
    else {
      showAdminToast('Rapor silindi.');
      loadAdminReports();
    }
  }
};

// 4. STORAGE & RESMİ TÜZÜK & GALERİ
document.getElementById('upload-charter-btn').addEventListener('click', async () => {
  const file = document.getElementById('charter-file-input').files[0];
  if (!file) return showAdminToast('Lütfen bir PDF dosyası seçiniz.', true);

  const fileName = `charter_${Date.now()}.pdf`;
  const { error } = await supabase.storage.from('documents').upload(fileName, file);

  if (error) {
    showAdminToast('Yükleme hatası: ' + error.message, true);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
  await supabase.from('settings_corporate').update({ charter_pdf_url: publicUrl }).eq('id', 1);
  showAdminToast('Resmî tüzük başarıyla yüklendi!');
  loadCorporateSettings();
});

document.getElementById('upload-gallery-btn').addEventListener('click', async () => {
  const title = document.getElementById('gallery-img-title').value;
  const file = document.getElementById('gallery-file-input').files[0];
  if (!file || !title) return showAdminToast('Lütfen başlık ve görsel dosyası seçiniz.', true);

  const fileName = `gal_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file);

  if (error) {
    showAdminToast('Medya yüklenemedi: ' + error.message, true);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
  await supabase.from('media_gallery').insert([{ title, image_url: publicUrl }]);
  showAdminToast('Görsel galeriye eklendi!');
  document.getElementById('gallery-img-title').value = '';
  document.getElementById('gallery-file-input').value = '';
  loadGalleryMedia();
});

async function loadGalleryMedia() {
  const { data: media } = await supabase.from('media_gallery').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('admin-gallery-preview');
  container.innerHTML = '';
  (media || []).forEach(m => {
    container.innerHTML += `
      <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; position:relative;">
        <img src="${m.image_url}" style="width:100%; height:120px; object-fit:cover;">
        <div style="padding:8px; display:flex; justify-content:space-between; align-items:center;">
          <small style="font-weight:600;">${m.title}</small>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="deleteGalleryItem('${m.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
}

window.deleteGalleryItem = async (id) => {
  if (confirm('Bu görseli silmek istediğinize emin misiniz?')) {
    await supabase.from('media_gallery').delete().eq('id', id);
    showAdminToast('Görsel silindi.');
    loadGalleryMedia();
  }
};

// 5. ÜYE YÖNETİMİ
async function loadMembers() {
  const { data: members } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  cachedMembers = members || [];
  renderMembersTable();
}

function renderMembersTable() {
  const search = document.getElementById('member-search').value.toLowerCase();
  const statusFilter = document.getElementById('member-filter-status').value;
  const tbody = document.getElementById('admin-members-tbody');
  tbody.innerHTML = '';

  const filtered = cachedMembers.filter(m => {
    const matchesSearch = m.full_name.toLowerCase().includes(search) || (m.kktc_id_or_passport && m.kktc_id_or_passport.toLowerCase().includes(search));
    const matchesStatus = !statusFilter || m.membership_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  filtered.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${m.full_name}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${m.email}</div>
        </td>
        <td>${m.kktc_id_or_passport || '-'}</td>
        <td>${m.city || '-'} / ${m.phone || '-'}</td>
        <td>
          <select onchange="updateMemberRole('${m.id}', this.value)" style="font-size:0.8rem; padding:2px;">
            <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="editor" ${m.role === 'editor' ? 'selected' : ''}>Editor</option>
            <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="super_admin" ${m.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
        </td>
        <td><span class="badge ${m.membership_status === 'active' ? 'badge-success' : m.membership_status === 'pending' ? 'badge-warning' : 'badge-danger'}">${m.membership_status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="setMemberStatus('${m.id}', 'active')"><i class="fa-solid fa-check"></i></button>
          <button class="btn btn-outline btn-sm" onclick="setMemberStatus('${m.id}', 'rejected')"><i class="fa-solid fa-xmark"></i></button>
        </td>
      </tr>
    `;
  });
}

document.getElementById('member-search').addEventListener('input', renderMembersTable);
document.getElementById('member-filter-status').addEventListener('change', renderMembersTable);

window.setMemberStatus = async (id, status) => {
  await supabase.from('profiles').update({ membership_status: status }).eq('id', id);
  showAdminToast('Üye durumu güncellendi.');
  loadMembers();
};

window.updateMemberRole = async (id, role) => {
  await supabase.from('profiles').update({ role }).eq('id', id);
  showAdminToast('Üye rolü güncellendi.');
  loadMembers();
};

document.getElementById('export-members-csv').addEventListener('click', () => {
  if (cachedMembers.length === 0) return showAdminToast('Aktarılacak üye verisi yok.', true);
  let csv = 'Ad Soyad,E-Posta,Kimlik No,Telefon,Ilce,Meslek,Rol,Durum,KVKK Onay,Kayit Tarihi\n';
  cachedMembers.forEach(m => {
    csv += `"${m.full_name}","${m.email}","${m.kktc_id_or_passport || ''}","${m.phone || ''}","${m.city || ''}","${m.occupation || ''}","${m.role}","${m.membership_status}","${m.kvkk_consent_accepted}","${m.created_at}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `KKTC_Dernek_Uye_Listesi_${Date.now()}.csv`;
  link.click();
  showAdminToast('CSV dosyası indirildi.');
});

// 6. AİDAT & BAĞIŞ
async function loadPayments() {
  const { data: payments } = await supabase.from('dues_payments').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('admin-payments-tbody');
  tbody.innerHTML = '';

  (payments || []).forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
        <td>
          <strong>${p.payer_name}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${p.payer_email}</div>
        </td>
        <td><span class="badge ${p.type === 'dues' ? 'badge-success' : 'badge-warning'}">${p.type === 'dues' ? 'Aidat' : 'Bağış'}</span></td>
        <td><strong>${p.amount} ${p.currency}</strong></td>
        <td><code>${p.transaction_ref}</code></td>
        <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-danger'}">${p.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="deletePayment('${p.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

window.deletePayment = async (id) => {
  if (confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
    await supabase.from('dues_payments').delete().eq('id', id);
    showAdminToast('Ödeme kaydı silindi.');
    loadPayments();
  }
};

document.getElementById('manual-payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    payer_name: document.getElementById('man-payer').value,
    payer_email: document.getElementById('man-email').value,
    amount: parseFloat(document.getElementById('man-amount').value),
    currency: document.getElementById('man-currency').value,
    type: document.getElementById('man-type').value,
    status: 'completed',
    transaction_ref: 'MAN-' + Math.floor(100000 + Math.random() * 900000),
    notes: 'Yönetici tarafından elden/bankadan manuel işlendi'
  };

  const { error } = await supabase.from('dues_payments').insert([payload]);
  if (error) showAdminToast('Hata: ' + error.message, true);
  else {
    showAdminToast('Manuel tahsilat kaydı işlendi!');
    e.target.reset();
    loadPayments();
  }
});

window.addEventListener('DOMContentLoaded', initAdminDashboard);
