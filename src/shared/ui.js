export function card(title, body, actions = '') {
  return `
    <section class="ui-card">
      ${title ? `<header class="ui-card__header"><h2 class="ui-title">${title}</h2></header>` : ''}
      <div class="ui-card__body">${body}</div>
      ${actions ? `<footer class="ui-card__footer">${actions}</footer>` : ''}
    </section>`;
}

export function badge(text, tone = 'neutral') {
  return `<span class="ui-badge ui-badge--${tone}">${text}</span>`;
}

export function sectionTitle(title, sub = '') {
  return `
    <div class="ui-section-head">
      <div>
        <h2 class="ui-title">${title}</h2>
        ${sub ? `<p class="ui-subtitle">${sub}</p>` : ''}
      </div>
    </div>`;
}

export function statCard(label, value, sub = '') {
  return `
    <div class="ui-stat">
      <div class="ui-stat__value">${value}</div>
      <div class="ui-stat__label">${label}</div>
      ${sub ? `<div class="ui-stat__sub">${sub}</div>` : ''}
    </div>`;
}

export function emptyState(title, message, actions = '') {
  return `
    <div class="ui-empty">
      <h3>${title}</h3>
      <p>${message}</p>
      ${actions ? `<div class="btn-row" style="justify-content:center;margin-top:14px;">${actions}</div>` : ''}
    </div>`;
}

export function skeleton(lines = 3) {
  return `<div class="ui-skel">${Array.from({ length: lines }).map(() => '<div class="ui-skel__line"></div>').join('')}</div>`;
}

export function progressRing(percent) {
  const p = Math.max(0, Math.min(100, percent));
  return `
    <div class="ui-ring" style="--p:${p};">
      <div class="ui-ring__inner">${p}%</div>
    </div>`;
}

export function searchFilterBar({ searchId, filterId, searchPlaceholder = 'Search', filterOptions = [] }) {
  return `
    <div class="ui-controls">
      <input id="${searchId}" class="ui-input" type="search" placeholder="${searchPlaceholder}">
      <select id="${filterId}" class="ui-input">
        ${filterOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
      </select>
    </div>`;
}

export function dialog(title, body, actions = '') {
  return `
    <div class="ui-dialog">
      <div class="ui-dialog__panel">
        <h2 class="ui-title">${title}</h2>
        <div class="ui-dialog__body">${body}</div>
        ${actions ? `<div class="ui-dialog__actions">${actions}</div>` : ''}
      </div>
    </div>`;
}
