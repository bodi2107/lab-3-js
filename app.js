const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const genreEl = document.getElementById('genre');
const yearEl = document.getElementById('year');
const minRatingEl = document.getElementById('minRating');
const sortEl = document.getElementById('sort');
const limitEl = document.getElementById('limit');
const clearFiltersBtn = document.getElementById('clearFilters');
const applyFiltersBtn = document.getElementById('applyFilters');
const showWatchlistBtn = document.getElementById('showWatchlist');
const exportWatchlistBtn = document.getElementById('exportWatchlist');
const importFileEl = document.getElementById('importFile');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const fetchFromApiBtn = document.getElementById('fetchFromApi');
const loadLargeBtn = document.getElementById('loadLarge');

let movies = [];
let filtered = [];
let showOnlyWatchlist = false;
const API_BASE = window.API_BASE || 'http://localhost:3000';

function fetchMovies(){
  return fetch('movies.json').then(r=>r.json());
}

function applyFilters(){
  const q = searchEl.value.trim().toLowerCase();
  const genre = genreEl.value;
  const year = yearEl.value;
  const minRating = parseFloat(minRatingEl.value) || 0;
  filtered = movies.filter(m => {
    if(showOnlyWatchlist && !isInWatchlist(m.id)) return false;
    if(q && !m.title.toLowerCase().includes(q)) return false;
    if(genre !== 'all' && m.genre !== genre) return false;
    if(year !== 'all' && String(m.year) !== year) return false;
    if(m.rating < minRating) return false;
    return true;
  });

  const sort = sortEl.value;
  if(sort === 'title-asc') filtered.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort === 'title-desc') filtered.sort((a,b)=>b.title.localeCompare(a.title));
  if(sort === 'year-desc') filtered.sort((a,b)=>b.year - b.year?b.year-a.year:0);
  if(sort === 'rating-desc') filtered.sort((a,b)=>b.rating - a.rating);

  // apply limit from UI if set
  const limitVal = parseInt(limitEl?.value, 10);
  if(Number.isInteger(limitVal) && limitVal > 0){
    filtered = filtered.slice(0, limitVal);
  }

  renderList();
}

function renderList(){
  listEl.innerHTML = '';
  if(filtered.length === 0){
    listEl.innerHTML = '<p>Фильмы не найдены.</p>';
    return;
  }
  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${m.poster}" alt="${m.title}" />
      <div class="card-body">
        <h3>${m.title}</h3>
        <div style="display:flex;align-items:center" class="meta">${m.genre} · ${m.year} <span class="rating">${m.rating}</span></div>
        <p>${m.description}</p>
        <div class="card-actions">
          <button class="button primary" data-id="${m.id}" data-action="details">Подробнее</button>
          <button class="button ghost" data-id="${m.id}" data-action="watch">${isInWatchlist(m.id)?'Убрать':'В избранное'}</button>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function populateFilters(){
  const genres = Array.from(new Set(movies.map(m=>m.genre))).sort();
  genres.forEach(g=>{
    const opt = document.createElement('option'); opt.value = g; opt.textContent = g; genreEl.appendChild(opt);
  });
  const years = Array.from(new Set(movies.map(m=>m.year))).sort((a,b)=>b-a);
  years.forEach(y=>{const opt=document.createElement('option');opt.value=y;opt.textContent=y;yearEl.appendChild(opt)});
}

function isInWatchlist(id){
  const w = JSON.parse(localStorage.getItem('watchlist')||'[]');
  return w.includes(id);
}

function toggleWatchlist(id){
  const w = JSON.parse(localStorage.getItem('watchlist')||'[]');
  const idx = w.indexOf(id);
  if(idx===-1) w.push(id); else w.splice(idx,1);
  localStorage.setItem('watchlist', JSON.stringify(w));
  applyFilters();
}

function showDetails(id){
  const m = movies.find(x=>x.id===id);
  modalBody.innerHTML = `
    <h2>${m.title} (${m.year})</h2>
    <div class="meta">${m.genre} · Рейтинг: ${m.rating}</div>
    <img src="${m.poster}" alt="${m.title}" style="width:100%;max-height:360px;object-fit:cover;margin:8px 0"/>
    <p>${m.description}</p>
    <div style="display:flex;gap:8px">
      <button class="button primary" id="modalWatch">${isInWatchlist(m.id)?'Убрать из избранного':'Добавить в избранное'}</button>
      <button class="button ghost" id="modalClose">Закрыть</button>
    </div>
  `;
  document.getElementById('modalWatch').onclick = ()=>{toggleWatchlist(id); modal.classList.add('hidden')};
  document.getElementById('modalClose').onclick = ()=>modal.classList.add('hidden');
  modal.classList.remove('hidden');
}

listEl.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = parseInt(btn.dataset.id,10);
  const action = btn.dataset.action;
  if(action === 'details') showDetails(id);
  if(action === 'watch') toggleWatchlist(id);
});

searchEl.addEventListener('input', applyFilters);
genreEl.addEventListener('change', applyFilters);
yearEl.addEventListener('change', applyFilters);
minRatingEl.addEventListener('input', applyFilters);
sortEl.addEventListener('change', applyFilters);
// make filters usable via explicit button as well
if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', ()=>{
  searchEl.value=''; genreEl.value='all'; yearEl.value='all'; minRatingEl.value='0'; sortEl.value='default'; showOnlyWatchlist=false; showWatchlistBtn.textContent='Показать избранное'; applyFilters();
});

showWatchlistBtn.addEventListener('click', ()=>{
  showOnlyWatchlist = !showOnlyWatchlist;
  showWatchlistBtn.textContent = showOnlyWatchlist? 'Показать все' : 'Показать избранное';
  applyFilters();
});

exportWatchlistBtn.addEventListener('click', ()=>{
  const w = JSON.parse(localStorage.getItem('watchlist')||'[]');
  const data = movies.filter(m=>w.includes(m.id));
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'watchlist.json'; a.click(); URL.revokeObjectURL(url);
});

importFileEl.addEventListener('change', async e=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const txt = await f.text();
    const imported = JSON.parse(txt);
    if(!Array.isArray(imported)) throw new Error('Неверный формат');
    const ids = imported.map(x=>x.id).filter(Boolean);
    localStorage.setItem('watchlist', JSON.stringify(Array.from(new Set(ids))));
    applyFilters();
    alert('Импорт завершён');
  }catch(err){alert('Ошибка импорта: '+err.message)}
});

closeModal.addEventListener('click', ()=>modal.classList.add('hidden'));
modal.addEventListener('click', e=>{if(e.target===modal) modal.classList.add('hidden')});

// Инициализация
fetchMovies().then(data=>{
  movies = data;
  populateFilters();
  applyFilters();
}).catch(err=>{
  listEl.innerHTML = '<p>Не удалось загрузить данные. Запустите локальный сервер.</p>';
});

// загрузка большого датасета по кнопке
if (loadLargeBtn) {
  loadLargeBtn.addEventListener('click', async ()=>{
    try{
      loadLargeBtn.disabled = true; loadLargeBtn.textContent = 'Загрузка...';
      const res = await fetch('movies-large.json');
      if(!res.ok) throw new Error('movies-large.json не найден');
      const data = await res.json();
      movies = data;
      populateFilters();
      applyFilters();
    }catch(err){
      alert('Не удалось загрузить большой датасет: '+err.message);
    }finally{
      loadLargeBtn.disabled = false; loadLargeBtn.textContent = 'Загрузить большой датасет';
    }
  });
}

// fetch from service-b API and render
if(fetchFromApiBtn){
  fetchFromApiBtn.addEventListener('click', async ()=>{
    const genre = genreEl.value === 'all' ? '' : genreEl.value;
    const limitVal = parseInt(limitEl?.value, 10);
    try{
        fetchFromApiBtn.disabled = true; fetchFromApiBtn.textContent = 'Загрузка...';
        const params = new URLSearchParams();
        params.set('genre', genre || '');
        if(Number.isInteger(limitVal) && limitVal > 0) params.set('limit', String(limitVal));
        const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`);
      const json = await res.json();
      if(Array.isArray(json.result)){
        filtered = json.result;
        renderList();
      }else{
        alert('Неверный ответ от API');
      }
    }catch(err){
      alert('Ошибка запроса к API: '+err.message);
    }finally{
      fetchFromApiBtn.disabled = false; fetchFromApiBtn.textContent = 'Получить от API';
    }
  });
}