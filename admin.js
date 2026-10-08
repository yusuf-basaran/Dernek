import { supabase, requireAuth } from './supabase-client.js';

let cachedMembers = [];

async function initAdminDashboard() {
  const auth = await requireAuth(['admin', 'super_admin']);
  if (!auth) return;

  document.getElementById('admin-user-title').innerText = `${auth.profile.full_name} (${auth.profile.role})`;

  document.querySelectorAll('.sidebar-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-menu button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).style.display = 'block';
    });
  });

  document.getElementById('admin-logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  await loadCorporateSettings();
  await loadGalleryMedia();
  await loadMembers();
  await loadPayments();
}

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
    if (error) alert('Hata: ' + error.message);
    else alert('Kurumsal ayarlar başarıyla kaydedildi!');
  } catch (err) {
    alert('JSON formatı geçersiz! Lütfen IBAN ve Sayaç alanlarını doğru JSON formatında yazınız.');
  }
});

document.getElementById('upload-charter-btn').addEventListener('click', async () => {
  const file = document.getElementById('charter-file-input').files[0];
  if (!file) return alert('Lütfen bir PDF dosyası seçiniz.');

  const fileName = `charter_${Date.now()}.pdf`;
  const { data, error } = await supabase.storage.from('documents').upload(fileName, file);

  if (error) {
    alert('Yükleme hatası: ' + error.message);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
  await supabase.from('settings_corporate').update({ charter_pdf_url: publicUrl }).eq('id', 1);
  alert('Resmî tüzük başarıyla yüklendi!');
  loadCorporateSettings();
});

document.getElementById('upload-gallery-btn').addEventListener('click', async () => {
  const title = document.getElementById('gallery-img-title').value;
  const file = document.getElementById('gallery-file-input').files[0];
  if (!file || !title) return alert('Lütfen başlık ve görsel dosyası seçiniz.');

  const fileName = `gal_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const { data, error } = await supabase.storage.from('media').upload(fileName, file);

  if (error) {
    alert('Medya yüklenemedi: ' + error.message);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
  await supabase.from('media_gallery').insert([{ title, image_url: publicUrl }]);
  alert('Görsel galeriye eklendi!');
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
    loadGalleryMedia();
  }
};

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
  loadMembers();
};

window.updateMemberRole = async (id, role) => {
  await supabase.from('profiles').update({ role }).eq('id', id);
  loadMembers();
};

document.getElementById('export-members-csv').addEventListener('click', () => {
  if (cachedMembers.length === 0) return alert('Aktarılacak üye verisi yok.');
  let csv = 'Ad Soyad,E-Posta,Kimlik No,Telefon,Ilce,Meslek,Rol,Durum,KVKK Onay,Kayit Tarihi\n';
  cachedMembers.forEach(m => {
    csv += `"${m.full_name}","${m.email}","${m.kktc_id_or_passport || ''}","${m.phone || ''}","${m.city || ''}","${m.occupation || ''}","${m.role}","${m.membership_status}","${m.kvkk_consent_accepted}","${m.created_at}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `KKTC_Dernek_Uye_Listesi_${Date.now()}.csv`;
  link.click();
});

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
  if (error) alert('Hata: ' + error.message);
  else {
    alert('Manuel tahsilat kaydı işlendi!');
    e.target.reset();
    loadPayments();
  }
});

window.addEventListener('DOMContentLoaded', initAdminDashboard);
