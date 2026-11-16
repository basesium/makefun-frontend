// Router for the four surfaces, on hash routes:
//
//   #/                          the bounty board
//   #/bounty/<slug>             one bounty (overview)
//   #/bounty/<slug>/leaderboard its leaderboard
//   #/u/<handle>                an account's public profile
//   #/rankings                  all-time hunter rankings
//   #/live                      the newest entries
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLatestEntries, getLeaderboard, getProfile, getRankings } from './api.js';
import { board, bounty, leaderboardView, liveView, profileView, rankingsView } from './views.js';

const app = document.getElementById('app');
const boardState = { q: '', sort: 'pot', filter: 'all' };
let boardData = null;
let run = 0;

function nav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.nav === route ? 'page' : 'false');
    if (a.dataset.nav !== route) a.removeAttribute('aria-current');
  });
}

function show(html, title) {
  app.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function fail(err) {
  app.innerHTML = `<div class="error"><h1>Something went wrong</h1><p>${err.message}. The make.fun API may be down — <a href="#/">try the board again</a>.</p></div>`;
  document.title = 'Error | make.fun bounties';
  window.__shotReady = true;
}

function renderBoard() {
  show(board(boardData.items || [], boardState), 'make.fun bounties — fast board');
  const q = document.getElementById('q');
  if (q) {
    q.value = boardState.q;
    q.addEventListener('input', () => {
      boardState.q = q.value;
      const pos = q.selectionStart;
      renderBoard();
      const next = document.getElementById('q');
      next.focus();
      next.setSelectionRange(pos, pos);
    });
  }
  const sort = document.getElementById('sort');
  if (sort) sort.addEventListener('change', () => {
    boardState.sort = sort.value;
    renderBoard();
  });
}

async function render() {
  const myRun = ++run;
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const [, kind, a, b] = hash.split('/');
  try {
    if (kind === 'bounty' && a && b === 'leaderboard') {
      nav('board');
      const lb = await getLeaderboard(decodeURIComponent(a));
      if (myRun !== run) return;
      show(leaderboardView(lb, 1), `Leaderboard — ${lb.competition.title} | make.fun bounties`);
    } else if (kind === 'bounty' && a) {
      nav('board');
      const bountyData = await getBounty(decodeURIComponent(a));
      if (myRun !== run) return;
      show(bounty(bountyData), `${bountyData.title} | make.fun bounties`);
    } else if (kind === 'u' && a) {
      nav('rankings');
      const profile = await getProfile(decodeURIComponent(a));
      if (myRun !== run) return;
      show(profileView(profile), `${profile.handle} | make.fun bounties`);
    } else if (kind === 'rankings') {
      nav('rankings');
      const data = await getRankings();
      if (myRun !== run) return;
      show(rankingsView(data), 'Rankings | make.fun bounties');
    } else if (kind === 'live') {
      nav('live');
      const data = await getLatestEntries();
      if (myRun !== run) return;
      show(liveView(data), 'Live entries | make.fun bounties');
    } else {
      nav('board');
      if (!boardData) boardData = await getBounties();
      if (myRun !== run) return;
      renderBoard();
    }
  } catch (err) {
    if (myRun === run) fail(err);
  }
}

// One delegated listener: board chips and leaderboard pager.
app.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-filter]');
  if (chip) {
    boardState.filter = chip.dataset.filter;
    renderBoard();
    return;
  }
  const page = event.target.closest('[data-page]');
  if (page && !page.disabled) {
    const hash = location.hash;
    const slug = hash.split('/')[2];
    const myRun = ++run;
    window.__shotReady = false;
    getLeaderboard(decodeURIComponent(slug))
      .then((lb) => {
        if (myRun !== run) return;
        show(leaderboardView(lb, Number(page.dataset.page)), `Leaderboard — ${lb.competition.title} | make.fun bounties`);
      })
      .catch(fail);
  }
});

window.addEventListener('hashchange', render);
render();
