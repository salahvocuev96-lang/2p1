'use strict';

const CATEGORIES = [
  { id: 'hot',    title: 'Горячие блюда' },
  { id: 'soups',  title: 'Супы' },
  { id: 'other',  title: 'Другие блюда' },
  { id: 'salads', title: 'Салаты' },
];

const PLOV_PHOTO = 'https://commons.wikimedia.org/wiki/Special:FilePath/Uzbek_palov_in_Yerevan_Food_Court.jpg?width=700';

const MENU = [
  { id: 'plov',               name: 'Плов из говядины',     category: 'hot', price: null, description: '', photo: PLOV_PHOTO, featured: true },
  { id: 'kazan-kebab',        name: 'Казан-кебаб',          category: 'hot', price: null, description: '', photo: '', featured: true },
  { id: 'chicken-shashlik',   name: 'Куриный шашлык',       category: 'hot', price: null, description: '', photo: '', featured: true },
  { id: 'khanum',             name: 'Ханум',                category: 'hot', price: null, description: '', photo: '', featured: true },
  { id: 'beefsteak',          name: 'Бифштекс',             category: 'hot', price: null, description: '', photo: '' },
  { id: 'dolma',              name: 'Долма',                category: 'hot', price: null, description: '', photo: '' },
  { id: 'chinese-meat',       name: 'Мясо по-китайски',     category: 'hot', price: null, description: '', photo: '' },
  { id: 'stuffed-pepper',     name: 'Фаршированный перец',  category: 'hot', price: null, description: '', photo: '' },
  { id: 'chicken-sour-cream', name: 'Курица в сметане',     category: 'hot', price: null, description: '', photo: '' },
  { id: 'goulash',            name: 'Гуляш с гарниром',     category: 'hot', price: null, description: '', photo: '' },
  { id: 'stroganoff',         name: 'Бефстроганов',         category: 'hot', price: null, description: '', photo: '' },
  { id: 'legs-potatoes',      name: 'Окорочка с картошкой', category: 'hot', price: null, description: '', photo: '' },
  { id: 'beef-roast',         name: 'Жаркое из говядины',   category: 'hot', price: null, description: '', photo: '' },
  { id: 'chicken-roast',      name: 'Жаркое из курицы',     category: 'hot', price: null, description: '', photo: '' },
  { id: 'meatballs',          name: 'Тефтели',              category: 'hot', price: null, description: '', photo: '' },
  { id: 'pollock',            name: 'Жареный минтай',       category: 'hot', price: null, description: '', photo: '' },
  { id: 'shurpa', name: 'Шурпа из баранины', category: 'soups', price: null, description: '', photo: '', featured: true },
  { id: 'borsch', name: 'Борщ',              category: 'soups', price: null, description: '', photo: '' },
  { id: 'lagman', name: 'Лагман',            category: 'soups', price: null, description: '', photo: '' },
  { id: 'manty', name: 'Манты', category: 'other', price: null, description: '', photo: '', featured: true },
  { id: 'veg-salad',      name: 'Овощной салат',       category: 'salads', price: null, description: '', photo: '' },
  { id: 'carrot-salad',   name: 'Морковный салат',     category: 'salads', price: null, description: '', photo: '' },
  { id: 'olivier',        name: 'Оливье',              category: 'salads', price: null, description: '', photo: '' },
  { id: 'eggplant-salad', name: 'Салат из баклажанов', category: 'salads', price: null, description: '', photo: '' },
];

const ADDRESS = 'Москва, улица Зорге, 2';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const catById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const itemById = Object.fromEntries(MENU.map(i => [i.id, i]));

const state = { category: 'all', query: '' };
const cart = new Map();

const DISH_FORMS = ['блюдо', 'блюда', 'блюд'];
const PORTION_FORMS = ['порция', 'порции', 'порций'];

function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function norm(text) {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function plural(n, forms) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

function hasPrice(item) {
  return typeof item.price === 'number' && Number.isFinite(item.price);
}

function priceText(item) {
  return hasPrice(item) ? formatPrice(item.price) : 'Цена уточняется';
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

function rimMarkup() {
  let petals = '';
  let dots = '';
  for (let i = 0; i < 16; i++) {
    const angle = i * 22.5;
    petals += `<path class="rim-petal" style="--i:${i}" transform="rotate(${angle} 100 100)" d="M100 5.5c4.2 4 4.6 9.6 0 14.5c-4.6-4.9-4.2-10.5 0-14.5z"/>`;
    dots += `<circle class="rim-dot" style="--i:${i}" transform="rotate(${angle + 11.25} 100 100)" cx="100" cy="12.5" r="2.1"/>`;
  }
  return `<svg class="plate-rim" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <circle class="rim-line" cx="100" cy="100" r="97"/>
    <circle class="rim-line" cx="100" cy="100" r="80"/>
    ${petals}${dots}
  </svg>`;
}

function plateMarkup(item, extraClass = '') {
  const img = item.photo
    ? `<img src="${esc(item.photo)}" alt="${esc(item.name)}" loading="lazy" decoding="async">`
    : '';
  return `<div class="plate ${extraClass}" data-tone="${item.category}">
      <div class="plate-food"><span class="plate-mono" aria-hidden="true">${esc(item.name.charAt(0))}</span>${img}</div>
      ${rimMarkup()}
    </div>`;
}

function controlMarkup(item, qty) {
  if (qty <= 0) {
    return `<button class="add-btn" type="button" data-action="add" aria-label="Добавить «${esc(item.name)}» в корзину">${icon('plus')}<span>В корзину</span></button>`;
  }
  return `<div class="stepper" role="group" aria-label="Количество: ${esc(item.name)}">
      <button type="button" data-action="dec" aria-label="Убрать одну порцию">${icon('minus')}</button>
      <output aria-live="polite">${qty}</output>
      <button type="button" data-action="inc" aria-label="Добавить ещё одну порцию">${icon('plus')}</button>
    </div>`;
}

function cardMarkup(item) {
  const qty = cart.get(item.id) || 0;
  return `<article class="dish${item.featured ? ' dish--featured' : ''}" data-id="${esc(item.id)}" data-tone="${item.category}">
      ${plateMarkup(item, 'dish-plate')}
      <div class="dish-body">
        <div>
          <h4 class="dish-name">${esc(item.name)}</h4>
          ${item.description ? `<p class="dish-desc">${esc(item.description)}</p>` : ''}
        </div>
        <div class="dish-foot">
          <span class="price${hasPrice(item) ? '' : ' price--tbd'}">${priceText(item)}</span>
          <div class="dish-control">${controlMarkup(item, qty)}</div>
        </div>
      </div>
    </article>`;
}

const menuList = $('#menu-list');
const menuEmpty = $('#menu-empty');
const menuStatus = $('#menu-status');
const tabsEl = $('#menu-tabs');
const searchEl = $('#menu-search');
const searchClr = $('#search-clear');
const emptyBtn = $('#menu-empty-btn');

function filterItems(categoryId) {
  const q = norm(state.query);
  return MENU.filter(item =>
    (categoryId === 'all' || item.category === categoryId) &&
    (!q || norm(item.name).includes(q))
  );
}

function renderTabs() {
  const tabs = [
    { id: 'all', title: 'Всё меню', count: MENU.length },
    ...CATEGORIES.map(c => ({ id: c.id, title: c.title, count: MENU.filter(i => i.category === c.id).length })),
  ];
  tabsEl.innerHTML = tabs.map(t =>
    `<button class="tab" type="button" data-category="${t.id}" aria-pressed="${t.id === state.category}">${esc(t.title)}<span class="tab-count">${t.count}</span></button>`
  ).join('');
}

function renderMenu() {
  const items = filterItems(state.category);
  let html = '';

  for (const cat of CATEGORIES) {
    const group = items.filter(i => i.category === cat.id);
    if (!group.length) continue;
    html += `<section class="menu-group" aria-labelledby="group-${cat.id}">
        <div class="group-head">
          <h3 id="group-${cat.id}">${esc(cat.title)}</h3>
          <span class="group-count">${group.length} ${plural(group.length, DISH_FORMS)}</span>
        </div>
        <div class="dish-grid">${group.map(cardMarkup).join('')}</div>
      </section>`;
  }

  if (!items.length) {
    menuEmpty.hidden = false;
    menuList.innerHTML = '';
    return;
  }

  menuEmpty.hidden = true;
  menuList.innerHTML = html;
  attachDishHandlers();
  updateCartUI();
}

function attachDishHandlers() {
  $$('[data-id]', menuList).forEach(dish => {
    const id = dish.dataset.id;
    const item = itemById[id];
    if (!item) return;

    dish.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      const qty = cart.get(id) || 0;
      if (action === 'add') cart.set(id, 1);
      else if (action === 'inc') cart.set(id, qty + 1);
      else if (action === 'dec' && qty > 1) cart.set(id, qty - 1);
      else if (action === 'dec') cart.delete(id);

      const control = dish.querySelector('.dish-control');
      control.classList.add('is-changed');
      setTimeout(() => control.classList.remove('is-changed'), 300);

      control.innerHTML = controlMarkup(item, cart.get(id) || 0);
      updateCartUI();
    });
  });
}

function updateCartUI() {
  const count = Array.from(cart.values()).reduce((a, b) => a + b, 0);
  const total = Array.from(cart.entries()).reduce((sum, [id, qty]) => {
    const item = itemById[id];
    return sum + (hasPrice(item) ? item.price * qty : 0);
  }, 0);

  $('#cart-count').textContent = count;
  $('#cart-count').classList.toggle('is-zero', count === 0);
  $('#cart-btn').setAttribute('aria-label', count ? `Корзина: ${count} ${plural(count, PORTION_FORMS)}` : 'Корзина пуста');

  renderCartList();
  updateCartTotal();
}

function renderCartList() {
  const list = $('#cart-list');
  if (!cart.size) {
    $('#cart-empty').hidden = false;
    list.innerHTML = '';
    return;
  }

  $('#cart-empty').hidden = true;
  list.innerHTML = Array.from(cart.entries()).map(([id, qty]) => {
    const item = itemById[id];
    return `<li class="cart-item" data-id="${esc(id)}">
      ${plateMarkup(item, 'plate')}
      <h5 class="cart-item-name">${esc(item.name)}</h5>
      <div class="cart-item-price">${priceText(item)}</div>
      <div class="stepper" role="group">
        <button type="button" data-action="dec">${icon('minus')}</button>
        <output>${qty}</output>
        <button type="button" data-action="inc">${icon('plus')}</button>
      </div>
      <button class="icon-btn cart-remove" type="button" aria-label="Удалить">${icon('trash')}</button>
    </li>`;
  }).join('');

  $$('.cart-item', list).forEach(li => {
    const id = li.dataset.id;
    const item = itemById[id];
    const qty = cart.get(id);

    li.querySelector('.stepper').addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'inc') cart.set(id, qty + 1);
      else if (action === 'dec' && qty > 1) cart.set(id, qty - 1);
      else if (action === 'dec') removeFromCart(id);
      updateCartUI();
    });

    li.querySelector('.cart-remove').addEventListener('click', () => removeFromCart(id));
  });
}

function removeFromCart(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('is-leaving');
    setTimeout(() => {
      cart.delete(id);
      updateCartUI();
    }, 220);
  } else {
    cart.delete(id);
    updateCartUI();
  }
}

function updateCartTotal() {
  const total = Array.from(cart.entries()).reduce((sum, [id, qty]) => {
    const item = itemById[id];
    return sum + (hasPrice(item) ? item.price * qty : 0);
  }, 0);

  const hasAllPrices = Array.from(cart.keys()).every(id => hasPrice(itemById[id]));
  const totalEl = $('#cart-total');
  const noteEl = $('#cart-total-note');

  if (!cart.size) {
    totalEl.textContent = '—';
    noteEl.textContent = '';
  } else if (hasAllPrices) {
    totalEl.textContent = formatPrice(total);
    noteEl.textContent = '';
  } else {
    totalEl.textContent = '—';
    noteEl.textContent = 'Часть блюд без цены';
  }
}

tabsEl.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  state.category = tab.dataset.category;
  renderTabs();
  renderMenu();
});

searchEl.addEventListener('input', e => {
  state.query = e.target.value;
  searchClr.hidden = !state.query;
  renderMenu();
});

searchClr.addEventListener('click', () => {
  state.query = '';
  searchEl.value = '';
  searchClr.hidden = true;
  renderMenu();
  searchEl.focus();
});

$('#copy-address').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ADDRESS);
    showToast('Адрес скопирован', null);
  } catch (e) {
    console.log('Copy failed:', e);
  }
});

const headerEl = $('#site-header');
const navToggle = $('#nav-toggle');
const navEl = $('#site-nav');

navToggle.addEventListener('click', () => {
  const isOpen = navEl.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', isOpen);
  if (isOpen) document.documentElement.classList.add('is-locked');
  else document.documentElement.classList.remove('is-locked');
});

['#menu', '#about', '#contacts'].forEach(href => {
  const link = document.querySelector(`a[href="${href}"]`);
  if (link) link.addEventListener('click', () => {
    navEl.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', false);
    document.documentElement.classList.remove('is-locked');
  });
});

window.addEventListener('scroll', () => {
  const isSolid = window.scrollY > 20;
  headerEl.classList.toggle('is-solid', isSolid);
});

const drawer = $('#cart');
const backdrop = $('#drawer-backdrop');

function openCart() {
  drawer.classList.add('is-open');
  backdrop.classList.add('is-open');
  document.documentElement.classList.add('is-locked');
}

function closeCart() {
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.documentElement.classList.remove('is-locked');
}

$('#cart-btn').addEventListener('click', openCart);
backdrop.addEventListener('click', closeCart);
$$('[data-close]').forEach(btn => btn.addEventListener('click', closeCart));

const toCheckout = $('#to-checkout');
const checkoutForm = $('#checkout-form');
const cartView = $('[data-view="cart"]');
const checkoutView = $('[data-view="checkout"]');
const doneView = $('[data-view="done"]');

toCheckout.addEventListener('click', () => {
  const hasPrices = Array.from(cart.keys()).some(id => hasPrice(itemById[id]));
  if (!hasPrices) {
    alert('Нельзя оформить заказ: все блюда без цены');
    return;
  }
  switchView(checkoutView);
});

$('#back-to-cart').addEventListener('click', () => switchView(cartView));

checkoutForm.addEventListener('submit', e => {
  e.preventDefault();

  const name = $('#f-name').value.trim();
  if (name.length < 2) {
    $('#f-name').setAttribute('aria-invalid', true);
    $('#f-name-error').hidden = false;
    return;
  }

  switchView(doneView);
});

$('#clear-cart').addEventListener('click', () => {
  cart.clear();
  updateCartUI();
  switchView(cartView);
  closeCart();
});

function switchView(view) {
  [cartView, checkoutView, doneView].forEach(v => {
    const leaving = v.classList.contains('is-entering');
    v.classList.remove('is-entering', 'is-entering-back');
    if (v !== view) v.hidden = true;
  });

  view.hidden = false;
  view.classList.add('is-entering');
  const title = view.querySelector('.drawer-title');
  if (title) title.focus();
}

if (document.documentElement.classList.contains('js')) {
  renderTabs();
  renderMenu();
}

function showToast(text, action) {
  const toast = $('#toast');
  const textEl = $('#toast-text');
  const actionEl = $('#toast-action');

  textEl.textContent = text;

  if (action) {
    toast.classList.remove('no-action');
    actionEl.hidden = false;
    actionEl.onclick = action;
  } else {
    toast.classList.add('no-action');
    actionEl.hidden = true;
  }

  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

$$('[data-reveal]').forEach(el => revealObserver.observe(el));

$$('[data-rim]').forEach(plate => {
  const rim = plate.querySelector('.plate-rim');
  if (!rim) return;
  let angle = 0;
  plate.addEventListener('mouseenter', () => {
    angle = -22.5;
    rim.style.transform = `rotate(${angle}deg)`;
  });
  plate.addEventListener('mouseleave', () => {
    angle = 0;
    rim.style.transform = 'none';
  });
});

$$('.plate-food img').forEach(img => {
  img.addEventListener('load', () => {
    img.classList.add('is-loaded');
  }, { once: true });
});
