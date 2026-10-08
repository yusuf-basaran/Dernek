import { supabase, requireAuth, validateKKTCPhone } from './supabase-client.js';

let currentUserData = null;

async function initMemberDashboard() {
  currentUserData = await requireAuth(['member', 'admin', 'super_admin']);
  if (!currentUserData) return;

  const { user, profile } = currentUserData;

  document.getElementById('user-display-name').innerText = `${profile.full_name} (${profile.role.toUpperCase()})`;
  const badgeEl = document.getElementById('membership-badge');
  badgeEl.innerText = profile.membership_status.toUpperCase();
  badgeEl.style.color = profile.membership_status === 'active' ? 'var(--success)' : 'var(--danger)';

  document.getElementById('prof-name').value = profile.full_name || '';
  document.getElementById('prof-id').value = profile.kktc_id_or_passport || '';
  document.getElementById('prof-phone').value = profile.phone || '';
  document.getElementById('prof-city').value = profile.city || 'Lefkoşa';
  document.getElementById('prof-occ').value = profile.occupation || '';

  document.querySelectorAll('.sidebar-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-menu button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).style.display = 'block';
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  await loadMemberDues(user.id);
}

async function loadMemberDues(userId) {
  const { data: dues } = await supabase
    .from('dues_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('dues-table-body');
  tbody.innerHTML = '';
  let totalPaid = 0;

  if (!dues || dues.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Kayıtlı aidat ödemesi bulunamadı.</td></tr>';
  } else {
    dues.forEach(d => {
      if (d.status === 'completed') totalPaid += Number(d.amount);
      tbody.innerHTML += `
        <tr>
          <td>${new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
          <td>${d.period_label || '-'}</td>
          <td><code>${d.transaction_ref}</code></td>
          <td><strong>${d.amount} ${d.currency}</strong></td>
          <td><span class="badge ${d.status === 'completed' ? 'badge-success' : 'badge-danger'}">${d.status}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="alert('Dijital Makbuz No: ${d.transaction_ref}\\nÖdeyen: ${d.payer_name}\\nTutar: ${d.amount} ${d.currency}\\nTarih: ${new Date(d.created_at).toLocaleString('tr-TR')}');">
              <i class="fa-solid fa-receipt"></i> Makbuz
            </button>
          </td>
        </tr>
      `;
    });
  }

  document.getElementById('total-dues-paid').innerText = `${totalPaid} TRY`;
}

document.getElementById('profile-update-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('prof-phone').value;
  if (!validateKKTCPhone(phone)) {
    alert('Geçerli bir KKTC telefon numarası giriniz.');
    return;
  }

  const updates = {
    full_name: document.getElementById('prof-name').value,
    kktc_id_or_passport: document.getElementById('prof-id').value,
    phone,
    city: document.getElementById('prof-city').value,
    occupation: document.getElementById('prof-occ').value,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('profiles').update(updates).eq('id', currentUserData.user.id);
  if (error) alert('Güncelleme hatası: ' + error.message);
  else alert('Profil bilgileriniz başarıyla güncellendi.');
});

const payModal = document.getElementById('pay-modal');
document.getElementById('open-pay-dues-btn').addEventListener('click', () => payModal.style.display = 'flex');
document.getElementById('close-pay-modal').addEventListener('click', () => payModal.style.display = 'none');

document.getElementById('pay-period').addEventListener('change', (e) => {
  document.getElementById('pay-amount').value = e.target.value === '2026-YILLIK' ? '1000' : '250';
});

document.getElementById('panel-dues-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('pay-amount').value);
  const period = document.getElementById('pay-period').value;

  const payload = {
    user_id: currentUserData.user.id,
    payer_name: currentUserData.profile.full_name,
    payer_email: currentUserData.user.email,
    payer_phone: currentUserData.profile.phone,
    amount,
    currency: 'TRY',
    type: 'dues',
    status: 'completed',
    period_label: period,
    transaction_ref: 'AID-' + Math.floor(100000 + Math.random() * 900000),
    nestpay_order_id: 'NEST-DUES-' + Date.now(),
    notes: 'Üye paneli sanal pos simülasyonu ile tahsil edildi'
  };

  const { error } = await supabase.from('dues_payments').insert([payload]);
  payModal.style.display = 'none';

  if (error) alert('Ödeme kaydedilemedi: ' + error.message);
  else {
    alert('Aidat ödemeniz başarıyla alındı ve kayıtlara işlendi.');
    loadMemberDues(currentUserData.user.id);
  }
});

window.addEventListener('DOMContentLoaded', initMemberDashboard);
