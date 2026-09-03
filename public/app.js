let currentTab = 'home';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${tab}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'home') loadHomeFeed();
  if (tab === 'policies') loadPolicies();
  if (tab === 'agriTech') loadAgriTech();
  if (tab === 'notices') loadNotices();
  if (tab === 'profile') loadProfile();
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.tab));
});

function performGlobalSearch() {
  const keyword = document.getElementById('globalSearch').value.trim();
  if (!keyword) return alert('请输入关键词');
  Promise.all([
    fetch(`/api/policies?keyword=${encodeURIComponent(keyword)}`).then(r => r.json()),
    fetch(`/api/agri-tech?keyword=${encodeURIComponent(keyword)}`).then(r => r.json())
  ]).then(([policies, techs]) => {
    const feed = document.getElementById('homeFeed');
    let html = '';
    if (policies.length === 0 && techs.length === 0) {
      html = '<div class="card-item">未找到相关内容</div>';
    } else {
      [...policies, ...techs].forEach(item => {
        const title = item.title || '无标题';
        const content = item.content ? item.content.slice(0, 40) + '...' : '';
        const tag = item.category || '综合';
        html += `<div class="card-item"><div class="title">${title}</div><div class="meta"><span class="tag">${tag}</span></div><div class="desc">${content}</div></div>`;
      });
    }
    feed.innerHTML = html;
    switchTab('home');
  }).catch(err => alert('搜索失败'));
}

function loadHomeFeed() {
  const feed = document.getElementById('homeFeed');
  fetch('/api/notices')
    .then(r => r.json())
    .then(data => {
      let html = '';
      if (data.length === 0) html = '<div class="card-item">暂无最新动态</div>';
      data.slice(0, 5).forEach(item => {
        html += `<div class="card-item"><div class="title">📢 ${item.title}</div><div class="meta">${item.date} | 发布: ${item.publisher}</div><div class="desc">${item.content.slice(0, 30)}...</div></div>`;
      });
      feed.innerHTML = html;
    });
}

function loadPolicies(category = '全部') {
  const list = document.getElementById('policyList');
  let url = '/api/policies';
  if (category !== '全部') url += `?category=${encodeURIComponent(category)}`;
  fetch(url).then(r => r.json()).then(data => {
    let html = '';
    if (data.length === 0) html = '<div class="card-item">暂无政策信息</div>';
    data.forEach(item => {
      html += `<div class="card-item"><div class="title">${item.title}</div><div class="meta"><span class="tag">${item.category}</span> ${item.date}</div><div class="desc">${item.content}</div></div>`;
    });
    list.innerHTML = html;
  });
}

function loadAgriTech(category = '全部') {
  const list = document.getElementById('techList');
  let url = '/api/agri-tech';
  if (category !== '全部') url += `?category=${encodeURIComponent(category)}`;
  fetch(url).then(r => r.json()).then(data => {
    let html = '';
    if (data.length === 0) html = '<div class="card-item">暂无农技知识</div>';
    data.forEach(item => {
      html += `<div class="card-item"><div class="title">🌿 ${item.title}</div><div class="meta"><span class="tag">${item.category}</span> 作物: ${item.crop_type || '通用'}</div><div class="desc">${item.content}</div></div>`;
    });
    list.innerHTML = html;
  });
}

function loadNotices() {
  const list = document.getElementById('noticeList');
  fetch('/api/notices').then(r => r.json()).then(data => {
    let html = '';
    if (data.length === 0) html = '<div class="card-item">暂无村务通知</div>';
    data.forEach(item => {
      html += `<div class="card-item"><div class="title">${item.title}</div><div class="meta">${item.date} | ${item.publisher}</div><div class="desc">${item.content}</div></div>`;
    });
    list.innerHTML = html;
  });
}

function loadProfile() {
  fetch('/api/plantings').then(r => r.json()).then(data => {
    if (data.length > 0) {
      const p = data[0];
      document.getElementById('cropType').value = p.crop_type || '水稻';
      document.getElementById('variety').value = p.variety || '';
      document.getElementById('sowDate').value = p.sow_date || '';
    }
  });
  fetchReminders();
}

document.getElementById('plantingForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const payload = {
    crop_type: document.getElementById('cropType').value,
    variety: document.getElementById('variety').value,
    sow_date: document.getElementById('sowDate').value
  };
  fetch('/api/plantings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.json()).then(res => {
    alert(res.message || '保存成功');
    loadProfile();
  }).catch(() => alert('保存失败，请重试'));
});

function fetchReminders() {
  const container = document.getElementById('reminderList');
  container.innerHTML = '<div style="color:#6a806a;">⏳ 加载中...</div>';
  fetch('/api/reminders')
    .then(r => r.json())
    .then(data => {
      let html = '';
      if (data.length === 0) html = '<div class="reminder-item">暂无提醒，请先完善种植档案</div>';
      data.forEach(item => {
        const cls = item.level === 'danger' ? 'danger' : (item.level === 'warning' ? 'warning' : '');
        html += `<div class="reminder-item ${cls}">${item.text}</div>`;
      });
      container.innerHTML = html;
    });
}

function showPublishModal() {
  document.getElementById('publishModal').classList.add('show');
}
function closeModal() {
  document.getElementById('publishModal').classList.remove('show');
}
document.getElementById('publishModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.getElementById('noticeForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('noticeTitle').value,
    content: document.getElementById('noticeContent').value,
    publisher: document.getElementById('noticePublisher').value || '村干部'
  };
  fetch('/api/notices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.json()).then(res => {
    alert('✅ 通知发布成功！');
    closeModal();
    this.reset();
    loadNotices();
    loadHomeFeed();
  }).catch(() => alert('发布失败'));
});

document.querySelectorAll('#policyFilters .filter-item').forEach(el => {
  el.addEventListener('click', function() {
    document.querySelectorAll('#policyFilters .filter-item').forEach(f => f.classList.remove('active'));
    this.classList.add('active');
    loadPolicies(this.dataset.cat);
  });
});
document.querySelectorAll('#techFilters .filter-item').forEach(el => {
  el.addEventListener('click', function() {
    document.querySelectorAll('#techFilters .filter-item').forEach(f => f.classList.remove('active'));
    this.classList.add('active');
    loadAgriTech(this.dataset.cat);
  });
});

switchTab('home');