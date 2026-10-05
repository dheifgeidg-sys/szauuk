// public/script.js
let currentPage = 1, totalPages = 1;
let autoRefreshTimer = null;
let currentItemId = '', currentItemName = '';
let sortColumn = 'buyoutPrice', sortDir = 'asc';
let priceChart = null;

// ============ TELEGRAM INIT ============
const tg = window.Telegram?.WebApp;
const isTelegram = !!tg;

if (isTelegram) {
    document.body.classList.add('telegram');
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#1a2316'); tg.setBackgroundColor('#0a0e0a'); } catch (e) {}
    console.log('📱 Telegram Mini App активен');
}

// ============ АВТОРИЗАЦИЯ ============
async function checkAuth() {
    const el = document.getElementById('status');
    try {
        const res = await fetch('/api/auth/status');
        const d = await res.json();
        if (d.authenticated) {
            el.innerText = '◉ ОК'; el.style.color = '#7fb069';
            document.getElementById('loginBtn').style.display = 'none';
            loadFilters(); loadWatchlist(); loadBargains();
            setInterval(loadBargains, 30000);
            setInterval(loadWatchlist, 20000);
        } else {
            el.innerText = '◯ НЕТ'; el.style.color = '#c14545';
            document.getElementById('loginBtn').style.display = 'inline-block';
        }
    } catch (e) { el.innerText = '❌ ERR'; el.style.color = '#c14545'; }
}

// ============ ФИЛЬТРЫ ============
async function loadFilters() {
    try {
        const res = await fetch('/api/items/filters');
        const d = await res.json();
        const cat = document.getElementById('categoryFilter');
        const rar = document.getElementById('rarityFilter');
        (d.categories || []).forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = tCat(c); cat.appendChild(o); });
        (d.rarities || []).forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = tRar(r); rar.appendChild(o); });
    } catch (e) {}
}

function tCat(c) {
    return { 'weapon':'🔫 Оружие','weapon_modules':'🔧 Модули','armor':'🛡️ Броня','artefact':'💎 Артефакты','attachment':'🔩 Обвесы','bullet':'🎯 Патроны','medicine':'💊 Медицина','supply':'📦 Припасы','grenade':'💣 Гранаты','device':'📡 Устройства','containers':'📦 Контейнеры','backpacks':'🎒 Рюкзаки','misc':'🗃️ Прочее','other':'📦 Разное' }[c] || c;
}
function tRar(r) {
    return { 'DEFAULT':'⬜ Обычный','RANK_NEWBIE':'🟢 Новичок','RANK_STALKER':'🔵 Сталкер','RANK_VETERAN':'🟣 Ветеран','RANK_MASTER':'🟠 Мастер','RANK_LEGEND':'🔴 Легенда','QUEST_ITEM':'⭐ Квестовый' }[r] || r;
}
function esc(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ============ ВКЛАДКИ ============
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).style.display = 'block';
        };
    });
}

// ============ ПОИСК ПРЕДМЕТОВ ============
async function searchItems(page = 1) {
    currentPage = page;
    const query = document.getElementById('searchQuery').value.trim();
    const category = document.getElementById('categoryFilter').value;
    const isArt = category === 'artefact' || category === 'artifact';
    const rarSel = document.getElementById('rarityFilter');
    const rarity = isArt ? '' : rarSel.value;
    const rg = rarSel.closest('.filter-group');
    if (isArt) { rarSel.value = ''; rg.style.opacity = '0.4'; rg.style.pointerEvents = 'none'; rg.querySelector('label').innerText = 'Редкость (нет)'; }
    else { rg.style.opacity = '1'; rg.style.pointerEvents = 'auto'; rg.querySelector('label').innerText = 'Редкость'; }

    const div = document.getElementById('itemsResults');
    div.innerHTML = '<div class="loading">⏳ Поиск...</div>';

    try {
        const p = new URLSearchParams({ query, category, rarity, page, limit: 50 });
        const res = await fetch(`/api/items/search?${p}`);
        const d = await res.json();
        totalPages = d.totalPages;

        if (!d.items || d.items.length === 0) {
            div.innerHTML = '<div class="empty">😕 Ничего</div>';
            document.getElementById('itemsPagination').style.display = 'none';
            return;
        }

        const wl = await (await fetch('/api/watchlist')).json();
        const wlIds = new Set((wl || []).map(w => w.item_id));

        let html = `<div style="margin-bottom:10px;color:#888;font-size:12px;">Найдено: <b style="color:#ff9800;">${d.total}</b></div>`;
        html += '<table><thead><tr><th>⭐</th><th>Название</th><th>ID</th><th></th></tr></thead><tbody>';

        d.items.forEach(i => {
            const w = wlIds.has(i.id);
            html += `<tr>
                <td><button class="btn-star ${w?'active':''}" onclick="toggleWatch('${i.id}','${esc(i.name)}','${i.category}',this)">${w?'★':'☆'}</button></td>
                <td>${i.name}<div style="font-size:10px;color:#666;">${tCat(i.category)} • ${tRar(i.color)}</div></td>
                <td><code>${i.id}</code></td>
                <td><button class="btn-select" onclick="selectItem('${i.id}','${esc(i.name)}')">→</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        div.innerHTML = html;

        const pag = document.getElementById('itemsPagination');
        if (totalPages > 1) {
            pag.style.display = 'flex';
            document.getElementById('pageInfo').innerText = `${d.page}/${totalPages}`;
            document.getElementById('prevPage').disabled = d.page <= 1;
            document.getElementById('nextPage').disabled = d.page >= totalPages;
        } else pag.style.display = 'none';
    } catch (e) { div.innerHTML = '<div class="error">Ошибка</div>'; }
}

function selectItem(id, name) {
    document.getElementById('itemId').value = id;
    currentItemId = id; currentItemName = name || '';
    document.querySelector('.tab-btn[data-tab="tab-search"]')?.click();
    if (autoRefreshTimer) startAutoRefresh();
    setTimeout(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }), 100);
}

// ============ WATCHLIST ============
async function loadWatchlist() {
    try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const list = await res.json();
        const cont = document.getElementById('watchlistContent');
        if (!list || list.length === 0) { cont.innerHTML = '<div class="empty">Добавь через 🔍 Поиск</div>'; return; }

        const region = document.getElementById('regionSelect').value || 'ru';
        let html = '';
        for (const w of list) {
            let minP = null;
            try {
                const r = await fetch(`/auction/lots?region=${region}&item=${w.item_id}`);
                if (r.ok) {
                    const d = await r.json();
                    const wb = (d.lots || []).filter(l => (l.buyoutPrice || 0) > 0);
                    if (wb.length > 0) minP = Math.min(...wb.map(l => l.buyoutPrice));
                }
            } catch (e) {}

            html += `<div class="watch-item">
                <button class="btn-star active" onclick="toggleWatch('${w.item_id}','${esc(w.name)}','${w.category||''}',this)">★</button>
                <div><div class="name">${w.name}</div><code style="font-size:10px;">${w.item_id}</code></div>
                <div class="price">${minP ? minP.toLocaleString('ru-RU')+' ₽' : '—'}</div>
                <div style="font-size:10px;color:#666;">${w.region.toUpperCase()}</div>
                <button class="btn-select" onclick="selectItem('${w.item_id}','${esc(w.name)}')">→</button>
                <button class="btn-remove" onclick="removeWatch('${w.item_id}')">×</button>
            </div>`;
        }
        cont.innerHTML = html;
    } catch (e) {}
}

async function toggleWatch(id, name, category, btn) {
    const res = await fetch('/api/watchlist');
    const list = await res.json();
    const exists = list.find(w => w.item_id === id);
    if (exists) {
        await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    } else {
        await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, category, region: document.getElementById('regionSelect').value || 'ru' })
        });
    }
    loadWatchlist();
    if (btn) btn.classList.toggle('active');
}

async function removeWatch(id) {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    loadWatchlist();
}

// ============ БАРГЕЙНЫ ============
async function loadBargains() {
    try {
        const res = await fetch('/api/bargains?hours=48');
        if (!res.ok) return;
        const list = await res.json();
        const cont = document.getElementById('bargainsContent');
        if (!list || list.length === 0) { cont.innerHTML = '<div class="empty">Сканер ищет выгодные лоты...</div>'; return; }

        let html = '';
        list.slice(0, 20).forEach(b => {
            const ago = Math.round((Date.now() - b.found_at) / 60000);
            const agoStr = ago < 60 ? `${ago}м` : `${Math.round(ago/60)}ч`;
            html += `<div class="bargain-item">
                <div><div class="name">${b.name}</div><code style="font-size:10px;">${b.item_id} • ${b.region.toUpperCase()} • ${agoStr}</code></div>
                <div class="price">${b.price.toLocaleString('ru-RU')} ₽</div>
                <div style="color:#888;font-size:11px;">сред: ${b.avg_price.toLocaleString('ru-RU')}</div>
                <div class="discount">-${b.discount_percent.toFixed(0)}%</div>
            </div>`;
        });
        cont.innerHTML = html;
    } catch (e) {}
}

// ============ ЛОТЫ ============
async function searchLots(silent = false) {
    const region = document.getElementById('regionSelect').value;
    const item = document.getElementById('itemId').value.trim();
    const div = document.getElementById('results');
    if (!item) { if (!silent) div.innerHTML = '<div class="error">Укажи ID</div>'; return; }
    if (!silent) div.innerHTML = '<div class="loading">⏳ Загрузка...</div>';

    try {
        const res = await fetch(`/auction/lots?region=${region}&item=${item}`);
        if (res.status === 401) { stopAutoRefresh(); return; }
        const data = await res.json();
        if (data.error) { if (!silent) div.innerHTML = `<div class="error">${data.error}</div>`; return; }
        if (!data.lots || data.lots.length === 0) { div.innerHTML = '<div class="empty">😕 Нет лотов</div>'; return; }

        const sorted = sortLots(data.lots);
        const wb = sorted.filter(l => (l.buyoutPrice||0) > 0);
        const minB = wb.length > 0 ? wb[0].buyoutPrice : null;
        const avgB = wb.length > 0 ? Math.round(wb.reduce((s,l) => s + l.buyoutPrice, 0) / wb.length) : null;

        let html = '<div class="stats-bar">';
        if (minB !== null) html += `<div class="stat-card highlight"><div class="stat-label">💰 Мин</div><div class="stat-value">${minB.toLocaleString('ru-RU')}</div></div>`;
        if (avgB !== null) html += `<div class="stat-card"><div class="stat-label">📊 Сред</div><div class="stat-value">${avgB.toLocaleString('ru-RU')}</div></div>`;
        html += `<div class="stat-card"><div class="stat-label">📦 Лотов</div><div class="stat-value">${data.total}</div></div></div>`;

        html += '<table><thead><tr>';
        html += `<th onclick="setSort('buyoutPrice')">Выкуп</th><th onclick="setSort('amount')">Кол</th><th onclick="setSort('endTime')">Конец</th>`;
        html += '</tr></thead><tbody>';

        sorted.forEach((lot, i) => {
            const buy = lot.buyoutPrice || 0;
            const cheap = i === 0 && buy > 0;
            const diff = new Date(lot.endTime) - new Date();
            let t = '—', cls = '';
            if (diff > 0) { const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000); t = `${h}ч${m}м`; if (h < 1) cls = 'urgent'; }
            else { t = '✓'; cls = 'expired'; }
            html += `<tr class="${cheap?'best-lot':''}">
                <td class="price">${buy>0?buy.toLocaleString('ru-RU'):'—'}</td>
                <td>${lot.amount}</td>
                <td class="${cls}">${t}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        html += `<div style="margin-top:10px;color:#666;font-size:11px;text-align:right;">🔄 ${new Date().toLocaleTimeString('ru-RU')}</div>`;
        div.innerHTML = html;
    } catch (e) { if (!silent) div.innerHTML = '<div class="error">Ошибка</div>'; }
}

function sortLots(lots) {
    const arr = [...lots];
    arr.sort((a, b) => {
        let va = a[sortColumn] ?? 0, vb = b[sortColumn] ?? 0;
        if (sortColumn === 'endTime') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return arr;
}

function setSort(col) {
    if (sortColumn === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortColumn = col; sortDir = 'asc'; }
    searchLots(false);
}

function startAutoRefresh() {
    stopAutoRefresh();
    if (!document.getElementById('itemId').value.trim()) return;
    searchLots(true);
    autoRefreshTimer = setInterval(() => searchLots(true), 3000);
}
function stopAutoRefresh() { if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; } }

// ============ ИСТОРИЯ ============
async function showHistory() {
    const region = document.getElementById('regionSelect').value;
    const item = document.getElementById('itemId').value.trim();
    if (!item) { alert('Выбери предмет'); return; }
    const cont = document.getElementById('chartContainer');
    cont.style.display = 'block';
    cont.scrollIntoView({ behavior: 'smooth' });

    try {
        const res = await fetch(`/api/price-history?item=${item}&region=${region}&hours=168`);
        const data = await res.json();
        if (!data.history || data.history.length === 0) {
            alert('История пуста. Сканер наполняет её каждые 10 минут.');
            cont.style.display = 'none';
            return;
        }
        const labels = data.history.map(p => new Date(p.time).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }));
        const values = data.history.map(p => p.price);
        if (priceChart) priceChart.destroy();
        priceChart = new Chart(document.getElementById('priceChart').getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [{
                label: `Цена (${region.toUpperCase()})${data.avg24h ? ' | ср24ч: '+Math.round(data.avg24h).toLocaleString('ru-RU') : ''}`,
                data: values, borderColor: '#f0c419', backgroundColor: 'rgba(240,196,25,0.1)',
                borderWidth: 2, fill: true, tension: 0.3, pointRadius: 2
            }]},
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#d4c9a8' } } },
                scales: {
                    x: { ticks: { color: '#7a7a5e', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { color: 'rgba(42,61,32,0.5)' } },
                    y: { ticks: { color: '#7a7a5e', callback: v => (v/1000).toFixed(0)+'к' }, grid: { color: 'rgba(42,61,32,0.5)' } }
                }
            }
        });
    } catch (e) { alert('Ошибка'); }
}

// ============ КАЛЬКУЛЯТОР ============
function calculate() {
    const buy = parseFloat(document.getElementById('calcBuy').value) || 0;
    const sell = parseFloat(document.getElementById('calcSell').value) || 0;
    const fee = parseFloat(document.getElementById('calcFee').value) || 0;
    const div = document.getElementById('calcResult');
    if (buy <= 0 || sell <= 0) { div.innerHTML = '<div class="error">Заполни цены</div>'; return; }
    const feeAmt = sell * (fee / 100);
    const rev = sell - feeAmt;
    const profit = rev - buy;
    const margin = (profit / buy * 100).toFixed(2);
    div.innerHTML = `
        <div>Комиссия: <b>${feeAmt.toLocaleString('ru-RU')} ₽</b></div>
        <div>Выручка: <b>${rev.toLocaleString('ru-RU')} ₽</b></div>
        <div>Прибыль: <span class="${profit>=0?'profit':'loss'}">${profit>=0?'+':''}${profit.toLocaleString('ru-RU')} ₽</span></div>
        <div>Маржа: <b style="color:${profit>=0?'#a8e063':'#c14545'}">${margin}%</b></div>`;
}

// ============ ОБРАБОТЧИКИ ============
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    checkAuth();
    document.getElementById('loginBtn').onclick = () => {
        if (isTelegram) {
            tg.openLink(window.location.origin + '/login');
        } else {
            window.location.href = '/login';
        }
    };
    document.getElementById('searchItemsBtn').onclick = () => searchItems(1);
    document.getElementById('searchBtn').onclick = () => {
        const item = document.getElementById('itemId').value.trim();
        if (item) { currentItemId = item; startAutoRefresh(); }
    };
    document.getElementById('historyBtn').onclick = showHistory;
    document.getElementById('calcBtn').onclick = calculate;
    document.getElementById('prevPage').onclick = () => { if (currentPage > 1) searchItems(currentPage - 1); };
    document.getElementById('nextPage').onclick = () => { if (currentPage < totalPages) searchItems(currentPage + 1); };
    document.getElementById('searchQuery').addEventListener('keypress', e => { if (e.key === 'Enter') searchItems(1); });
});
