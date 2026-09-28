const tg = window.Telegram?.WebApp;
if (tg?.initData) document.documentElement.classList.add('tg');
tg?.ready();
tg?.expand();

// Чёрно-серый стиль — всегда тёмный, независимо от темы Telegram. Красим и шапку Telegram в тот же цвет.
try {
  const bg = '#0a0a0a';
  tg?.setHeaderColor?.(bg);
  tg?.setBackgroundColor?.(bg);
  tg?.setBottomBarColor?.(bg);
} catch { /* старые версии Telegram не умеют менять цвета — не страшно */ }

const CURRENCY = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸', UAH: '₴', BYN: 'Br' };
const CALORIE_GOAL = 2000;
// Примеры фраз для пустого дня: нажатие вставляет фразу в поле ввода
const EXAMPLES = ['завтра в 15 встреча с Андреем', 'такси 500', 'на обед борщ', 'надо оплатить интернет', 'каждый понедельник спортзал', 'хочу каждый день читать'];
// ——— Монохромные значки: тонкие линии цвета текста (currentColor) ———
const ICON_PATHS = {
  task: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>',
  event: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  expense: '<rect x="3.5" y="6.5" width="17" height="12" rx="2.5"/><path d="M3.5 10.5h17M15 14.5h2"/>',
  meal: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9.5 8.5c0-1.6 1-1.6 1-3.2M13.5 8.5c0-1.6 1-1.6 1-3.2"/>',
  note: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.4.6 1 .6 1.5v.7h6v-.7c0-.5 0-1.1.6-1.5A6 6 0 0 0 12 3z"/>',
  habit: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  send: '<path d="M12 19V5.5M6.5 11L12 5.5 17.5 11"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 3-5.5 4-9 2.5 1.5 3.5 4 3.5 6 1-.5 1.8-1.6 2-3 1.6 1.5 3.5 3.6 3.5 6 0 3.4-2.6 6-6.5 6z"/>',
  sparkle: '<path d="M12 3.5c.8 4.4 2.3 5.9 6.5 6.5-4.2.8-5.7 2.3-6.5 6.5-.8-4.2-2.3-5.7-6.5-6.5 4.2-.6 5.7-2.1 6.5-6.5z"/><path d="M18.5 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  empty: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M8.5 11h5"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4 6.5l1 1 1.8-2M4 12l1 1 1.8-2"/><circle cx="5.2" cy="17.5" r="1.2"/>',
  wallet: '<rect x="3.5" y="6.5" width="17" height="12" rx="2.5"/><path d="M3.5 10.5h17M15 14.5h2"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

// Числа на карточках плавно «набегают» от нуля. Итоговое значение уже стоит в тексте,
// поэтому если анимация не сработает — человек всё равно видит правильное число.
function animateNumbers(root) {
  if (typeof requestAnimationFrame !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-count-to]').forEach((el) => {
    const to = Number(el.dataset.countTo);
    if (!Number.isFinite(to) || to <= 0) return;
    const format = el.dataset.format === 'money' ? (v) => money(v) : (v) => Math.round(v).toLocaleString('ru-RU');
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 650);
      el.textContent = format(to * (1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Полоска под выбранной вкладкой плавно переезжает к ней
function moveTabIndicator() {
  const active = document.querySelector('#tabs button.active');
  const bar = document.querySelector('#tabs .indicator');
  if (!active || !bar) return;
  bar.style.width = `${active.offsetWidth}px`;
  bar.style.transform = `translateX(${active.offsetLeft}px)`;
}

const itemIcon = (it) => icon(it.type);

let state = { items: [], today: '' };
// Вкладку можно открыть сразу по ссылке: …/#expense
let tab = ['today', 'task', 'event', 'expense', 'meal', 'note', 'habit', 'list'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
// Открыли сразу дальнюю вкладку (…/#meal) — прокручиваем полосу вкладок, чтобы она была видна
document.querySelector('#tabs button.active')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, cur = 'RUB') => `${Math.round(n).toLocaleString('ru-RU')} ${CURRENCY[cur] || cur}`;
const isRub = (i) => (i.currency || 'RUB') === 'RUB';
const sum = (list, f) => list.reduce((s, i) => s + (f(i) || 0), 0);

// Даты хранятся строками YYYY-MM-DD в часовом поясе пользователя — считаем их без учёта часовых поясов браузера
const toDate = (d) => new Date(`${d}T12:00:00Z`);
const shiftDay = (d, n) => new Date(toDate(d).getTime() + n * 86400000).toISOString().slice(0, 10);
const fmt = (d, opts) => toDate(d).toLocaleDateString('ru-RU', { timeZone: 'UTC', ...opts });

function dayLabel(d) {
  if (!d) return 'Без даты';
  const diff = Math.round((toDate(d) - toDate(state.today)) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  return fmt(d, { weekday: 'short', day: 'numeric', month: 'long' });
}

// ——— Сервер ———
// Когда приложение открыто с GitHub Pages, сервер бота живёт по временному адресу туннеля.
// Бот при запуске записывает его в gist — берём оттуда.
let apiBase = '';
class OfflineError extends Error {}

async function resolveApiBase() {
  const gistId = window.APP_CONFIG?.gistId;
  if (!gistId || !location.hostname.endsWith('github.io')) return;
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось узнать адрес сервера, попробуй позже');
  const address = (await res.json()).files?.server?.content?.trim();
  if (!address?.startsWith('https://')) throw new OfflineError();
  apiBase = address;
}

async function request(path, options) {
  const res = await fetch(apiBase + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

async function api(path, options = {}) {
  if (!apiBase) await resolveApiBase();
  try {
    return await request(path, options);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    // Сервер не ответил — возможно, бот перезапустился и адрес сменился
    await resolveApiBase();
    return request(path, options);
  }
}

const isOffline = (e) => e instanceof OfflineError || e instanceof TypeError;

// ——— Загрузка ———
async function load({ quiet = false } = {}) {
  try {
    state = await api('/api/state');
    const badge = $('#badge');
    badge.textContent = state.admin ? '👑 Режим бога' : state.pro ? '⭐ Pro' : `${state.left} из ${state.limit ?? 10} сегодня`;
    badge.title = state.admin ? 'Владелец бота: безлимит' : state.pro ? 'Безлимит' : 'Бесплатных ИИ-действий осталось на сегодня';
    badge.classList.toggle('pro', state.pro);
    renderHeader();
    render();
  } catch (e) {
    if (quiet) return;
    $('#view').innerHTML = isOffline(e)
      ? `<div class="sleep">${icon('moon', 'big')}<b>Второй мозг просыпается</b><span>Сервер недоступен — обычно это на минуту. Нажми «Обновить» чуть позже — все записи на месте.</span><button class="btn primary" onclick="location.reload()">Обновить</button></div>`
      : empty('⚠️', esc(e.message));
  }
}

function renderHeader() {
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const name = tg?.initDataUnsafe?.user?.first_name;
  $('#greeting').textContent = name ? `${hello}, ${name}` : 'Второй мозг';
  $('#dateline').textContent = fmt(state.today, { weekday: 'long', day: 'numeric', month: 'long' });

  const openTasks = state.items.filter((i) => i.type === 'task' && !i.done).length;
  const upcoming = state.items.filter((i) => i.type === 'event' && i.date && i.date >= state.today).length;
  document.querySelector('[data-count="task"]').textContent = openTasks || '';
  document.querySelector('[data-count="event"]').textContent = upcoming || '';
}

// ——— Строки и блоки ———
function row(it, { check = false, showDate = false } = {}) {
  const overdue = it.type === 'task' && !it.done && it.date && it.date < state.today;
  const sub = [
    showDate && it.date ? dayLabel(it.date) : null,
    it.type === 'event' ? null : it.time,
    it.type === 'expense' ? it.category : null,
    it.repeat ? `↻ ${repeatLabel(it.repeat)}` : null,
    overdue ? 'просрочено' : null,
  ].filter(Boolean).join(' · ');
  const val = it.type === 'expense' ? money(it.amount || 0, it.currency || 'RUB')
    : it.type === 'meal' && it.calories ? `${it.calories} ккал` : '';
  const lead = check
    ? `<input type="checkbox" class="check" data-toggle="${it.id}" ${it.done ? 'checked' : ''} aria-label="Готово">`
    : it.type === 'event' && it.time
      ? `<span class="ico t-event time">${esc(it.time)}</span>`
      : `<span class="ico t-${it.type}">${itemIcon(it)}</span>`;
  return `<div class="row${it.done ? ' done' : ''}${overdue ? ' overdue' : ''}" data-edit="${it.id}">
    ${lead}
    <div class="main"><div class="title">${esc(it.title)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
    ${val ? `<span class="val">${esc(val)}</span>` : ''}
  </div>`;
}

function card(title, items, opts = {}) {
  if (!items.length) return '';
  const head = title ? `<h2 class="${opts.warn ? 'warn' : ''}"><span>${esc(title)}</span>${opts.sum ? `<span class="sum">${esc(opts.sum)}</span>` : ''}</h2>` : '';
  return `<section class="card">${head}${items.map((it) => row(it, opts)).join('')}</section>`;
}

// Группировка по дням: отдельная карточка на каждую дату
function byDay(items, opts = {}, sumOf) {
  const groups = new Map();
  for (const it of items) {
    const key = it.date || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return [...groups].map(([d, list]) => card(dayLabel(d), list, { ...opts, sum: sumOf?.(list) })).join('');
}

const EMPTY_ICON = { '🛒': 'list', '✨': 'sparkle', '📌': 'task', '📅': 'event', '💸': 'expense', '🍽': 'meal', '🎯': 'habit', '💡': 'note', '🔍': 'search', '🤷': 'empty', '⚠️': 'moon' };
const empty = (emoji, text) => `<div class="empty">${icon(EMPTY_ICON[emoji] || 'sparkle', 'big')}<p>${text}</p></div>`;
const byTime = (a, b) => `${a.date || '9'}${a.time || '99'}`.localeCompare(`${b.date || '9'}${b.time || '99'}`);
const newestFirst = (a, b) => `${b.date || ''}${b.time || ''}${String(b.id).padStart(9, '0')}`.localeCompare(`${a.date || ''}${a.time || ''}${String(a.id).padStart(9, '0')}`);

const tile = (goto, label, num, suffix = '', countTo = null, format = '') => `<button class="tile" data-goto="${goto}">
  <span class="tile-ic">${icon(goto)}</span><span class="label">${label}</span>
  <span class="num"><span${countTo ? ` data-count-to="${countTo}" data-format="${format}"` : ''}>${num}</span>${suffix ? ` <small>${suffix}</small>` : ''}</span></button>`;

// Столбчатый график по дням. Нажатие на столбик показывает значение сверху.
// goal — пунктирная линия нормы (для калорий), head — переключатель периода в заголовке.
function barChart({ title, days, values, total, format, goal = 0, head = '' }) {
  const max = Math.max(...values, goal * 1.1, 1);
  const dense = days.length > 10;
  const bars = days.map((d, i) => {
    const v = values[i];
    const cls = [d === state.today && 'today', !v && 'zero', goal && v > goal && 'over'].filter(Boolean).join(' ');
    return `<button class="${cls}" data-day="${d}" data-readout="${esc(`${dayLabel(d)}: ${format(v)}`)}" aria-label="${esc(dayLabel(d))}: ${esc(format(v))}">
      <i style="height:${v ? Math.max(4, (v / max) * 100) : 2}%"></i></button>`;
  }).join('');
  // В месячном графике подписываем каждый пятый день, чтобы подписи не слипались
  const labels = days.map((d, i) => {
    const text = dense ? (i % 5 === 0 || d === state.today ? Number(d.slice(8)) : '') : fmt(d, { weekday: 'short' });
    return `<span class="${d === state.today ? 'today' : ''}">${text}</span>`;
  }).join('');
  const goalLine = goal ? `<span class="goal" style="bottom:${(goal / max) * 100}%"><em>${goal}</em></span>` : '';
  return `<section class="card"><h2><span>${esc(title)}</span>${head || `<span class="sum">${esc(total)}</span>`}</h2>
    <div class="chart"><div class="readout">${head ? `Всего: <b>${esc(total)}</b> · нажми на столбик` : 'Нажми на столбик, чтобы увидеть значение'}</div>
    <div class="bars${dense ? ' dense' : ''}">${goalLine}${bars}</div><div class="days${dense ? ' dense' : ''}">${labels}</div></div></section>`;
}

// Траты по дням: за 7 дней или с начала месяца. Выбор запоминаем на этом устройстве.
let chartRange = 'week';
try { if (localStorage.getItem('chartRange') === 'month') chartRange = 'month'; } catch { /* хранилище недоступно — не страшно */ }
function spendChart() {
  const month = state.today.slice(0, 7);
  const count = chartRange === 'month' ? Number(state.today.slice(8)) : 7;
  const days = chartRange === 'month'
    ? Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
    : Array.from({ length: 7 }, (_, i) => shiftDay(state.today, i - 6));
  const values = days.map((d) => sum(state.items.filter((i) => i.type === 'expense' && i.date === d && isRub(i)), (i) => i.amount));
  const seg = `<span class="seg">${[['week', '7 дней'], ['month', 'Месяц']].map(([k, l]) => `<button data-range="${k}" class="${chartRange === k ? 'active' : ''}">${l}</button>`).join('')}</span>`;
  return barChart({ title: 'Траты по дням', days, values, total: money(sum(values.map((v) => ({ v })), (x) => x.v)), format: (v) => money(v), head: seg });
}

// ——— Вкладки ———
const views = {
  today() {
    const today = state.items.filter((i) => i.date === state.today);
    const tasks = state.items.filter((i) => i.type === 'task' && !i.done && (!i.date || i.date <= state.today)).sort(byTime);
    const events = today.filter((i) => i.type === 'event').sort(byTime);
    const kcal = sum(today.filter((i) => i.type === 'meal'), (i) => i.calories);
    const spent = sum(today.filter((i) => i.type === 'expense' && isRub(i)), (i) => i.amount);
    const records = today.filter((i) => ['expense', 'meal', 'note'].includes(i.type)).sort(newestFirst);

    const tiles = `<div class="tiles">
      ${tile('expense', 'Потрачено', money(spent), '', spent, 'money')}
      ${tile('meal', 'Калории', kcal, `из ${CALORIE_GOAL}`, kcal)}
      ${tile('task', 'Задачи', tasks.length, tasks.length ? 'осталось' : 'всё сделано')}
      ${tile('event', 'Встречи', events.length, 'сегодня')}
    </div>`;
    const body = card('Встречи', events) + card('Задачи', tasks, { check: true, showDate: true }) + card('Записи за день', records);
    return tiles + (body || `${empty('✨', 'На сегодня пока пусто.<br>Напиши что-нибудь сверху или надиктуй боту голосом')}
      <div class="examples">${EXAMPLES.map((e) => `<button data-example="${esc(e)}">${esc(e)}</button>`).join('')}</div>`);
  },
  task() {
    const tasks = state.items.filter((i) => i.type === 'task');
    if (!tasks.length) return empty('📌', 'Задач нет.<br>Напиши, например: «надо оплатить интернет»');
    const open = tasks.filter((i) => !i.done).sort(byTime);
    // Справа в заголовке раздела — сколько в нём задач
    const section = (title, list, opts) => card(title, list, { check: true, ...opts, sum: String(list.length) });
    return section('Просрочено', open.filter((i) => i.date && i.date < state.today), { showDate: true, warn: true })
      + section('Сегодня', open.filter((i) => i.date === state.today))
      + section('Позже', open.filter((i) => i.date > state.today), { showDate: true })
      + section('Без срока', open.filter((i) => !i.date))
      + section('Готово', tasks.filter((i) => i.done).sort(newestFirst).slice(0, 30));
  },
  event() {
    const ev = state.items.filter((i) => i.type === 'event').sort(byTime);
    if (!ev.length) return empty('📅', 'Встреч нет.<br>Напиши: «в пятницу в 19 ужин с друзьями»');
    if (calDay) {
      const list = ev.filter((i) => i.date === calDay);
      return calendar(ev) + (card(dayLabel(calDay), list) || empty('📅', `${esc(dayLabel(calDay))}: встреч нет`));
    }
    const past = ev.filter((i) => i.date && i.date < state.today).reverse().slice(0, 20);
    return calendar(ev) + byDay(ev.filter((i) => !i.date || i.date >= state.today)) + card('Прошедшие', past, { showDate: true });
  },
  expense() {
    const month = state.today.slice(0, 7);
    const list = state.items.filter((i) => i.type === 'expense' && i.date?.startsWith(month)).sort(newestFirst);
    const rub = list.filter(isRub);
    const total = sum(rub, (i) => i.amount);
    const dayOfMonth = Number(state.today.slice(8));
    const cats = {};
    rub.forEach((i) => { cats[i.category || 'Другое'] = (cats[i.category || 'Другое'] || 0) + (i.amount || 0); });
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[1] || 1;
    const catHtml = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
      <div class="cat"><div class="line"><span>${esc(c)}<small>${Math.round((v / (total || 1)) * 100)}%</small></span><b>${money(v)}</b></div>
      <div class="progress"><i style="width:${(v / top) * 100}%"></i></div></div>`).join('');
    const monthName = fmt(state.today, { month: 'long' });

    return `<section class="card hero"><div class="label">Потрачено за ${monthName}</div>
        <div class="num" data-count-to="${total}" data-format="money">${money(total)}</div>
        <div class="note">≈ ${money(total / dayOfMonth)} в день</div></section>
      ${budgetsCard(total, cats)}
      ${spendChart()}
      ${catHtml ? `<section class="card"><h2>По категориям</h2>${catHtml}</section>` : ''}
      ${list.length ? byDay(list, {}, (l) => money(sum(l.filter(isRub), (i) => i.amount))) : empty('💸', 'В этом месяце трат пока нет.<br>Напиши: «такси 500»')}
      ${exportCard()}`;
  },
  meal() {
    const meals = state.items.filter((i) => i.type === 'meal').sort(newestFirst);
    const today = meals.filter((i) => i.date === state.today);
    const kcal = sum(today, (i) => i.calories);
    const left = CALORIE_GOAL - kcal;
    // Кольцо калорий: окружность радиусом 52, заполняется по доле от нормы
    const share = Math.min(1, kcal / CALORIE_GOAL);
    const circle = 2 * Math.PI * 52;
    const week = Array.from({ length: 7 }, (_, i) => sum(meals.filter((m) => m.date === shiftDay(state.today, i - 6)), (m) => m.calories));
    const eatenDays = week.filter(Boolean);
    const avg = eatenDays.length ? Math.round(eatenDays.reduce((a, b) => a + b, 0) / eatenDays.length) : 0;
    return `<section class="card ring-card${left < 0 ? ' over' : ''}">
        <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" class="ring-bg"/>
          <circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${circle}" stroke-dashoffset="${circle * (1 - share)}"/>
        </svg>
        <div class="ring-num"><b data-count-to="${kcal}">${kcal}</b><span>ккал</span></div>
        <div class="ring-info">
          <div class="label">Сегодня из ${CALORIE_GOAL}</div>
          <div class="big-note">${left >= 0 ? `Можно ещё ~${left}` : `Перебор на ${-left}`}</div>
          ${avg ? `<div class="note">В среднем за неделю: ~${avg} ккал</div>` : ''}
        </div></section>
      ${eatenDays.length ? barChart({ title: 'Калории за 7 дней', days: Array.from({ length: 7 }, (_, i) => shiftDay(state.today, i - 6)), values: week,
        total: avg ? `~${avg} в день` : '', format: (v) => `${v} ккал`, goal: CALORIE_GOAL }) : ''}
      ${meals.length ? byDay(meals, {}, (l) => `${sum(l, (i) => i.calories)} ккал`) : empty('🍽', 'Пришли боту фото еды — посчитаю калории')}`;
  },
  habit() {
    const habits = state.habits || [];
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(state.today, i - 6));
    const labels = days.map((d) => `<span${d === state.today ? ' class="today"' : ''}>${fmt(d, { weekday: 'short' })}</span>`).join('');
    const cards = habits.map((h) => `
      <div class="habit${h.doneToday ? ' done' : ''}">
        <button class="habit-check" data-habit-check="${h.id}" aria-label="${h.doneToday ? 'Снять отметку' : 'Отметить за сегодня'}">${h.doneToday ? '✓' : ''}</button>
        <div class="main">
          <div class="title">${esc(h.emoji)} ${esc(h.title)}</div>
          <div class="sub">${h.streak ? `${icon('flame', 'inline')}${h.streak} ${h.streak % 10 === 1 && h.streak % 100 !== 11 ? 'день' : [2, 3, 4].includes(h.streak % 10) && ![12, 13, 14].includes(h.streak % 100) ? 'дня' : 'дней'} подряд` : 'серия ещё не началась'}</div>
          <div class="dots">${h.week.map((d) => `<i class="${d ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <button class="del" data-habit-del="${h.id}" aria-label="Убрать привычку">✕</button>
      </div>`).join('');
    const done = habits.filter((h) => h.doneToday).length;
    return `${habits.length ? `<section class="card hero"><div class="label">Сегодня</div>
        <div class="num">${done} <small style="font-size:15px;color:var(--hint);font-weight:500">из ${habits.length}</small></div>
        <div class="progress"><i style="width:${(done / habits.length) * 100}%"></i></div></section>
      <section class="card habits"><div class="dots-head">${labels}</div>${cards}</section>` : empty('🎯', 'Привычек пока нет.<br>Добавь ниже или напиши боту: «хочу каждый день читать»')}
      <form class="card habit-add" data-habit-add>
        <input name="emoji" maxlength="4" placeholder="🎯" aria-label="Эмодзи">
        <input name="title" maxlength="60" placeholder="Новая привычка, например «Зарядка»" aria-label="Название привычки">
        <button type="submit" class="btn primary">Добавить</button>
      </form>`;
  },
  list() {
    const lists = state.lists || [];
    const me = tg?.initDataUnsafe?.user?.id;
    const cards = lists.map((l) => {
      const others = l.members.filter((m) => m.id !== me).map((m) => m.name || 'друг');
      const open = l.items.filter((i) => !i.done).length;
      const rows = l.items.map((it) => `<div class="row li-row${it.done ? ' done' : ''}">
          <input type="checkbox" class="check" data-li-toggle="${it.id}" ${it.done ? 'checked' : ''} aria-label="Отметить">
          <div class="main"><div class="title">${esc(it.title)}</div></div>
          <button class="del" data-li-del="${it.id}" aria-label="Удалить пункт">✕</button></div>`).join('');
      return `<section class="card shared-list">
        <h2><span>${esc(l.title)}</span><span class="sum">${l.items.length ? `${open} из ${l.items.length}` : ''}</span></h2>
        <p class="hint">${others.length ? `Вместе с: ${esc(others.join(', '))}` : 'Пока только ты — пригласи семью или друзей'}</p>
        ${rows}
        <form class="li-add" data-li-add="${l.id}">
          <input name="text" maxlength="300" placeholder="Добавить: молоко, хлеб…" aria-label="Что добавить" enterkeyhint="done">
          <button type="submit" class="btn primary" aria-label="Добавить">+</button>
        </form>
        <div class="li-actions">
          ${l.invite ? `<button class="btn" data-li-invite="${l.id}">Пригласить</button>` : ''}
          ${l.items.some((i) => i.done) ? `<button class="btn" data-li-clear="${l.id}">Убрать отмеченные</button>` : ''}
          <button class="btn quiet" data-li-leave="${l.id}">${l.members.length > 1 ? 'Выйти' : 'Удалить'}</button>
        </div></section>`;
    }).join('');
    return (cards || empty('🛒', 'Общий список покупок или дел — его видят и дополняют все, кого ты пригласишь.<br>Когда кто-то добавит пункт, остальным придёт сообщение.'))
      + `<form class="card habit-add" data-li-create>
        <input name="title" maxlength="40" placeholder="${lists.length ? 'Новый список, например «Дача»' : 'Название, например «Покупки»'}" aria-label="Название списка">
        <button type="submit" class="btn primary">Создать</button>
      </form>`;
  },
  note() {
    const notes = state.items.filter((i) => i.type === 'note').sort(newestFirst);
    return notes.length ? byDay(notes) : empty('💡', 'Мыслей пока нет.<br>Надиктуй идею боту — она не потеряется');
  },
};

function render() {
  if (searching) return renderSearch();
  $('#view').innerHTML = views[tab]();
  animateNumbers($('#view'));
}

// ——— Действия ———
let toastTimer;
function toast(text, ms = 5000) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

const confirmDelete = () => new Promise((resolve) => {
  if (tg?.showConfirm && tg.isVersionAtLeast?.('6.2')) tg.showConfirm('Удалить запись?', resolve);
  else resolve(window.confirm('Удалить запись?'));
});

function setTab(name) {
  tab = name;
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
    if (b.dataset.tab === name) b.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
  moveTabIndicator();
  tg?.HapticFeedback?.selectionChanged();
  render();
  window.scrollTo({ top: 0 });
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) setTab(btn.dataset.tab);
});

// ——— Удаление, отметка, календарь, правка ———
async function removeItem(id) {
  if (!(await confirmDelete())) return false;
  const backup = state.items;
  const backupSearch = searchResults;
  state.items = state.items.filter((i) => i.id !== id);
  if (searchResults) searchResults = searchResults.filter((i) => i.id !== id);
  render(); renderHeader();
  try {
    await api(`/api/items/${id}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    state.items = backup; searchResults = backupSearch; render(); renderHeader();
    toast('⚠️ Не удалось удалить: ' + (isOffline(err) ? 'бот выключен' : err.message));
    return false;
  }
}

$('#view').addEventListener('click', async (e) => {
  const del = e.target.closest('[data-del]');
  const tog = e.target.closest('[data-toggle]');
  const bar = e.target.closest('[data-day]');
  const nav = e.target.closest('[data-cal-nav]');
  const day = e.target.closest('[data-cal-day]');
  const edit = e.target.closest('[data-edit]');

  const goto = e.target.closest('[data-goto]');
  if (goto) return setTab(goto.dataset.goto);
  const example = e.target.closest('[data-example]');
  if (example) {
    const input = $('#input');
    input.value = example.dataset.example;
    input.focus();
    tg?.HapticFeedback?.selectionChanged();
    return;
  }

  const range = e.target.closest('[data-range]');
  if (range) {
    chartRange = range.dataset.range;
    try { localStorage.setItem('chartRange', chartRange); } catch { /* не страшно */ }
    tg?.HapticFeedback?.selectionChanged();
    return render();
  }
  const exp = e.target.closest('[data-export]');
  if (exp) return exportTo(exp);

  if (bar) {
    bar.closest('.bars').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === bar));
    const [label, value] = bar.dataset.readout.split(': ');
    bar.closest('.chart').querySelector('.readout').innerHTML = `${esc(label)}: <b>${esc(value)}</b>`;
  } else if (nav) {
    calMonth = shiftMonth(calMonth || state.today.slice(0, 7), Number(nav.dataset.calNav));
    calDay = null;
    render();
  } else if (day) {
    calDay = day.dataset.calDay !== calDay ? day.dataset.calDay : null;
    tg?.HapticFeedback?.selectionChanged();
    render();
  } else if (del) {
    await removeItem(Number(del.dataset.del));
  } else if (tog) {
    const it = state.items.find((i) => i.id === Number(tog.dataset.toggle));
    if (!it) return;
    it.done = it.done ? 0 : 1;
    tg?.HapticFeedback?.impactOccurred('light');
    render(); renderHeader();
    try {
      const { created } = await api(`/api/items/${it.id}/toggle`, { method: 'POST' });
      if (created) {
        it.repeat = null;
        state.items.push(created);
        render(); renderHeader();
        toast(`↻ Следующий раз: ${dayLabel(created.date).toLowerCase()}`, 3000);
      }
    } catch (err) {
      it.done = it.done ? 0 : 1;
      render(); renderHeader();
      toast('⚠️ Не удалось сохранить: ' + (isOffline(err) ? 'бот выключен' : err.message));
    }
  } else if (e.target.closest('[data-budgets-edit]')) {
    openBudgets();
  } else if (edit) {
    const it = findItem(Number(edit.dataset.edit));
    if (it) openEditor(it);
  }
});

// Календарь встреч на месяц: неделя с понедельника, точки в днях со встречами
let calMonth = null;
let calDay = null;
const pad = (n) => String(n).padStart(2, '0');
function shiftMonth(month, n) {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function calendar(events) {
  const month = calMonth || state.today.slice(0, 7);
  const first = toDate(`${month}-01`);
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const busy = new Set(events.map((e) => e.date));
  let cells = '<span></span>'.repeat(offset);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${pad(d)}`;
    const cls = [date === state.today && 'today', date === calDay && 'selected', busy.has(date) && 'busy'].filter(Boolean).join(' ');
    cells += `<button data-cal-day="${date}" class="${cls}" aria-label="${esc(dayLabel(date))}">${d}</button>`;
  }
  const weekdays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<span class="wd">${w}</span>`).join('');
  const title = fmt(`${month}-01`, { month: 'long', year: 'numeric' }).replace(' г.', '');
  return `<section class="card cal">
    <div class="cal-head"><button data-cal-nav="-1" aria-label="Предыдущий месяц">‹</button><b>${esc(title)}</b><button data-cal-nav="1" aria-label="Следующий месяц">›</button></div>
    <div class="cal-grid">${weekdays}${cells}</div></section>`;
}

// ——— Поиск по всем записям ———
let searching = false;
let searchResults = null;
let searchTimer;
const findItem = (id) => state.items.find((i) => i.id === id) || searchResults?.find((i) => i.id === id);

function renderSearch() {
  $('#view').innerHTML = searchResults === null
    ? empty('🔍', 'Напиши хотя бы 2 буквы — найду среди всех записей за всё время')
    : searchResults.length
      ? `<p class="found">Найдено: ${searchResults.length}${searchResults.length === 100 ? '+' : ''}</p>` + byDay(searchResults)
      : empty('🤷', 'Ничего не нашлось');
}

async function runSearch() {
  const q = $('#q').value.trim();
  if (q.length < 2) { searchResults = null; return renderSearch(); }
  try {
    searchResults = (await api(`/api/search?q=${encodeURIComponent(q)}`)).items;
  } catch (err) {
    return toast('⚠️ Поиск не сработал: ' + (isOffline(err) ? 'бот выключен' : err.message));
  }
  if (searching) renderSearch();
}

function openSearch() {
  searching = true;
  $('#searchbar').hidden = false;
  $('#add').hidden = true;
  $('#tabs').hidden = true;
  $('#q').focus();
  renderSearch();
}

function closeSearch() {
  searching = false;
  searchResults = null;
  $('#q').value = '';
  $('#searchbar').hidden = true;
  $('#add').hidden = false;
  $('#tabs').hidden = false;
  render();
}

$('#searchBtn').addEventListener('click', openSearch);
$('#searchClose').addEventListener('click', closeSearch);
$('#q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 300); });

// ——— Выгрузка в Excel: файл приходит в чат с ботом ———
function exportCard() {
  return `<section class="card export"><h2><span>Выгрузка в Excel</span></h2>
    <p class="hint">Все записи — траты, задачи, еда — одной таблицей. Файл придёт в чат с ботом.</p>
    <div class="export-btns">${[['month', 'Этот месяц'], ['prev', 'Прошлый'], ['all', 'Всё время']]
      .map(([k, l]) => `<button class="btn" data-export="${k}">${l}</button>`).join('')}</div></section>`;
}

async function exportTo(btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await api('/api/export', { method: 'POST', body: JSON.stringify({ period: btn.dataset.export }) });
    tg?.HapticFeedback?.notificationOccurred('success');
    toast('📊 Файл отправлен в чат с ботом', 3000);
  } catch (err) {
    toast('⚠️ Не получилось: ' + (isOffline(err) ? 'бот недоступен' : err.message));
  } finally {
    btn.disabled = false;
  }
}

// ——— Бюджеты ———
const budgetLabel = (category) => (category === '*' ? 'Всего за месяц' : category);

function budgetsCard(total, cats) {
  const budgets = state.budgets || [];
  if (!budgets.length) {
    return `<section class="card budgets"><h2><span>Бюджеты</span></h2>
      <p class="hint">Задай лимит на месяц — предупрежу, когда подойдёшь к нему. Можно и фразой боту: «бюджет на кафе 5000».</p>
      <div class="pad"><button class="btn primary" data-budgets-edit>Задать бюджет</button></div></section>`;
  }
  const rows = budgets.map((b) => {
    const spent = b.category === '*' ? total : cats[b.category] || 0;
    const share = spent / b.amount;
    const state = share >= 1 ? 'over' : share >= 0.8 ? 'warn' : '';
    const left = b.amount - spent;
    return `<div class="cat budget ${state}"><div class="line"><span>${esc(budgetLabel(b.category))}</span><b>${money(spent)} <small>из ${money(b.amount)}</small></b></div>
      <div class="progress${share >= 1 ? ' over' : ''}"><i style="width:${Math.min(100, share * 100)}%"></i></div>
      <div class="left">${left >= 0 ? `осталось ${money(left)}` : `перерасход ${money(-left)}`}</div></div>`;
  }).join('');
  return `<section class="card budgets"><h2><span>Бюджеты</span><button class="link" data-budgets-edit>Изменить</button></h2>${rows}</section>`;
}

function openBudgets() {
  const current = Object.fromEntries((state.budgets || []).map((b) => [b.category, b.amount]));
  const fields = ['*', ...(state.categories || [])].map((c) => `<label class="field budget-field"><span>${esc(budgetLabel(c))}</span>
      <input type="number" name="${esc(c)}" inputmode="numeric" min="0" step="100" placeholder="без лимита" value="${current[c] ?? ''}"></label>`).join('');
  const sheet = $('#sheet');
  sheet.innerHTML = `<div class="sheet-bg" data-close></div>
    <form class="sheet-body" novalidate>
      <div class="sheet-head"><b>Бюджеты на месяц, ₽</b><button type="button" class="icon-btn" data-close aria-label="Закрыть">✕</button></div>
      <p class="hint">Пустое поле — без лимита.</p>
      <div class="two">${fields}</div>
      <div class="sheet-actions"><button type="submit" class="btn primary">Сохранить</button></div>
    </form>`;
  const form = sheet.querySelector('form');
  sheet.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeEditor));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const budgets = {};
    for (const input of form.querySelectorAll('input')) {
      if (input.value !== '' && Number(input.value) > 0) budgets[input.name] = Number(input.value);
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      state.budgets = (await api('/api/budgets', { method: 'POST', body: JSON.stringify({ budgets }) })).budgets;
      closeEditor();
      render();
      tg?.HapticFeedback?.notificationOccurred('success');
      toast('✅ Бюджеты сохранены', 2000);
    } catch (err) {
      btn.disabled = false;
      toast('⚠️ Не удалось сохранить: ' + (isOffline(err) ? 'бот выключен' : err.message));
    }
  });
  sheet.hidden = false;
  if (tg?.BackButton && tg.isVersionAtLeast?.('6.1')) { tg.BackButton.onClick(closeEditor); tg.BackButton.show(); }
}

function repeatLabel(rule) {
  const [kind, arg] = String(rule || '').split(':');
  if (kind === 'daily') return 'каждый день';
  if (kind === 'weekdays') return 'по будням';
  if (kind === 'weekly') return `каждый ${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][Number(arg) - 1]}`;
  if (kind === 'monthly') return `каждое ${arg}-е`;
  return '';
}

// ——— Привычки: отметка, удаление, добавление ———
async function habitRequest(path, options) {
  try {
    state.habits = (await api(path, options)).habits;
    render();
    return true;
  } catch (err) {
    toast('⚠️ Не получилось: ' + (isOffline(err) ? 'бот выключен' : err.message));
    return false;
  }
}

$('#view').addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-habit-add]');
  if (!form) return;
  e.preventDefault();
  const title = form.querySelector('[name="title"]').value.trim();
  if (!title) return toast('Напиши название привычки', 2500);
  const emoji = form.querySelector('[name="emoji"]').value.trim();
  if (await habitRequest('/api/habits', { method: 'POST', body: JSON.stringify({ title, emoji }) })) {
    tg?.HapticFeedback?.notificationOccurred('success');
  }
});

$('#view').addEventListener('click', async (e) => {
  const check = e.target.closest('[data-habit-check]');
  const del = e.target.closest('[data-habit-del]');
  if (check) {
    const h = (state.habits || []).find((x) => x.id === Number(check.dataset.habitCheck));
    if (!h) return;
    tg?.HapticFeedback?.impactOccurred(h.doneToday ? 'light' : 'medium');
    await habitRequest(`/api/habits/${h.id}/check`, { method: 'POST', body: JSON.stringify({ done: !h.doneToday }) });
  } else if (del) {
    if (!(await new Promise((resolve) => {
      if (tg?.showConfirm && tg.isVersionAtLeast?.('6.2')) tg.showConfirm('Убрать привычку? Серия сбросится.', resolve);
      else resolve(window.confirm('Убрать привычку? Серия сбросится.'));
    }))) return;
    await habitRequest(`/api/habits/${del.dataset.habitDel}`, { method: 'DELETE' });
  }
});

// ——— Общие списки ———
async function listRequest(path, options) {
  try {
    state.lists = (await api(path, options)).lists;
    render();
    return true;
  } catch (err) {
    toast('⚠️ Не получилось: ' + (isOffline(err) ? 'бот недоступен' : err.message));
    return false;
  }
}

const confirmBox = (text) => new Promise((resolve) => {
  if (tg?.showConfirm && tg.isVersionAtLeast?.('6.2')) tg.showConfirm(text, resolve);
  else resolve(window.confirm(text));
});

$('#view').addEventListener('submit', async (e) => {
  const add = e.target.closest('[data-li-add]');
  const create = e.target.closest('[data-li-create]');
  if (!add && !create) return;
  e.preventDefault();
  const input = e.target.querySelector('input');
  const value = input.value.trim();
  if (add) {
    if (!value) return input.focus();
    if (await listRequest(`/api/lists/${add.dataset.liAdd}/items`, { method: 'POST', body: JSON.stringify({ text: value }) })) {
      tg?.HapticFeedback?.notificationOccurred('success');
      // Поле ввода перерисовалось — возвращаем фокус, чтобы добавлять пункты подряд
      document.querySelector(`[data-li-add="${add.dataset.liAdd}"] input`)?.focus();
    }
  } else if (await listRequest('/api/lists', { method: 'POST', body: JSON.stringify({ title: value || 'Покупки' }) })) {
    tg?.HapticFeedback?.notificationOccurred('success');
  }
});

$('#view').addEventListener('click', async (e) => {
  const toggle = e.target.closest('[data-li-toggle]');
  const del = e.target.closest('[data-li-del]');
  const invite = e.target.closest('[data-li-invite]');
  const clear = e.target.closest('[data-li-clear]');
  const leave = e.target.closest('[data-li-leave]');
  if (toggle) {
    tg?.HapticFeedback?.impactOccurred('light');
    await listRequest(`/api/list-items/${toggle.dataset.liToggle}/toggle`, { method: 'POST' });
  } else if (del) {
    await listRequest(`/api/list-items/${del.dataset.liDel}`, { method: 'DELETE' });
  } else if (clear) {
    await listRequest(`/api/lists/${clear.dataset.liClear}/clear`, { method: 'POST' });
  } else if (invite) {
    const l = state.lists.find((x) => x.id === Number(invite.dataset.liInvite));
    if (!l?.invite) return;
    const share = `https://t.me/share/url?url=${encodeURIComponent(l.invite)}&text=${encodeURIComponent(`Давай вести общий список «${l.title}» во «Втором мозге»`)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(share);
    else window.open(share, '_blank');
  } else if (leave) {
    const l = state.lists.find((x) => x.id === Number(leave.dataset.liLeave));
    if (!l) return;
    const alone = l.members.length <= 1;
    if (!(await confirmBox(alone ? `Удалить список «${l.title}»? Все пункты пропадут.` : `Выйти из списка «${l.title}»? У остальных он останется.`))) return;
    await listRequest(`/api/lists/${l.id}`, { method: 'DELETE' });
  }
});

// ——— Окно правки записи ———
const TYPE_NAMES = { task: 'Задача', event: 'Встреча', expense: 'Трата', meal: 'Еда', note: 'Мысль' };

function openEditor(it) {
  const field = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
  const cats = state.categories || [];
  const types = Object.entries(TYPE_NAMES).map(([k, v]) => `<option value="${k}"${k === it.type ? ' selected' : ''}>${v}</option>`).join('');
  const catOptions = [...new Set([...cats, it.category].filter(Boolean))]
    .map((c) => `<option${c === it.category ? ' selected' : ''}>${esc(c)}</option>`).join('');
  const sheet = $('#sheet');
  sheet.innerHTML = `<div class="sheet-bg" data-close></div>
    <form class="sheet-body" data-type="${it.type}" novalidate>
      <div class="sheet-head"><b>Правка записи</b><button type="button" class="icon-btn" data-close aria-label="Закрыть">✕</button></div>
      ${field('Название', `<input name="title" value="${esc(it.title)}" maxlength="300" required>`)}
      ${field('Тип', `<select name="type">${types}</select>`)}
      <div class="two">${field('Дата', `<input type="date" name="date" value="${esc(it.date || '')}">`)}${field('Время', `<input type="time" name="time" value="${esc(it.time || '')}">`)}</div>
      <div class="only-plan">${field('Повтор', `<select name="repeat"></select>`)}</div>
      <div class="two only-expense">${field(`Сумма, ${CURRENCY[it.currency || 'RUB'] || it.currency}`, `<input type="number" name="amount" inputmode="decimal" min="0" step="any" value="${it.amount ?? ''}">`)}${field('Категория', `<select name="category">${catOptions}</select>`)}</div>
      <div class="only-meal">${field('Калории', `<input type="number" name="calories" inputmode="numeric" min="0" step="1" value="${it.calories ?? ''}">`)}</div>
      <div class="sheet-actions"><button type="button" class="btn danger" data-sheet-del>Удалить</button><button type="submit" class="btn primary">Сохранить</button></div>
    </form>`;
  const form = sheet.querySelector('form');
  const input = (name) => form.querySelector(`[name="${name}"]`);
  input('type').addEventListener('change', () => { form.dataset.type = input('type').value; });
  const fillRepeat = (selected) => {
    const date = input('date').value || state.today;
    const weekday = ((toDate(date).getUTCDay() + 6) % 7) + 1;
    const rules = ['', 'daily', 'weekdays', `weekly:${weekday}`, `monthly:${Number(date.slice(8))}`];
    if (selected && !rules.includes(selected)) rules.push(selected);
    input('repeat').innerHTML = rules.map((r) => `<option value="${r}"${r === selected ? ' selected' : ''}>${r ? repeatLabel(r) : 'Не повторять'}</option>`).join('');
  };
  fillRepeat(it.repeat || '');
  input('date').addEventListener('change', () => fillRepeat(input('repeat').value));

  sheet.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeEditor));
  sheet.querySelector('[data-sheet-del]').addEventListener('click', async () => {
    if (await removeItem(it.id)) closeEditor();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input('title').value.trim();
    if (!title) return toast('Название не может быть пустым', 3000);
    const type = input('type').value;
    const num = (v) => (v === '' ? null : Number(v));
    const body = {
      title, type,
      date: input('date').value || null,
      time: input('time').value || null,
      amount: type === 'expense' ? num(input('amount').value) : null,
      category: type === 'expense' ? input('category').value || 'Другое' : null,
      currency: type === 'expense' ? it.currency || 'RUB' : null,
      calories: type === 'meal' ? num(input('calories').value) : null,
      repeat: ['task', 'event'].includes(type) ? input('repeat').value || null : null,
    };
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const { item } = await api(`/api/items/${it.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      // Заменяем запись только после успешного сохранения — при ошибке всё остаётся как было
      state.items = state.items.map((i) => (i.id === item.id ? item : i));
      if (searchResults) searchResults = searchResults.map((i) => (i.id === item.id ? item : i));
      closeEditor();
      render(); renderHeader();
      tg?.HapticFeedback?.notificationOccurred('success');
      toast('✅ Сохранено', 2000);
    } catch (err) {
      btn.disabled = false;
      toast('⚠️ Не удалось сохранить: ' + (isOffline(err) ? 'бот выключен' : err.message));
    }
  });

  sheet.hidden = false;
  if (tg?.BackButton && tg.isVersionAtLeast?.('6.1')) { tg.BackButton.onClick(closeEditor); tg.BackButton.show(); }
}

function closeEditor() {
  $('#sheet').hidden = true;
  $('#sheet').innerHTML = '';
  if (tg?.BackButton && tg.isVersionAtLeast?.('6.1')) { tg.BackButton.offClick(closeEditor); tg.BackButton.hide(); }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeEditor(); });


$('#add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const input = $('#input');
  const text = input.value.trim();
  if (!text || form.classList.contains('busy')) return;
  form.classList.add('busy');
  input.blur();
  toast('⏳ Разбираю…', 0);
  try {
    const { reply } = await api('/api/add', { method: 'POST', body: JSON.stringify({ text }) });
    input.value = '';
    toast(reply);
    tg?.HapticFeedback?.notificationOccurred('success');
    await load({ quiet: true });
  } catch (err) {
    toast('⚠️ ' + (isOffline(err) ? 'Сервер недоступен — попробуй через минуту' : err.message));
    tg?.HapticFeedback?.notificationOccurred('error');
  } finally {
    form.classList.remove('busy');
  }
});

// Обновляем данные, когда пользователь возвращается в приложение
document.addEventListener('visibilitychange', () => { if (!document.hidden) load({ quiet: true }); });

load();
// Полоска под вкладкой: встаёт на место после загрузки шрифта и при повороте экрана
document.fonts?.ready.then(moveTabIndicator);
window.addEventListener('resize', moveTabIndicator);
moveTabIndicator();
