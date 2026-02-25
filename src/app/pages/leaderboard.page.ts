/**
 * LeaderboardPage — Ranking table, podium, stats dashboard, recent matches.
 *
 * Route: /#/ (default, public)
 *
 * Ports business logic from ranking.view.ts with new Figma-style design.
 */

import { expectedScore, getMatchPlayerElo } from '@/services/elo.service';
import { getAllMatches } from '@/services/match.service';
import { getAllPlayers, getBonusK, getPlayerById, getRank } from '@/services/player.service';
import { fetchRunningMatch } from '@/services/repository.service';
import { formatDate } from '@/utils/format-date.util';
import { getClassName } from '@/utils/get-class-name.util';
import { getDisplayElo } from '@/utils/get-display-elo.util';
import gsap from 'gsap';
import { Component } from '../components/component.base';
import { getInitials, renderPlayerAvatar } from '../components/player-avatar.component';
import { refreshIcons } from '../icons';

import type { IPlayer } from '@/models/player.interface';

const CLASS_COLORS: Record<number, string> = {
  0: '#FFD700',
  1: '#4A90D9',
  2: '#27AE60',
  3: '#C0C0C0',
  4: '#8B7D6B',
};

type SortKey = 'rank' | 'name' | 'elo' | 'matches' | 'winrate' | 'goaldiff' | 'form';

const RECENT_MATCHES_COUNT = 30;

class LeaderboardPage extends Component {
  private sortKey: SortKey = 'rank';
  private sortAsc = false;
  private searchQuery = '';

  async render(): Promise<string> {
    return `
      <div class="space-y-5 md:space-y-6" id="leaderboard-page">
        ${this.renderPageHeader()}
        ${this.renderStatsCards()}
        ${await this.renderLiveMatch()}
        ${this.renderSearchBar()}
        ${this.renderPodium()}
        ${this.renderRankingTable()}
        ${this.renderRecentMatches()}
      </div>
    `;
  }

  mount(): void {
    refreshIcons();

    // Bind search
    const searchInput = this.$id('leaderboard-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.refreshTable();
    });

    // Bind sortable headers
    const headers = this.$$('.sort-header');
    for (const th of headers) {
      th.addEventListener('click', () => {
        const key = (th as HTMLElement).dataset.sortKey as SortKey;
        if (!key) return;
        if (this.sortKey === key) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortKey = key;
          this.sortAsc = false;
        }
        this.refreshTable();
        this.updateSortIndicators();
      });
    }
    this.updateSortIndicators();

    // GSAP animations
    gsap.from('.podium-card', { opacity: 0, scale: 0.9, stagger: 0.1, duration: 0.4, ease: 'back.out(1.4)' });
    gsap.from('.stat-card-new', { opacity: 0, y: 15, stagger: 0.08, duration: 0.3, ease: 'power2.out', delay: 0.1 });
    gsap.from('.ranking-row', { opacity: 0, x: -10, stagger: 0.03, duration: 0.25, ease: 'power2.out', delay: 0.3 });
    gsap.from('.match-row', { opacity: 0, x: -10, stagger: 0.03, duration: 0.25, ease: 'power2.out', delay: 0.4 });
  }

  destroy(): void { }

  // ── Helpers ───────────────────────────────────────────────

  private getAllRankedPlayers(): IPlayer[] {
    return getAllPlayers().filter(p => p.matches > 0);
  }

  private getSortedPlayers(): IPlayer[] {
    const players = [...this.getAllRankedPlayers()];
    const todayDeltas = this.getTodayEloDeltas();

    // Filter by search
    const filtered = this.searchQuery
      ? players.filter(p => p.name.toLowerCase().includes(this.searchQuery))
      : players;

    const { sortKey, sortAsc } = this;
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank': cmp = getRank(a.id) - getRank(b.id); break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'elo': cmp = b.elo - a.elo; break;
        case 'matches': cmp = b.matches - a.matches; break;
        case 'winrate': {
          const aR = a.matches > 0 ? (a.wins || 0) / a.matches : 0;
          const bR = b.matches > 0 ? (b.wins || 0) / b.matches : 0;
          cmp = bR - aR;
          break;
        }
        case 'goaldiff': {
          const aRat = (a.goalsAgainst || 0) > 0 ? (a.goalsFor || 0) / a.goalsAgainst : ((a.goalsFor || 0) > 0 ? Infinity : 0);
          const bRat = (b.goalsAgainst || 0) > 0 ? (b.goalsFor || 0) / b.goalsAgainst : ((b.goalsFor || 0) > 0 ? Infinity : 0);
          cmp = bRat - aRat;
          break;
        }
        case 'form': {
          const aD = (a.matchesDelta || []).slice(-5).reduce((s, d) => s + d, 0);
          const bD = (b.matchesDelta || []).slice(-5).reduce((s, d) => s + d, 0);
          cmp = bD - aD;
          break;
        }
      }
      return sortAsc ? -cmp : cmp;
    });

    return filtered;
  }

  private getTodayEloDeltas(): Map<number, { delta: number; matches: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deltas = new Map<number, { delta: number; matches: number }>();
    const playerMatchCounts = new Map<number, number>();

    const addDelta = (playerId: number, delta: number): void => {
      if (!Number.isFinite(delta)) return;
      const matchesPlayed = playerMatchCounts.get(playerId) ?? 0;
      const bonusMultiplier = getBonusK(matchesPlayed);
      const adjustedDelta = delta * bonusMultiplier;
      const entry = deltas.get(playerId) ?? { delta: 0, matches: 0 };
      entry.delta += adjustedDelta;
      entry.matches += 1;
      deltas.set(playerId, entry);
      playerMatchCounts.set(playerId, matchesPlayed + 1);
    };

    const allMatches = getAllMatches().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const match of allMatches) {
      const matchDate = new Date(match.createdAt);
      matchDate.setHours(0, 0, 0, 0);
      if (matchDate.getTime() === today.getTime()) {
        addDelta(match.teamA.defence, match.deltaELO[0]);
        addDelta(match.teamA.attack, match.deltaELO[0]);
        addDelta(match.teamB.defence, match.deltaELO[1]);
        addDelta(match.teamB.attack, match.deltaELO[1]);
      } else {
        for (const pid of [match.teamA.defence, match.teamA.attack, match.teamB.defence, match.teamB.attack]) {
          playerMatchCounts.set(pid, (playerMatchCounts.get(pid) ?? 0) + 1);
        }
      }
    }
    return deltas;
  }

  // ── Section Renderers ──────────────────────────────────────

  private renderPageHeader(): string {
    return `
      <div class="flex items-center gap-3">
        <i data-lucide="trophy" class="text-[var(--color-gold)]"
           style="width:26px;height:26px"></i>
        <div>
          <h1 class="text-white font-display"
              style="font-size:clamp(28px,6vw,42px); letter-spacing:0.12em; line-height:1">
            CLASSIFICA
          </h1>
          <p class="font-ui"
             style="font-size:12px; color:rgba(255,255,255,0.5); letter-spacing:0.1em">
            RANKING ELO BILIARDINO
          </p>
        </div>
      </div>
    `;
  }

  private renderStatsCards(): string {
    const allMatches = getAllMatches();
    const allPlayers = getAllPlayers();
    const totalMatches = allMatches.length;
    const totalGoals = allMatches.reduce((s, m) => s + m.score[0] + m.score[1], 0);

    // Max ELO
    let maxEloPlayer: IPlayer | null = null;
    let maxElo = 0;
    for (const p of allPlayers) {
      if (p.bestElo > maxElo) { maxElo = p.bestElo; maxEloPlayer = p; }
    }

    // Best pair
    let bestPair = { p1: '', p2: '', delta: -Infinity };
    let worstPair = { p1: '', p2: '', delta: Infinity };
    for (const p of allPlayers) {
      if (!p.teammatesDelta) continue;
      for (const [tid, d] of p.teammatesDelta) {
        const t = getPlayerById(tid);
        if (!t) continue;
        if (d > bestPair.delta) bestPair = { p1: p.name, p2: t.name, delta: d };
        if (d < worstPair.delta) worstPair = { p1: p.name, p2: t.name, delta: d };
      }
    }

    return `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div class="stat-card-new glass-card rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="activity" style="width:14px;height:14px;color:var(--color-gold)"></i>
            <span class="font-ui text-xs" style="color:rgba(255,255,255,0.5); letter-spacing:0.08em">PARTITE & GOAL</span>
          </div>
          <div class="font-display text-2xl text-white">${totalMatches}</div>
          <div class="font-body text-xs" style="color:rgba(255,255,255,0.4)">${totalGoals} goal totali</div>
        </div>

        <div class="stat-card-new glass-card rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="zap" style="width:14px;height:14px;color:var(--color-gold)"></i>
            <span class="font-ui text-xs" style="color:rgba(255,255,255,0.5); letter-spacing:0.08em">MAX ELO</span>
          </div>
          <div class="font-display text-2xl" style="color:var(--color-gold)">${maxEloPlayer ? Math.round(maxElo) : '—'}</div>
          <div class="font-body text-xs" style="color:rgba(255,255,255,0.4)">${maxEloPlayer?.name ?? '—'}</div>
        </div>

        <div class="stat-card-new glass-card rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="trending-up" style="width:14px;height:14px;color:var(--color-win)"></i>
            <span class="font-ui text-xs" style="color:rgba(255,255,255,0.5); letter-spacing:0.08em">MIGLIOR COPPIA</span>
          </div>
          ${bestPair.delta > -Infinity ? `
            <div class="font-ui text-sm text-white truncate">${bestPair.p1}</div>
            <div class="font-body text-xs" style="color:rgba(255,255,255,0.4)">${bestPair.p2}
              <span style="color:var(--color-win)"> +${Math.round(bestPair.delta)}</span>
            </div>
          ` : '<div class="font-body text-xs" style="color:rgba(255,255,255,0.3)">—</div>'}
        </div>

        <div class="stat-card-new glass-card rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="trending-down" style="width:14px;height:14px;color:var(--color-loss)"></i>
            <span class="font-ui text-xs" style="color:rgba(255,255,255,0.5); letter-spacing:0.08em">PEGGIOR COPPIA</span>
          </div>
          ${worstPair.delta < Infinity ? `
            <div class="font-ui text-sm text-white truncate">${worstPair.p1}</div>
            <div class="font-body text-xs" style="color:rgba(255,255,255,0.4)">${worstPair.p2}
              <span style="color:var(--color-loss)"> ${Math.round(worstPair.delta)}</span>
            </div>
          ` : '<div class="font-body text-xs" style="color:rgba(255,255,255,0.3)">—</div>'}
        </div>
      </div>
    `;
  }

  private async renderLiveMatch(): Promise<string> {
    try {
      const runningMatch = await fetchRunningMatch();
      if (!runningMatch) return '';

      const defA = getPlayerById(runningMatch.teamA.defence);
      const attA = getPlayerById(runningMatch.teamA.attack);
      const defB = getPlayerById(runningMatch.teamB.defence);
      const attB = getPlayerById(runningMatch.teamB.attack);
      if (!defA || !attA || !defB || !attB) return '';

      const avgEloA = Math.round((getMatchPlayerElo(defA, true) + getMatchPlayerElo(attA, false)) / 2);
      const avgEloB = Math.round((getMatchPlayerElo(defB, true) + getMatchPlayerElo(attB, false)) / 2);
      const winProbA = expectedScore(avgEloA, avgEloB);
      const winProbB = 1 - winProbA;

      const isLive = this.isLiveNow();

      const renderLivePlayer = (p: IPlayer, role: string) => {
        const color = CLASS_COLORS[p.class] ?? '#8B7D6B';
        return `
          <a href="#/profile/${p.id}" class="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1.5 transition-colors">
            ${renderPlayerAvatar({ initials: getInitials(p.name), color, size: 'sm' })}
            <div class="min-w-0">
              <div class="text-white font-ui text-xs truncate">${p.name}</div>
              <div class="font-body" style="font-size:10px; color:rgba(255,255,255,0.4)">${role} · ${Math.round(getMatchPlayerElo(p, role === 'DIF'))}</div>
            </div>
          </a>
        `;
      };

      return `
        <div class="glass-card-gold rounded-xl overflow-hidden">
          <div class="px-4 md:px-5 py-3 flex items-center gap-2"
               style="background:rgba(10,25,18,0.8); border-bottom:1px solid var(--glass-border-gold)">
            ${isLive ? '<div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>' : ''}
            <span class="font-ui" style="font-size:13px; color:var(--color-gold); letter-spacing:0.1em">
              ${isLive ? 'PARTITA IN CORSO' : 'PROSSIMA PARTITA'}
            </span>
          </div>
          <div class="p-4 md:p-5">
            <div class="flex items-center justify-between gap-4">
              <!-- Team A -->
              <div class="flex-1">
                <div class="font-ui text-xs mb-2" style="color:var(--color-team-red); letter-spacing:0.1em">TEAM ROSSO</div>
                <div class="space-y-1">
                  ${renderLivePlayer(defA, 'DIF')}
                  ${renderLivePlayer(attA, 'ATT')}
                </div>
                <div class="mt-2 font-ui text-xs" style="color:rgba(255,255,255,0.4)">
                  ELO: <span style="color:var(--color-team-red)">${avgEloA}</span>
                </div>
              </div>

              <!-- VS + Probs -->
              <div class="text-center flex-shrink-0">
                <div class="font-display text-xl mb-2" style="color:var(--color-gold)">VS</div>
                <div class="space-y-1">
                  <div class="font-display text-sm" style="color:var(--color-team-red)">${(winProbA * 100).toFixed(1)}%</div>
                  <div class="flex rounded-full overflow-hidden h-1.5 w-16">
                    <div style="width:${winProbA * 100}%; background:var(--color-team-red)"></div>
                    <div style="width:${winProbB * 100}%; background:var(--color-team-blue)"></div>
                  </div>
                  <div class="font-display text-sm" style="color:var(--color-team-blue)">${(winProbB * 100).toFixed(1)}%</div>
                </div>
              </div>

              <!-- Team B -->
              <div class="flex-1 text-right">
                <div class="font-ui text-xs mb-2" style="color:var(--color-team-blue); letter-spacing:0.1em">TEAM BLU</div>
                <div class="space-y-1">
                  ${renderLivePlayer(defB, 'DIF')}
                  ${renderLivePlayer(attB, 'ATT')}
                </div>
                <div class="mt-2 font-ui text-xs" style="color:rgba(255,255,255,0.4)">
                  ELO: <span style="color:var(--color-team-blue)">${avgEloB}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch {
      return '';
    }
  }

  private isLiveNow(): boolean {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const windows = [
      { start: 11 * 60, end: 11 * 60 + 15 },
      { start: 13 * 60, end: 14 * 60 },
      { start: 16 * 60, end: 16 * 60 + 15 },
      { start: 18 * 60, end: 20 * 60 },
    ];
    return windows.some(w => minutes >= w.start && minutes < w.end);
  }

  private renderSearchBar(): string {
    return `
      <div class="relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2"
           style="width:16px;height:16px;color:rgba(255,255,255,0.3)"></i>
        <input id="leaderboard-search" type="text" placeholder="Cerca giocatore..."
               class="w-full pl-10 pr-4 py-2.5 rounded-lg font-ui text-sm text-white placeholder:text-white/25"
               style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); outline:none" />
      </div>
    `;
  }

  private renderPodium(): string {
    const players = this.getAllRankedPlayers()
      .sort((a, b) => getRank(a.id) - getRank(b.id));

    const top3 = players.filter(p => getRank(p.id) <= 3).slice(0, 3);
    if (top3.length < 3) return '';

    const first = top3.find(p => getRank(p.id) === 1)!;
    const second = top3.find(p => getRank(p.id) === 2)!;
    const third = top3.find(p => getRank(p.id) === 3)!;

    const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

    const renderPodiumCard = (p: IPlayer, rank: number, heightClass: string) => {
      const color = CLASS_COLORS[p.class] ?? '#8B7D6B';
      const elo = getDisplayElo(p);
      const wins = p.wins || 0;
      const losses = p.matches - wins;
      const medalColor = medalColors[rank];

      return `
        <a href="#/profile/${p.id}" class="podium-card flex flex-col items-center p-4 rounded-xl transition-all hover:scale-[1.02] ${heightClass}"
           style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,215,0,${rank === 1 ? '0.3' : '0.12'})">
          <div class="relative mb-2">
            ${renderPlayerAvatar({ initials: getInitials(p.name), color, size: rank === 1 ? 'lg' : 'md' })}
            <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-display text-xs"
                 style="background:${medalColor}; color:#0F2A20">
              ${rank}
            </div>
          </div>
          <div class="text-white font-ui text-sm text-center truncate w-full">${p.name}</div>
          <div class="font-display text-xl mt-1" style="color:var(--color-gold)">${elo}</div>
          <div class="font-body text-xs mt-0.5" style="color:rgba(255,255,255,0.4)">
            ${wins}V ${losses}S
          </div>
        </a>
      `;
    };

    return `
      <div class="flex items-end justify-center gap-3 md:gap-4 px-4">
        <!-- 2nd place -->
        ${renderPodiumCard(second, 2, 'pt-6')}
        <!-- 1st place -->
        ${renderPodiumCard(first, 1, 'pt-2')}
        <!-- 3rd place -->
        ${renderPodiumCard(third, 3, 'pt-8')}
      </div>
    `;
  }

  private renderRankingTable(): string {
    const players = this.getSortedPlayers();
    const todayDeltas = this.getTodayEloDeltas();
    const selectedPlayerId = Number(localStorage.getItem('biliardino_player_id') || 0);

    const headers = [
      { key: 'rank', label: '#', mobile: true },
      { key: null, label: 'CL', mobile: false },
      { key: 'name', label: 'NOME', mobile: true },
      { key: 'elo', label: 'ELO', mobile: true },
      { key: null, label: 'RUOLO', mobile: false },
      { key: 'matches', label: 'MATCH', mobile: false },
      { key: null, label: 'V/S', mobile: false },
      { key: 'winrate', label: '%WIN', mobile: true },
      { key: 'goaldiff', label: 'GOAL', mobile: false },
      { key: 'form', label: 'FORMA', mobile: false },
    ];

    const headerHTML = headers.map(h => {
      const hiddenClass = h.mobile ? '' : 'hidden lg:table-cell';
      const sortClass = h.key ? 'sort-header cursor-pointer hover:text-[var(--color-gold)] transition-colors' : '';
      return `<th class="px-2 py-2.5 text-left font-ui text-xs ${hiddenClass} ${sortClass}"
                  style="color:rgba(255,255,255,0.5); letter-spacing:0.08em"
                  data-sort-key="${h.key || ''}">${h.label}</th>`;
    }).join('');

    const rows = players.map(p => this.renderRankingRow(p, todayDeltas, selectedPlayerId)).join('');

    return `
      <div class="glass-card rounded-xl overflow-hidden">
        <div class="px-4 md:px-5 py-3 flex items-center justify-between"
             style="background:rgba(10,25,18,0.8); border-bottom:1px solid var(--glass-border-gold)">
          <div class="flex items-center gap-2">
            <i data-lucide="trophy" style="width:14px;height:14px;color:var(--color-gold)"></i>
            <span class="font-ui" style="font-size:13px; color:var(--color-gold); letter-spacing:0.1em">
              CLASSIFICA COMPLETA
            </span>
          </div>
          <span class="font-ui" style="font-size:11px; color:rgba(255,255,255,0.4)">
            ${players.length} giocatori
          </span>
        </div>
        <div class="overflow-x-auto">
          <table id="ranking-table" class="w-full">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
                ${headerHTML}
              </tr>
            </thead>
            <tbody id="ranking-tbody">
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderRankingRow(
    player: IPlayer,
    todayDeltas: Map<number, { delta: number; matches: number }>,
    selectedPlayerId: number
  ): string {
    const rank = getRank(player.id);
    const elo = getDisplayElo(player);
    const color = CLASS_COLORS[player.class] ?? '#8B7D6B';
    const className = player.class >= 0 ? getClassName(player.class) : '';

    // Role
    let defenceValue = player.defence * 100;
    let roleLabel = 'DIF';
    let roleColor = '#3182CE';
    if (defenceValue === 50) { roleLabel = 'BAL'; roleColor = 'rgba(255,255,255,0.4)'; }
    else if (defenceValue < 50) { defenceValue = 100 - defenceValue; roleLabel = 'ATT'; roleColor = '#E53E3E'; }

    // W/L
    const wins = player.wins || 0;
    const losses = player.matches - wins;
    const winRate = player.matches > 0 ? Math.round((wins / player.matches) * 100) : 0;

    // Goal ratio
    const gf = player.goalsFor || 0;
    const ga = player.goalsAgainst || 0;
    const goalRatio = ga > 0 ? (gf / ga) : (gf > 0 ? Infinity : 0);
    let goalDisplay = '—';
    if (goalRatio === Infinity) goalDisplay = '<span style="color:var(--color-win)">∞</span>';
    else if (goalRatio > 0) {
      const r = parseFloat(goalRatio.toFixed(2));
      const gc = r <= 0.8 ? 'var(--color-loss)' : r >= 1.15 ? 'var(--color-win)' : 'rgba(255,255,255,0.6)';
      goalDisplay = `<span style="color:${gc}">${r.toFixed(2)}</span>`;
    }

    // Form (last 5)
    const last5 = (player.matchesDelta || []).slice(-5);
    const formDots = last5.slice().reverse().map(d =>
      `<div class="w-2 h-2 rounded-full" style="background:${d > 0 ? 'var(--color-win)' : 'var(--color-loss)'}"></div>`
    ).join('');
    const formDelta = last5.reduce((s, d) => s + d, 0);
    const formColor = formDelta >= 0 ? 'var(--color-win)' : 'var(--color-loss)';
    const formSign = formDelta >= 0 ? '+' : '';

    // Today delta
    const todayInfo = todayDeltas.get(player.id);
    const todayDelta = todayInfo?.delta ?? 0;
    const todayMatches = todayInfo?.matches ?? 0;
    let todayBadge = '';
    if (todayMatches > 0) {
      const rounded = Math.round(todayDelta);
      if (rounded > 0) todayBadge = `<span class="font-body text-xs" style="color:var(--color-win)"> +${rounded}</span>`;
      else if (rounded < 0) todayBadge = `<span class="font-body text-xs" style="color:var(--color-loss)"> ${rounded}</span>`;
      else todayBadge = `<span class="font-body text-xs" style="color:rgba(255,255,255,0.3)"> =</span>`;
    }

    const isSelected = selectedPlayerId && player.id === selectedPlayerId;
    const rowBg = isSelected
      ? 'background:rgba(255,215,0,0.08); border-left:2px solid var(--color-gold)'
      : rank <= 3
        ? `background:rgba(255,215,0,${0.06 - (rank - 1) * 0.015})`
        : 'background:rgba(255,255,255,0.02)';

    return `
      <tr class="ranking-row cursor-pointer hover:bg-white/5 transition-colors"
          style="${rowBg}; border-bottom:1px solid rgba(255,255,255,0.04)"
          onclick="window.location.hash='#/profile/${player.id}'">
        <td class="px-2 py-2.5">
          <span class="font-display text-sm ${rank <= 3 ? 'text-[var(--color-gold)]' : 'text-white/60'}">${rank <= 0 ? '—' : rank + '°'}</span>
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          ${player.class >= 0 ? `
            <div class="w-6 h-6 rounded-full flex items-center justify-center font-display text-xs"
                 style="background:${color}20; color:${color}; border:1px solid ${color}40"
                 title="${className}">
              ${className.charAt(0)}
            </div>
          ` : ''}
        </td>
        <td class="px-2 py-2.5">
          <div class="flex items-center gap-2 min-w-0">
            ${renderPlayerAvatar({ initials: getInitials(player.name), color, size: 'xs' })}
            <span class="font-ui text-sm text-white truncate ${rank <= 3 ? 'font-semibold' : ''}">${player.name}</span>
          </div>
        </td>
        <td class="px-2 py-2.5">
          <span class="font-display text-base" style="color:var(--color-gold)">${elo}</span>${todayBadge}
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          <span class="font-ui text-xs" style="color:${roleColor}">${roleLabel} ${Math.round(defenceValue)}%</span>
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          <span class="font-body text-sm text-white/60">${player.matches}</span>
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          <span class="font-body text-sm text-white/60">${wins}/${losses}</span>
        </td>
        <td class="px-2 py-2.5">
          <span class="font-ui text-sm ${winRate >= 55 ? 'text-[var(--color-win)]' : winRate <= 45 ? 'text-[var(--color-loss)]' : 'text-white/60'}">${winRate}%</span>
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          <span class="font-body text-sm">${goalDisplay}</span>
        </td>
        <td class="px-2 py-2.5 hidden lg:table-cell">
          <div class="flex items-center gap-1">
            <div class="flex items-center gap-0.5">${formDots || '<span class="font-body text-xs text-white/30">—</span>'}</div>
            ${last5.length > 0 ? `<span class="font-body text-xs ml-1" style="color:${formColor}">${formSign}${Math.round(formDelta)}</span>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private renderRecentMatches(): string {
    const allMatches = getAllMatches();
    const matches = allMatches.toSorted((a, b) => b.createdAt - a.createdAt).slice(0, RECENT_MATCHES_COUNT);
    if (matches.length === 0) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = matches.map(m => {
      const matchDate = new Date(m.createdAt);
      matchDate.setHours(0, 0, 0, 0);
      const isToday = matchDate.getTime() === today.getTime();

      const ad = getPlayerById(m.teamA.defence);
      const aa = getPlayerById(m.teamA.attack);
      const bd = getPlayerById(m.teamB.defence);
      const ba = getPlayerById(m.teamB.attack);

      const teamANames = `${ad?.name ?? '?'} & ${aa?.name ?? '?'}`;
      const teamBNames = `${bd?.name ?? '?'} & ${ba?.name ?? '?'}`;

      let scoreA = m.score[0], scoreB = m.score[1];
      let tA = teamANames, tB = teamBNames;
      let eloA = Math.round(m.teamELO[0]), eloB = Math.round(m.teamELO[1]);
      let deltaA = Math.round(m.deltaELO[0]), deltaB = Math.round(m.deltaELO[1]);
      let expA = m.expectedScore[0], expB = m.expectedScore[1];
      const aWon = scoreA > scoreB;

      // Show winner first
      if (!aWon) {
        [tA, tB] = [tB, tA];
        [eloA, eloB] = [eloB, eloA];
        [deltaA, deltaB] = [deltaB, deltaA];
        [expA, expB] = [expB, expA];
        [scoreA, scoreB] = [scoreB, scoreA];
      }

      const avgRating = (eloA + eloB) / 2;
      let ratingBorder = 'rgba(255,255,255,0.06)';
      if (avgRating >= 1150) ratingBorder = 'rgba(74,144,217,0.4)';
      else if (avgRating >= 1100) ratingBorder = 'rgba(74,144,217,0.2)';
      else if (avgRating <= 900) ratingBorder = 'rgba(229,62,62,0.3)';

      const dAColor = deltaA >= 0 ? 'var(--color-win)' : 'var(--color-loss)';
      const dBColor = deltaB >= 0 ? 'var(--color-win)' : 'var(--color-loss)';

      return `
        <div class="match-row flex items-center justify-between p-2.5 md:p-3 rounded-lg"
             style="background:rgba(255,255,255,0.03); border:1px solid ${ratingBorder}">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            ${isToday ? '<div class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--color-team-blue); box-shadow:0 0 4px var(--color-team-blue)"></div>' : '<div class="w-2"></div>'}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-ui text-xs" style="color:var(--color-win)">${tA}</span>
                <span class="font-display text-sm" style="color:rgba(255,255,255,0.7)">${scoreA} - ${scoreB}</span>
                <span class="font-ui text-xs" style="color:var(--color-loss)">${tB}</span>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <span class="font-body" style="font-size:10px; color:rgba(255,255,255,0.3)">${formatDate(m.createdAt)}</span>
                <span class="font-body" style="font-size:10px; color:rgba(255,255,255,0.25)">
                  ${Math.round(expA * 100)}% vs ${Math.round(expB * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0 ml-2">
            <div class="text-right">
              <div class="font-display text-sm" style="color:rgba(255,255,255,0.5)">${Math.round(avgRating)}</div>
              <div class="font-body" style="font-size:10px; color:rgba(255,255,255,0.25)">avg</div>
            </div>
            <div class="text-right">
              <span class="font-body text-xs" style="color:${dAColor}">${deltaA >= 0 ? '+' : ''}${deltaA}</span>
              <span class="font-body text-xs" style="color:rgba(255,255,255,0.2)"> / </span>
              <span class="font-body text-xs" style="color:${dBColor}">${deltaB >= 0 ? '+' : ''}${deltaB}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="glass-card rounded-xl overflow-hidden">
        <div class="px-4 md:px-5 py-3 flex items-center justify-between"
             style="background:rgba(10,25,18,0.8); border-bottom:1px solid var(--glass-border-gold)">
          <div class="flex items-center gap-2">
            <i data-lucide="target" style="width:14px;height:14px;color:var(--color-gold)"></i>
            <span class="font-ui" style="font-size:13px; color:var(--color-gold); letter-spacing:0.1em">
              ULTIME PARTITE
            </span>
          </div>
          <span class="font-ui" style="font-size:11px; color:rgba(255,255,255,0.4)">
            ${matches.length} partite
          </span>
        </div>
        <div class="p-3 space-y-2 overflow-y-auto" style="max-height:600px">
          ${rows}
        </div>
      </div>
    `;
  }

  // ── Dynamic Updates ─────────────────────────────────────────

  private refreshTable(): void {
    const tbody = this.$('#ranking-tbody');
    if (!tbody) return;

    const players = this.getSortedPlayers();
    const todayDeltas = this.getTodayEloDeltas();
    const selectedPlayerId = Number(localStorage.getItem('biliardino_player_id') || 0);

    tbody.innerHTML = players.map(p => this.renderRankingRow(p, todayDeltas, selectedPlayerId)).join('');
  }

  private updateSortIndicators(): void {
    const headers = this.$$('.sort-header');
    for (const th of headers) {
      const key = (th as HTMLElement).dataset.sortKey;
      if (!key) continue;
      const text = th.textContent?.replace(/[↑↓]/g, '').trim() ?? '';
      if (this.sortKey === key) {
        th.innerHTML = `${text} ${this.sortAsc ? '↑' : '↓'}`;
        (th as HTMLElement).style.color = 'var(--color-gold)';
      } else {
        th.textContent = text;
        (th as HTMLElement).style.color = '';
      }
    }
  }
}

export default LeaderboardPage;
