document.getElementById('year').textContent = new Date().getFullYear();

function el(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html !== undefined) e.innerHTML = html;
  return e;
}

async function loadJSON(path){
  try{
    const res = await fetch(path);
    if(!res.ok) throw new Error('not found');
    return await res.json();
  }catch(e){
    return null;
  }
}

function pointsList(points){
  if(!points || !points.length) return null;
  const ul = el('ul','entry-points');
  points.forEach(p => ul.appendChild(el('li', null, p)));
  return ul;
}

function stripBraces(value){
  return value.replace(/^["{\s]+|["}\s]+$/g, '').trim();
}

function parseAuthorsAPA(authorField){
  if(!authorField) return 'Anonymous';
  const authors = authorField.split(/\s+and\s+/i).map(name => {
    name = name.trim();
    if(name.includes(',')){
      const [last, first] = name.split(',').map(part => part.trim());
      const initials = first.split(/\s+/).map(n => n[0]?.toUpperCase() + '.').join(' ');
      return `${last}, ${initials}`;
    }
    const parts = name.split(/\s+/);
    const last = parts.pop();
    const initials = parts.map(part => part[0]?.toUpperCase() + '.').join(' ');
    return `${last}, ${initials}`;
  });
  if(authors.length === 1) return authors[0];
  if(authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
}

function sentenceCase(text){
  if(!text) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function parseBibtex(text){
  const entries = [];
  let index = 0;

  while(true){
    const at = text.indexOf('@', index);
    if(at === -1) break;
    const header = text.slice(at).match(/^@(\w+)\s*{\s*([^,]+),/);
    if(!header){
      index = at + 1;
      continue;
    }

    const type = header[1].toLowerCase();
    const key = header[2].trim();
    let cursor = at + header[0].length;
    let depth = 1;

    while(cursor < text.length && depth > 0){
      if(text[cursor] === '{') depth++;
      else if(text[cursor] === '}') depth--;
      cursor++;
    }

    const body = text.slice(at + header[0].length, cursor - 1);
    const entry = {entryType: type, key};
    let pos = 0;

    while(pos < body.length){
      const fieldMatch = body.slice(pos).match(/^\s*([a-zA-Z_]+)\s*=\s*/);
      if(!fieldMatch) break;
      const name = fieldMatch[1].toLowerCase();
      pos += fieldMatch[0].length;
      let value = '';

      if(body[pos] === '{'){
        pos++;
        let nested = 1;
        const start = pos;
        while(pos < body.length && nested > 0){
          if(body[pos] === '{') nested++;
          else if(body[pos] === '}') nested--;
          pos++;
        }
        value = body.slice(start, pos - 1);
      } else if(body[pos] === '"'){
        pos++;
        const start = pos;
        while(pos < body.length && body[pos] !== '"'){
          if(body[pos] === '\\' && pos + 1 < body.length) pos += 2;
          else pos++;
        }
        value = body.slice(start, pos);
        pos++;
      } else {
        const start = pos;
        while(pos < body.length && body[pos] !== ',' && body[pos] !== '\n' && body[pos] !== '}') pos++;
        value = body.slice(start, pos);
      }

      entry[name] = stripBraces(value);
      const comma = body.indexOf(',', pos);
      if(comma === pos) pos++;
    }

    entries.push(entry);
    index = cursor;
  }

  return entries;
}

async function loadText(path){
  try{
    const res = await fetch(path);
    if(!res.ok) throw new Error('not found');
    return await res.text();
  }catch(e){
    return null;
  }
}

async function loadBibtex(path){
  const text = await loadText(path);
  return text ? parseBibtex(text) : null;
}

async function init(){
  // Static bio content is embedded directly in HTML.

  // Publications
  const publications = await loadBibtex('pubs.bib');
  const publicationsList = document.getElementById('publicationsList');
  (publications || []).forEach(p => {
    const li = el('li');
    const title = p.title || p.booktitle || p.journal || p.key;
    const url = p.url || (p.doi ? (p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`) : null);

    if(title){
      if(url){
        const a = el('a','entry-title', title);
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        li.appendChild(a);
      } else {
        li.appendChild(el('span','entry-title', title));
      }
    }

    const authors = parseAuthorsAPA(p.author);
    const year = p.year ? `(${p.year}).` : '(n.d.).';
    const entryTitle = p.title ? `${sentenceCase(p.title)}.` : '';
    const source = p.journal ? `<em>${p.journal}</em>.` : p.booktitle ? `<em>${p.booktitle}</em>.` : '';
    const doiUrl = p.doi ? (p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`) : null;
    const linkLine = doiUrl || url ? ` ${doiUrl || url}` : '';
    const citation = `${authors} ${year} ${entryTitle} ${source}`.trim();

    if(citation){
      li.appendChild(el('span','entry-meta', citation + (linkLine ? ` <a href="${doiUrl || url}" target="_blank" rel="noopener">${doiUrl || url}</a>` : '')));
    }
    if(p.note) li.appendChild(el('span','entry-desc', p.note));
    publicationsList.appendChild(li);
  });

  // Talks
  const talks = await loadJSON('talks.json');
  const talksList = document.getElementById('talksList');
  (talks || []).forEach(t => {
    const li = el('li');
    if(t.link){
      const a = el('a','entry-title', t.title);
      a.href = t.link; a.target = '_blank'; a.rel = 'noopener';
      li.appendChild(a);
    } else {
      li.appendChild(el('span','entry-title', t.title));
    }
    li.appendChild(el('span','entry-meta', t.event || ''));
    if(t.description) li.appendChild(el('span','entry-desc', t.description));
    talksList.appendChild(li);
  });

  // News (updates)
  const news = await loadJSON('updates.json');
  const newsList = document.getElementById('newsList');
  (news || []).forEach(n => {
    const li = el('li');
    li.appendChild(el('span','entry-title', n.title));
    li.appendChild(el('span','entry-meta', n.date || ''));
    if(n.description) li.appendChild(el('span','entry-desc', n.description));
    newsList.appendChild(li);
  });

  // Experience
  const experience = await loadJSON('experience.json');
  const experienceList = document.getElementById('experienceList');
  (experience || []).forEach(ex => {
    const li = el('li');
    li.appendChild(el('span','entry-title', [ex.title, ex.organization].filter(Boolean).join(' — ')));
    li.appendChild(el('span','entry-meta', ex.duration || ''));
    if(ex.description) li.appendChild(el('span','entry-desc', ex.description));
    const pts = pointsList(ex.points);
    if(pts) li.appendChild(pts);
    experienceList.appendChild(li);
  });

  // Projects
  const projects = await loadJSON('projects.json');
  const projectsList = document.getElementById('projectsList');
  (projects || []).forEach(pr => {
    const li = el('li');
    if(pr.link){
      const a = el('a','entry-title', pr.title);
      a.href = pr.link; a.target = '_blank'; a.rel = 'noopener';
      li.appendChild(a);
    } else {
      li.appendChild(el('span','entry-title', pr.title));
    }
    const meta = [pr.authors, pr.venue, pr.duration].filter(Boolean).join(' — ');
    li.appendChild(el('span','entry-meta', meta));
    if(pr.description) li.appendChild(el('span','entry-desc', pr.description));
    projectsList.appendChild(li);
  });

  // Achievements
  const achievements = await loadJSON('achievements.json');
  const achievementsList = document.getElementById('achievementsList');
  if(achievementsList){
    (achievements || []).forEach(a => {
      const li = el('li');
      li.appendChild(el('span','entry-title', a.title));
      li.appendChild(el('span','entry-meta', a.organization || ''));
      if(a.description) li.appendChild(el('span','entry-desc', a.description));
      const pts = pointsList(a.points);
      if(pts) li.appendChild(pts);
      achievementsList.appendChild(li);
    });
  }

  // Certifications
  const certifications = await loadJSON('certifications.json');
  const certificationsList = document.getElementById('certificationsList');
  if(certificationsList){
    (certifications || []).forEach(c => {
      const li = el('li');
      if(c.link){
        const a = el('a','entry-title', c.title);
        a.href = c.link; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
      } else {
        li.appendChild(el('span','entry-title', c.title));
      }
      const meta = [c.organization, c.date].filter(Boolean).join(' — ');
      li.appendChild(el('span','entry-meta', meta));
      certificationsList.appendChild(li);
    });
  }

  // Memberships
  const memberships = await loadJSON('memberships.json');
  const membershipsList = document.getElementById('membershipsList');
  if(membershipsList){
    (memberships || []).forEach(m => {
      const li = el('li');
      if(m.link){
        const a = el('a','entry-title', [m.organization, m.role].filter(Boolean).join(' — '));
        a.href = m.link; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
      } else {
        li.appendChild(el('span','entry-title', [m.organization, m.role].filter(Boolean).join(' — ')));
      }
      li.appendChild(el('span','entry-meta', m.duration || ''));
      if(m.description) li.appendChild(el('span','entry-desc', m.description));
      membershipsList.appendChild(li);
    });
  }

  // Services
  const services = await loadJSON('services.json');
  const servicesList = document.getElementById('servicesList');
  if(servicesList){
    (services || []).forEach(s => {
      const li = el('li');
      if(s.link){
        const a = el('a','entry-title', s.title);
        a.href = s.link; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
      } else {
        li.appendChild(el('span','entry-title', s.title));
      }
      li.appendChild(el('span','entry-meta', [s.organization, s.duration].filter(Boolean).join(' — ')));
      const pts = pointsList(s.points);
      if(pts) li.appendChild(pts);
      servicesList.appendChild(li);
    });
  }

  // Media (photo slideshow)
  const photos = await loadJSON('photos/captions.json');
  const mediaContainer = document.getElementById('mediaContainer');
  if(photos && mediaContainer){
    const images = (photos || []).filter(p => p.filename && p.filename !== 'pfp.jpg');
    const slideImage = document.getElementById('slideImage');
    const slideCaption = document.getElementById('slideCaption');
    const thumbs = document.getElementById('thumbs');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const speedSelect = document.getElementById('speedSelect');
    let current = 0;
    let autoplayTimer = null;
    let isPlaying = true;
    let speed = 1.5;

    function clearAutoplay(){
      if(autoplayTimer) clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }

    function startAutoplay(){
      clearAutoplay();
      autoplayTimer = setTimeout(() => {
        showIndex(current + 1);
        if(isPlaying) startAutoplay();
      }, speed * 1000);
    }

    function togglePlayPause(){
      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
      playPauseBtn.classList.toggle('playing', isPlaying);
      if(isPlaying) startAutoplay();
      else clearAutoplay();
    }

    function showIndex(i){
      if(!images.length) return;
      current = (i + images.length) % images.length;
      const img = images[current];
      slideImage.src = 'photos/' + img.filename;
      slideImage.alt = img.caption || img.filename;
      slideCaption.innerHTML = img.caption || '';
      Array.from(thumbs.children).forEach((t, idx) => t.classList.toggle('active', idx === current));
      if(isPlaying) startAutoplay();
    }

    images.forEach((img, idx) => {
      const t = document.createElement('img');
      t.src = 'photos/' + img.filename;
      t.className = 'thumb';
      t.alt = img.caption || img.filename;
      t.addEventListener('click', () => showIndex(idx));
      thumbs.appendChild(t);
    });

    prevBtn?.addEventListener('click', () => showIndex(current - 1));
    nextBtn?.addEventListener('click', () => showIndex(current + 1));
    playPauseBtn?.addEventListener('click', togglePlayPause);
    speedSelect?.addEventListener('change', (e) => {
      speed = parseFloat(e.target.value);
      if(isPlaying) startAutoplay();
    });

    // keyboard navigation
    document.addEventListener('keydown', (e) => {
      if(e.key === 'ArrowLeft') showIndex(current - 1);
      if(e.key === 'ArrowRight') showIndex(current + 1);
      if(e.key === ' ') { e.preventDefault(); togglePlayPause(); }
    });

    playPauseBtn.classList.add('playing');
    showIndex(0);
    startAutoplay();
  }
}

init();
