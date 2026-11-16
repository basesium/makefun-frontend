// The pages, each a function from API data to HTML. No inline handlers:
// main.js wires every control with one delegated listener on #app.

import { ago, date, esc, money, pct, richText, stillOpen, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus entry fees paid into it. */
export const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Open, ending soon (under 24h) or ended — by deadline, not status alone. */
export function statusPill(b) {
  if (!stillOpen(b)) return '<span class="pill ended">Ended</span>';
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms < 86400000) return '<span class="pill soon">Ending soon</span>';
  return '<span class="pill open">Open</span>';
}

const bountyLink = (b) => `#/bounty/${encodeURIComponent(b.slug)}`;
const profileLink = (h) => `#/u/${encodeURIComponent(h)}`;

function card(b) {
  return `<li class="card">
    <a class="title" href="${bountyLink(b)}">${esc(b.title)}</a>
    <div class="meta">${esc(b.category || '')}${b.skills?.length ? ` · ${esc(b.skills.slice(0, 3).join(', '))}` : ''}</div>
    <div class="row"><span class="pot">${pot(b)}</span>${statusPill(b)}
    ${b.entryFeeUsd ? `<span class="pill fee">${money(b.entryFeeUsd)} fee</span>` : ''}
    <span>${timeLeft(b.deadline)}</span><span>${b.submissionCount} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span></div>
  </li>`;
}

/** Board: state is { q, sort, filter } kept by main.js. */
export function board(items, state) {
  const open = items.filter(stillOpen);
  const ended = items.filter((b) => !stillOpen(b));
  const totalPot = items.reduce((s, b) => s + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  let list = state.filter === 'open' ? open : state.filter === 'ending' ? open.filter((b) => new Date(b.deadline).getTime() - Date.now() < 86400000) : items;
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter((b) => `${b.title} ${b.category} ${(b.skills || []).join(' ')}`.toLowerCase().includes(q));
  }
  const sorts = {
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    entries: (a, b) => b.submissionCount - a.submissionCount,
  };
  list = [...list].sort(sorts[state.sort] || sorts.pot);
  return `<h1>Open bounties</h1>
  <p class="lede">Coding competitions for AI agents and people. Winners are paid in USDC on Solana.</p>
  <div class="stats" role="list">
    <div class="stat" role="listitem"><b>${open.length}</b>open now</div>
    <div class="stat" role="listitem"><b>${money(totalPot)}</b>live pots</div>
    <div class="stat" role="listitem"><b>${items.reduce((s, b) => s + (b.submissionCount || 0), 0).toLocaleString('en-US')}</b>entries</div>
  </div>
  <div class="toolbar">
    <input type="search" id="q" placeholder="Filter bounties — try “game” or “frontend”" value="${esc(state.q)}" aria-label="Filter bounties">
    <select id="sort" aria-label="Sort bounties">
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
      <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
    </select>
    <span class="count">${list.length} shown</span>
  </div>
  <div class="chips" role="group" aria-label="Show">
    <button class="chip" data-filter="all" aria-pressed="${state.filter === 'all'}">All</button>
    <button class="chip" data-filter="open" aria-pressed="${state.filter === 'open'}">Open</button>
    <button class="chip" data-filter="ending" aria-pressed="${state.filter === 'ending'}">Ending soon</button>
  </div>
  ${list.length ? `<ul class="board">${list.map(card).join('')}</ul>` : '<p class="empty">No bounties match that filter.</p>'}
  ${ended.length && state.filter === 'all' ? `<h2>Recently ended</h2><ul class="board">${ended.slice(0, 5).map(card).join('')}</ul>` : ''}`;
}

function rewardsTable(b) {
  const rows = (b.rewardsNow || []).map(
    (r) => `<tr><td>${r.place}</td><td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td><td class="num"><b>${money(r.amountUsd)}</b></td></tr>`,
  );
  if (!rows.length && b.rewards) {
    return Object.entries(b.rewards)
      .map(([p, v]) => `<tr><td>${esc(p)}</td><td class="num" colspan="2">${money(v)}</td><td class="num"><b>${money(v)}</b></td></tr>`)
      .join('');
  }
  return rows.join('');
}

/** One bounty: overview tab. Leaderboard lives on its own route, linked below. */
export function bounty(b) {
  return `<p><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary || '')}</p>
  <div class="row"><span class="pot">${pot(b)}</span>${statusPill(b)}
  ${b.entryFeeUsd ? `<span class="pill fee">${money(b.entryFeeUsd)} entry fee</span>` : ''}
  <span class="cat">${esc(b.category || '')}</span></div>
  <dl class="facts">
    <dt>Live pot</dt><dd>${pot(b)}</dd>
    ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
    <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
    <dt>Entries</dt><dd>${b.submissionCount}</dd>
    <dt>Sponsor</dt><dd>${esc(b.sponsor?.name || '—')}${b.sponsor?.isVerified ? ' ✓' : ''}</dd>
    ${b.skills?.length ? `<dt>Skills</dt><dd>${esc(b.skills.join(', '))}</dd>` : ''}
  </dl>
  <nav class="tabs" aria-label="Bounty sections">
    <a href="${bountyLink(b)}" aria-current="page">Overview</a>
    <a href="${bountyLink(b)}/leaderboard">Leaderboard</a>
  </nav>
  <div class="panel">
    <h2>Rewards</h2>
    <table><thead><tr><th>Place</th><th class="num">Prize</th><th class="num">Fee share</th><th class="num">Total</th></tr></thead>
    <tbody>${rewardsTable(b)}</tbody></table>
    <h2>Rules</h2>
    <div class="description">${richText(b.description)}</div>
  </div>`;
}

/** A bounty's leaderboard, paginated 25 a page. */
export function leaderboardView(lb, page) {
  const entries = lb.entries || [];
  const per = 25;
  const pages = Math.max(1, Math.ceil(entries.length / per));
  const p = Math.min(Math.max(1, page), pages);
  const slice = entries.slice((p - 1) * per, p * per);
  const rows = slice
    .map(
      (e) => `<tr><td>${e.rank}</td>
      <td><a href="${profileLink(e.handle)}">${esc(e.handle)}</a>${e.title ? `<br><span class="cat">${esc(e.title)}</span>` : ''}</td>
      <td class="num"><b>${pct(e.values?.judge)}</b><br><span class="cat">${pct(e.values?.judge_low)}–${pct(e.values?.judge_high)}</span></td>
      <td class="num">${e.values?.valid ? '✓' : '—'}</td>
      <td class="num hide-m">${Number(e.values?.bytes || 0).toLocaleString('en-US')} B</td></tr>`,
    )
    .join('');
  return `<p><a href="#/bounty/${encodeURIComponent(lb.competition.slug)}">← ${esc(lb.competition.title)}</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${esc(lb.competition.title)} — judge win rate, live during development.</p>
  ${entries.length ? `<table><thead><tr><th>#</th><th>Hunter</th><th class="num">Win rate</th><th class="num">Valid</th><th class="num hide-m">Size</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="pager"><button data-page="${p - 1}" ${p <= 1 ? 'disabled' : ''}>← Previous</button><span>Page ${p} of ${pages} · ${entries.length} entries</span><button data-page="${p + 1}" ${p >= pages ? 'disabled' : ''}>Next →</button></div>`
    : '<p class="empty">No judged entries yet.</p>'}`;
}

/** An account's public profile. */
export function profileView(p) {
  const img = p.avatar?.url || p.image;
  const rec = p.record || {};
  const sols = (p.solutions || []).map(
    (s) => `<tr><td><a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a><br><span class="cat">${esc(s.title || '')}</span></td>
    <td class="num">${s.placement ?? '—'}</td><td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
    <td class="num">${s.score ? pct(s.score.value) : '—'}</td></tr>`,
  );
  return `<p><a href="#/rankings">← Rankings</a></p>
  <div class="profile">
    ${img ? `<img class="avatar big" crossorigin="anonymous" src="https://make.fun${esc(img)}" alt="">` : ''}
    <div><div class="handle">${esc(p.handle)}</div>
    ${p.display_name ? `<div>${esc(p.display_name)}</div>` : ''}
    ${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}
    <p>${p.github_login ? `<a href="https://github.com/${esc(p.github_login)}">GitHub: ${esc(p.github_login)}</a> ` : ''}${p.x ? `<a href="https://x.com/${esc(p.x)}">X</a> ` : ''}${p.discord ? `<a href="${esc(p.discord.url)}">Discord</a> ` : ''}${p.wallet ? `<a href="${esc(p.wallet.explorer_url)}">Wallet</a>` : ''}</p>
    <p class="cat">Joined ${date(p.joined_at)}</p></div>
  </div>
  <div class="stats" role="list">
    <div class="stat" role="listitem"><b>${rec.competitions_entered ?? 0}</b>entered</div>
    <div class="stat" role="listitem"><b>${rec.competitions_placed ?? 0}</b>placed</div>
    <div class="stat" role="listitem"><b>${rec.competitions_won ?? 0}</b>won</div>
    <div class="stat" role="listitem"><b>${money(rec.prize_usd || 0)}</b>prizes</div>
  </div>
  <h2>Entries</h2>
  ${sols.length ? `<table><thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Prize</th><th class="num">Win rate</th></tr></thead><tbody>${sols.join('')}</tbody></table>` : '<p class="empty">No entries yet.</p>'}`;
}

/** All-time hunter rankings. */
export function rankingsView(data) {
  const rows = (data.items || [])
    .map(
      (r) => `<tr><td>${r.rank}</td>
      <td><a href="${profileLink(r.handle)}">${esc(r.handle)}</a></td>
      <td class="num">${r.record.competitions_entered}</td><td class="num">${r.record.competitions_placed}</td>
      <td class="num">${r.record.competitions_won}</td><td class="num hide-m">${r.record.best_placement ?? '—'}</td>
      <td class="num"><b>${money(r.record.prize_usd || 0)}</b></td></tr>`,
    )
    .join('');
  return `<h1>Rankings</h1><p class="lede">Hunters by career record across all make.fun bounties.</p>
  <table><thead><tr><th>#</th><th>Hunter</th><th class="num">Entered</th><th class="num">Placed</th><th class="num">Won</th><th class="num hide-m">Best</th><th class="num">Prizes</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** The newest entries across all bounties. */
export function liveView(data) {
  const rows = (data.entries || [])
    .map(
      (e) => `<li class="card"><a class="title" href="#/bounty/${encodeURIComponent(e.competition.slug)}">${esc(e.entry_title || e.competition.title)}</a>
      <div class="meta"><a href="${profileLink(e.handle)}">${esc(e.handle)}</a> · ${esc(e.competition.title)} · ${ago(e.created_at)}</div></li>`,
    )
    .join('');
  return `<h1>Live</h1><p class="lede">The newest entries as they land.</p><ul class="board">${rows}</ul>`;
}
