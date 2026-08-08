// Simple line icons used for "coming soon" cards that have no image yet.
const ICONS = {
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="13" height="10"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c0-1-1-1.8-2.5-1.8S9.5 8.5 9.5 9.5c0 2 5 1.3 5 3.5 0 1-1.1 1.8-2.5 1.8S9.3 14 9.3 13"/><path d="M12 6.3v1.1M12 16.6v1.1"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6"/><circle cx="18" cy="9" r="2.4"/><path d="M22 20c0-2.6-1.8-4.7-4-5.4"/></svg>',
};
const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>';

// Escapes real code before it goes into innerHTML, so characters like
// < > & in the actual Python (comparisons, dict access, etc.) render as
// text instead of being parsed as HTML.
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- project cards ----------
function cardHTML(p, i) {
  const cover = p.image
    ? `<div class="cover" style="background-image:url('${p.image}')"></div>`
    : `<div class="cover"><div class="icon-wrap">${ICONS[p.icon] || ICONS.chart}</div></div>`;

  const footer = p.status === 'live'
    ? `<span class="view-link">View project details &rarr;</span>`
    : `<span class="badge">Coming soon</span>`;

  return `
    <div class="card ${p.status === 'soon' ? 'soon' : ''}" data-index="${i}" tabindex="0" role="button" aria-label="View ${p.title}">
      ${cover}
      <div class="body">
        <div class="tag">${p.tag}</div>
        <h3>${p.title}</h3>
        <p class="desc">${p.description}</p>
        ${footer}
      </div>
    </div>`;
}

document.getElementById('project-grid').innerHTML = projects.map(cardHTML).join('');

// --- Cards gently fade + rise into place as you scroll to them (staggered) ---
const cardEls = document.querySelectorAll('#project-grid .card');
cardEls.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`; });

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
cardEls.forEach(el => cardObserver.observe(el));

// Tapping / clicking / keyboard-activating a card opens its detail popup.
document.getElementById('project-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  openProjectModal(projects[parseInt(card.dataset.index, 10)]);
});
document.getElementById('project-grid').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  openProjectModal(projects[parseInt(card.dataset.index, 10)]);
});

// ---------- overall portfolio stats strip ----------
const liveCount = projects.filter(p => p.status === 'live').length;
const statsToRender = [
  { target: liveCount, label: `of ${projects.length} projects live` },
  ...portfolioStats
];
document.getElementById('stats-strip').innerHTML = statsToRender
  .map(s => `<div class="stat"><div class="num" data-target="${s.target}">0</div><div class="label">${s.label}</div></div>`)
  .join('');

// --- Small animated stat counters (count up once, when scrolled into view) ---
function animateCount(el) {
  const target = parseFloat(el.dataset.target);
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(decimals);
  }
  requestAnimationFrame(tick);
}

const counters = document.querySelectorAll('.stats-strip .num[data-target]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });
counters.forEach(c => observer.observe(c));

// ---------- bio ----------
document.getElementById('bio-role').textContent = bio.role;
document.getElementById('bio-text').innerHTML = bio.paragraphs.map(p => `<p>${p}</p>`).join('');

// ---------- skill picker: pick a skill, see where it's used (projects / experience) ----------
const skillPicker = document.getElementById('skill-picker');
const skillPickerToggle = document.getElementById('skill-picker-toggle');
const skillPickerLabel = document.getElementById('skill-picker-label');
const skillPickerMenu = document.getElementById('skill-picker-menu');
const skillResults = document.getElementById('skill-results');
const skillResultsSkill = document.getElementById('skill-results-skill');
const skillTabProjects = document.getElementById('skill-tab-projects');
const skillTabExperience = document.getElementById('skill-tab-experience');
const tabCountProjects = document.getElementById('tab-count-projects');
const tabCountExperience = document.getElementById('tab-count-experience');

skillPickerMenu.innerHTML = bio.skills
  .map(s => `<li role="option"><button type="button" class="skill-option" data-skill="${s}">${s}</button></li>`)
  .join('');

function skillMatches(item, skill) {
  return (item.skills || []).some(s => s.toLowerCase() === skill.toLowerCase());
}

function openSkillMenu() {
  skillPicker.classList.add('open');
  skillPickerToggle.setAttribute('aria-expanded', 'true');
}
function closeSkillMenu() {
  skillPicker.classList.remove('open');
  skillPickerToggle.setAttribute('aria-expanded', 'false');
}

skillPickerToggle.addEventListener('click', () => {
  skillPicker.classList.contains('open') ? closeSkillMenu() : openSkillMenu();
});
document.addEventListener('click', (e) => {
  if (!skillPicker.contains(e.target)) closeSkillMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSkillMenu();
});

function selectSkill(skill) {
  closeSkillMenu();
  skillPickerLabel.textContent = skill;

  const liveMatches = projects.filter(p => p.status === 'live' && skillMatches(p, skill));
  const inExperience = skillMatches(experience, skill);

  skillResultsSkill.textContent = skill;
  tabCountProjects.textContent = liveMatches.length;
  tabCountExperience.textContent = inExperience ? 1 : 0;

  skillTabProjects.innerHTML = liveMatches.length
    ? `<ul class="skill-match-list">${liveMatches.map(p =>
        `<li><button type="button" class="skill-match-link" data-index="${projects.indexOf(p)}">${p.title} &rarr;</button></li>`
      ).join('')}</ul>`
    : `<p class="skill-empty">No live project uses ${skill} yet, that skill is lined up for an upcoming project.</p>`;

  skillTabExperience.innerHTML = inExperience
    ? `<p class="skill-empty">Yes, this shows up in the internship story below.</p>
       <button type="button" class="skill-match-link skill-exp-link">${experience.title} &rarr;</button>`
    : `<p class="skill-empty">Not part of the Experience story yet.</p>`;

  // reset to the Projects tab each time a new skill is picked
  document.querySelectorAll('.skill-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'projects'));
  skillTabProjects.hidden = false;
  skillTabExperience.hidden = true;

  skillResults.hidden = false;
}

skillPickerMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.skill-option');
  if (!btn) return;
  selectSkill(btn.dataset.skill);
});

document.getElementById('skill-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.skill-tab');
  if (!btn) return;
  document.querySelectorAll('.skill-tab').forEach(t => t.classList.toggle('active', t === btn));
  skillTabProjects.hidden = btn.dataset.tab !== 'projects';
  skillTabExperience.hidden = btn.dataset.tab !== 'experience';
});

skillResults.addEventListener('click', (e) => {
  const projBtn = e.target.closest('.skill-match-link[data-index]');
  if (projBtn) { openProjectModal(projects[parseInt(projBtn.dataset.index, 10)]); return; }
  const expBtn = e.target.closest('.skill-exp-link');
  if (expBtn) { openModalWithHTML(experienceModalHTML()); }
});

document.getElementById('skill-clear').addEventListener('click', () => {
  skillPickerLabel.textContent = "Select a skill to see where it's used";
  skillResults.hidden = true;
});

// ---------- section tabs: jump straight to Projects or Experience ----------
document.getElementById('section-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.section-tab');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.target);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- experience ----------
// Rendered as a single card, styled just like a project card (same markup,
// an orange accent instead of blue) so it doesn't read as a separate
// promo banner. The card face stays general ("UWA Internship"); opening it
// is what reveals which centre it was actually through.
document.getElementById('experience-grid').innerHTML = `
  <div class="card card-experience" id="experience-card" tabindex="0" role="button" aria-label="View ${experience.cardTitle}">
    <div class="cover" style="background-image:url('${experience.cardImage}')"></div>
    <div class="body">
      <div class="tag">${experience.cardTag}</div>
      <h3>${experience.cardTitle}</h3>
      <p class="desc">${experience.cardDescription}</p>
      <span class="view-link">View experience details &rarr;</span>
    </div>
  </div>
`;
const experienceCard = document.getElementById('experience-card');
experienceCard.addEventListener('click', () => openModalWithHTML(experienceModalHTML()));
experienceCard.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  openModalWithHTML(experienceModalHTML());
});
const expCardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      expCardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
expCardObserver.observe(experienceCard);

function expImagesHTML(images) {
  if (!images || !images.length) return '';
  const many = images.length > 1 ? 'exp-shot-grid' : 'exp-shot-single';
  return `<div class="${many}">${images.map(img => `
    <figure class="exp-shot">
      <img src="${img.src}" alt="${img.caption || ''}" loading="lazy">
      ${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}
    </figure>
  `).join('')}</div>`;
}

function experienceModalHTML() {
  const storySections = experience.story.map(s => `
    <section class="modal-section exp-story-section">
      <h3>${s.heading}</h3>
      ${s.paragraphs.map(p => `<p>${p}</p>`).join('')}
      ${expImagesHTML(s.images)}
    </section>
  `).join('');

  const skillsSection = `
    <section class="modal-section">
      <h3>Skills this project called on</h3>
      <div class="exp-skills-grid">
        <div>
          <h4 class="exp-skills-subhead">Hard skills</h4>
          <ul class="exp-skills-list">${experience.hardSkills.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div>
          <h4 class="exp-skills-subhead">Soft skills</h4>
          <ul class="exp-skills-list">${experience.softSkills.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    </section>
  `;

  const metricsSection = experience.metrics && experience.metrics.length
    ? `<div class="modal-metrics">${experience.metrics.map(m =>
        `<div class="mstat"><div class="mnum" data-target="${m.value}">0</div><div class="mlabel">${m.label}</div></div>`
      ).join('')}</div>`
    : '';

  return `
    <div class="modal-tag">${experience.eyebrow}</div>
    <h2>${experience.title}</h2>
    <p class="modal-lead">${experience.teaser}</p>
    ${metricsSection}
    ${storySections}
    ${skillsSection}
  `;
}

// ---------- recommendations ----------
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

function recCardHTML(r, i) {
  const fullParagraphs = r.full.split('\n\n').map(p => `<p>${p}</p>`).join('');
  return `
    <div class="rec-card" data-index="${i}">
      <div class="rec-head">
        <img class="rec-photo" src="${r.photo}" alt="${r.name}">
        <div>
          <div class="rec-name">${r.name}</div>
          <div class="rec-title">${r.title}</div>
        </div>
      </div>
      <p class="rec-quote">${r.quote}</p>
      <div class="rec-full">${fullParagraphs}</div>
      <button class="rec-toggle" type="button">
        <span class="rec-toggle-label">Read full recommendation</span>
        ${CHEVRON_ICON}
      </button>
    </div>`;
}

document.getElementById('rec-grid').innerHTML = recommendations.map(recCardHTML).join('');

const recEls = document.querySelectorAll('#rec-grid .rec-card');
recEls.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 5) * 80}ms`; });
const recObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      recObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
recEls.forEach(el => recObserver.observe(el));

document.getElementById('rec-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.rec-toggle');
  if (!btn) return;
  const card = btn.closest('.rec-card');
  const expanded = card.classList.toggle('expanded');
  btn.querySelector('.rec-toggle-label').textContent = expanded ? 'Show less' : 'Read full recommendation';
});

// --- About section, bio and footer fade in gently once scrolled into view ---
const softReveal = document.querySelectorAll('section.about, footer, .bio-inner');
const softObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      softObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
softReveal.forEach(el => softObserver.observe(el));

// --- Thin progress bar across the top, filling as you scroll down the page ---
const progressBar = document.getElementById('scroll-progress');
function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

// ============================================================
//  PROJECT DETAIL POPUP
// ============================================================
const modalOverlay = document.getElementById('modal-overlay');
const modalPanel = document.getElementById('modal-panel');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function soonModalHTML(p) {
  return `
    <div class="modal-tag">${p.tag}</div>
    <h2>${p.title}</h2>
    <p class="modal-lead">${p.description}</p>
    <div class="modal-soon-banner">This project is coming soon. Check back for the full write-up, notebook and dashboard.</div>
  `;
}

function liveModalHTML(p) {
  const d = p.detail || {};
  const parts = [];

  parts.push(`<div class="modal-tag">${p.tag}</div>`);
  parts.push(`<h2>${p.title}</h2>`);
  parts.push(`<p class="modal-lead">${p.description}</p>`);

  if (p.metrics && p.metrics.length) {
    parts.push(`<div class="modal-metrics">${p.metrics.map(m =>
      `<div class="mstat"><div class="mnum" data-target="${m.value}">0</div><div class="mlabel">${m.label}</div></div>`
    ).join('')}</div>`);
  }

  if (d.tags && d.tags.length) {
    parts.push(`<div class="modal-chips">${d.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div>`);
  }

  const downloads = [];
  if (d.caseStudyHref) downloads.push(`<a class="dl-primary" href="${d.caseStudyHref}" download>${DOWNLOAD_ICON} Download Case Study (.docx)</a>`);
  if (d.notebookHref) downloads.push(`<a class="dl-secondary" href="${d.notebookHref}" download>${DOWNLOAD_ICON} Notebook (.ipynb)</a>`);
  if (d.mapHref) downloads.push(`<a class="dl-secondary" href="${d.mapHref}" target="_blank" rel="noopener">Open Map Full Screen &#8599;</a>`);
  if (downloads.length) parts.push(`<div class="modal-downloads">${downloads.join('')}</div>`);

  if (d.methodSummary) {
    parts.push(`<section class="modal-section"><h3>Method, in one paragraph</h3><p>${d.methodSummary}</p></section>`);
  }

  if (d.codeWalkthrough && d.codeWalkthrough.length) {
    const steps = d.codeWalkthrough.map((step, i) => `
      <div class="code-step">
        <div class="code-step-head">
          <span class="code-step-num">${i + 1}</span>
          <h4>${step.title}</h4>
        </div>
        ${step.note ? `<p class="code-step-note">${step.note}</p>` : ''}
        <pre class="code-block"><code class="language-python">${escapeHTML(step.code)}</code></pre>
      </div>
    `).join('');
    parts.push(`
      <section class="modal-section">
        <h3>Code walkthrough</h3>
        <p class="modal-caption">Real code from the project notebook, the actual steps that produced the result above, not a summary of it.</p>
        <div class="code-walkthrough">${steps}</div>
      </section>
    `);
  }

  if (d.mapHref) {
    const legend = (d.legend || []).map(l =>
      `<span><span class="dot" style="background:${l.color};${l.square ? 'border-radius:2px;' : ''}"></span>${l.label}</span>`
    ).join('');
    parts.push(`
      <section class="modal-section">
        <h3>Interactive map</h3>
        <iframe class="modal-map" src="${d.mapHref}" loading="lazy"></iframe>
        ${legend ? `<div class="modal-legend">${legend}</div>` : ''}
      </section>
    `);
  }

  if (d.chartImage) {
    parts.push(`
      <section class="modal-section">
        <h3>Budget vs. coverage trade-off</h3>
        <img class="modal-chart" src="${d.chartImage}" alt="Budget sensitivity chart">
        ${d.chartCaption ? `<p class="modal-caption">${d.chartCaption}</p>` : ''}
      </section>
    `);
  }

  if (d.siteTables && d.siteTables.length) {
    const blocks = d.siteTables.map(t => `
      <div class="mtable-block">
        <div class="mtable-badge">${t.badge}</div>
        <h4>${t.heading}</h4>
        <table class="mtable">
          <tr><th>Community</th><th>Population</th><th>Distance (km)</th></tr>
          ${t.rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
        </table>
      </div>
    `).join('');
    parts.push(`<section class="modal-section"><h3>Recommended sites</h3><div class="modal-tables">${blocks}</div></section>`);
  }

  if (d.dataSources && d.dataSources.length) {
    parts.push(`
      <section class="modal-section">
        <h3>Data sources</h3>
        <ul class="modal-sources">${d.dataSources.map(s => `<li>${s}</li>`).join('')}</ul>
      </section>
    `);
  }

  return parts.join('');
}

// Shared by every modal (project popups and the experience popup): drop
// in the HTML, open the overlay, and run the same finishing touches
// (counters, syntax highlighting) so nothing has to duplicate this.
function openModalWithHTML(html) {
  modalBody.innerHTML = html;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalPanel.scrollTop = 0;

  // Animate the in-popup metric counters right away (the popup is
  // already visible the moment it opens, so no need to wait for scroll).
  modalBody.querySelectorAll('.mnum[data-target]').forEach(animateCount);

  // Syntax-highlight any code walkthrough blocks just inserted. highlight.js
  // only scans the page once on load by default, so newly-injected modal
  // content needs to be highlighted by hand each time a popup opens.
  if (window.hljs) {
    modalBody.querySelectorAll('pre code').forEach(block => window.hljs.highlightElement(block));
  }
}

function openProjectModal(p) {
  openModalWithHTML(p.status === 'live' ? liveModalHTML(p) : soonModalHTML(p));
}

function closeProjectModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeProjectModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeProjectModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeProjectModal();
});
