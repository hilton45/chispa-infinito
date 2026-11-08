import { Simulation } from '@/core/Simulation';
import { SceneManager } from '@/render/SceneManager';
import { AudioEngine } from '@/audio/AudioEngine';
import {
  SaveManager,
  exportSaveString,
  importSaveString,
} from '@/save/SaveManager';
import {
  GENERATORS,
  getNextMilestone,
  getMilestoneCount,
} from '@/data/generators';
import { UPGRADES } from '@/data/upgrades';
import { ACHIEVEMENTS } from '@/data/achievements';
import { ERAS } from '@/data/eras';
import { NEWS_ITEMS } from '@/data/news';
import { DARK_MATTER_NODES } from '@/data/darkMatterTree';
import {
  PARALLEL_UNIVERSES,
  COSMIC_CHALLENGES,
  CONSTELLATIONS,
  OBSERVER_QUOTES,
  ENCYCLOPEDIA_ENTRIES,
  MISSIONS,
  STORY_CHAPTERS,
  generateEncyclopediaSVG,
} from '@/data/extendedLayers';
import { getCurrentWeeklyEvent } from '@/data/comets';
import {
  calculateBatchCost,
  calculateMaxAffordable,
  calculateGeneratorSPS,
  calculateGlobalMultiplier,
  calculateBigBangDarkMatter,
} from '@/core/Economy';
import { D, Decimal, ZERO, formatDecimal, formatTime } from '@/utils/Decimal';
import { t, setLocale, getLocale } from '@/i18n/i18n';
import { QualitySetting } from '@/render/QualityGovernor';

export type TabId =
  | 'generators'
  | 'upgrades'
  | 'bigbang'
  | 'multiverse'
  | 'constellations'
  | 'eternity'
  | 'achievements'
  | 'encyclopedia'
  | 'settings';

export class UIManager {
  private sim: Simulation;
  private scene: SceneManager;
  private audio: AudioEngine;
  private saveManager: SaveManager;

  public activeTab: TabId = 'generators';
  public buyMode: 1 | 10 | 100 | 'max' = 1;
  public numberMode: 'standard' | 'scientific' = 'standard';
  public isPaused = false;
  public isZenMode = false;
  public timeScale = 1;

  private bigBangArmed = false;
  private bigBangArmedTimer = 0;
  private newsTimer = 0;
  private currentNewsIndex = 0;
  private observerQuoteIndex = 0;

  // DOM References
  private rootEl!: HTMLElement;
  private eraBadgeEl!: HTMLElement;
  private energyValEl!: HTMLElement;
  private spsValEl!: HTMLElement;
  private clickValEl!: HTMLElement;
  private resonanceBadgeEl!: HTMLElement;
  private nextGoalNameEl!: HTMLElement;
  private nextGoalPctEl!: HTMLElement;
  private nextGoalFillEl!: HTMLElement;
  private buffsRowEl!: HTMLElement;
  private observerCardEl!: HTMLElement;
  private observerTextEl!: HTMLElement;
  private tabsNavEl!: HTMLElement;
  private panelToolbarEl!: HTMLElement;
  private panelContentEl!: HTMLElement;
  private tickerTextEl!: HTMLElement;
  private toastContainerEl!: HTMLElement;
  private eraBannerEl!: HTMLElement;
  private eraBannerTitleEl!: HTMLElement;
  private eraBannerQuoteEl!: HTMLElement;

  constructor(
    sim: Simulation,
    scene: SceneManager,
    audio: AudioEngine,
    saveManager: SaveManager
  ) {
    this.sim = sim;
    this.scene = scene;
    this.audio = audio;
    this.saveManager = saveManager;
  }

  public mount(rootEl: HTMLElement): void {
    this.rootEl = rootEl;
    this.buildDOMLayout();
    this.bindSimulationEvents();
    this.bindKeyboardShortcuts();
    this.syncSkyConstellations();
    this.renderTabsNav();
    this.renderActiveTabContent();
    this.advanceNewsTicker();
  }

  private buildDOMLayout(): void {
    const hud = document.createElement('header');
    hud.id = 'hud-container';
    hud.setAttribute('aria-label', 'Estado principal del universo');

    const weeklyEvent = getCurrentWeeklyEvent();

    hud.innerHTML = `
      <div class="hud-card">
        <div class="era-header">
          <span class="era-badge" id="hud-era-badge" data-testid="era-badge">Era del Plasma</span>
          <div class="hud-quick-actions">
            <button class="icon-btn" id="btn-daily-streak" title="Recompensa de racha diaria" aria-label="Racha diaria">☀</button>
            <button class="icon-btn" id="btn-zen-mode" title="${t('zen_mode')} (Z)" aria-label="${t('zen_mode')}">✧ Zen</button>
            <button class="icon-btn" id="btn-pause" title="${t('pause_btn')} (P)" aria-label="${t('pause_btn')}">⏸</button>
          </div>
        </div>
        <div class="energy-main-row">
          <span class="energy-value" id="hud-energy-val" data-testid="energy-value">0</span>
          <span class="energy-unit">chispas</span>
        </div>
        <div class="rates-row">
          <span class="rate-pill"><strong id="hud-sps-val" data-testid="sps-value">0</strong> ${t('sps_label')}</span>
          <span class="rate-pill"><strong id="hud-click-val">1</strong> ${t('click_label')}</span>
          <span class="resonance-badge" id="hud-resonance-badge" data-testid="resonance-badge">×1.0</span>
        </div>
        <div class="buffs-row" id="hud-buffs-row">
          <span class="buff-chip" title="${weeklyEvent.description}">★ ${weeklyEvent.name}</span>
        </div>
        <div class="next-goal-box" id="hud-next-goal-box">
          <div class="next-goal-header">
            <span>${t('next_goal')}: <strong id="hud-goal-name">Átomo</strong></span>
            <span id="hud-goal-pct">0%</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" id="hud-goal-fill" style="width: 0%"></div>
          </div>
        </div>
      </div>
      <div class="observer-card" id="hud-observer-card" style="display: none;" role="button" tabindex="0" aria-label="El Observador">
        <div class="observer-orb"></div>
        <div id="hud-observer-text">«Interesante. Hace un rato esto era una sola luz.»</div>
      </div>
    `;

    const sidePanel = document.createElement('aside');
    sidePanel.id = 'side-panel';
    sidePanel.setAttribute('aria-label', 'Panel de control cósmico');
    sidePanel.innerHTML = `
      <nav class="tabs-nav" id="tabs-nav" role="tablist"></nav>
      <div class="panel-toolbar" id="panel-toolbar"></div>
      <div class="panel-content" id="panel-content" role="tabpanel"></div>
    `;

    const ticker = document.createElement('footer');
    ticker.id = 'news-ticker';
    ticker.setAttribute('role', 'status');
    ticker.innerHTML = `
      <span class="ticker-badge">Cosmos</span>
      <span class="ticker-text" id="ticker-text">Todo empezó con un clic. Nadie lo vio.</span>
    `;

    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');

    const eraBanner = document.createElement('div');
    eraBanner.id = 'era-banner';
    eraBanner.innerHTML = `
      <h2 id="era-banner-title">Era Estelar</h2>
      <p id="era-banner-quote"></p>
    `;

    this.rootEl.appendChild(hud);
    this.rootEl.appendChild(sidePanel);
    this.rootEl.appendChild(ticker);
    this.rootEl.appendChild(toastContainer);
    this.rootEl.appendChild(eraBanner);

    // Cache DOM refs
    this.eraBadgeEl = document.getElementById('hud-era-badge')!;
    this.energyValEl = document.getElementById('hud-energy-val')!;
    this.spsValEl = document.getElementById('hud-sps-val')!;
    this.clickValEl = document.getElementById('hud-click-val')!;
    this.resonanceBadgeEl = document.getElementById('hud-resonance-badge')!;
    this.nextGoalNameEl = document.getElementById('hud-goal-name')!;
    this.nextGoalPctEl = document.getElementById('hud-goal-pct')!;
    this.nextGoalFillEl = document.getElementById('hud-goal-fill')!;
    this.buffsRowEl = document.getElementById('hud-buffs-row')!;
    this.observerCardEl = document.getElementById('hud-observer-card')!;
    this.observerTextEl = document.getElementById('hud-observer-text')!;
    this.tabsNavEl = document.getElementById('tabs-nav')!;
    this.panelToolbarEl = document.getElementById('panel-toolbar')!;
    this.panelContentEl = document.getElementById('panel-content')!;
    this.tickerTextEl = document.getElementById('ticker-text')!;
    this.toastContainerEl = document.getElementById('toast-container')!;
    this.eraBannerEl = document.getElementById('era-banner')!;
    this.eraBannerTitleEl = document.getElementById('era-banner-title')!;
    this.eraBannerQuoteEl = document.getElementById('era-banner-quote')!;

    // Quick Action Listeners
    document.getElementById('btn-zen-mode')!.addEventListener('click', () => {
      this.toggleZenMode();
    });

    const pauseBtn = document.getElementById('btn-pause')!;
    pauseBtn.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      pauseBtn.textContent = this.isPaused ? '▶' : '⏸';
      this.showToast(
        this.isPaused ? 'Simulación en Pausa' : 'Simulación Reanudada',
        this.isPaused ? 'El tiempo cósmico descansa.' : 'Las órbitas continúan su danza.'
      );
    });

    document.getElementById('btn-daily-streak')!.addEventListener('click', () => {
      const res = this.sim.claimDailyStreak();
      if (res.claimed) {
        this.audio.playAchievement();
        this.showToast(
          `¡Racha Diaria · Día ${res.streak}!`,
          `Regalo cósmico recibido: +${this.fmt(res.bonusEnergy)} chispas.`
        );
      } else {
        this.showToast(
          `Racha Diaria · Día ${res.streak}`,
          'Ya reclamaste el regalo estelar de hoy. Vuelve mañana sin prisa.'
        );
      }
    });

    this.observerCardEl.addEventListener('click', () => {
      this.sim.state.clickedObserver = true;
      this.sim.checkAchievements();
      this.observerQuoteIndex = (this.observerQuoteIndex + 1) % OBSERVER_QUOTES.length;
      this.observerTextEl.textContent = `«${OBSERVER_QUOTES[this.observerQuoteIndex]}»`;
      this.audio.playBuyUpgrade();
    });

    ticker.addEventListener('click', () => {
      this.sim.state.newsReadCount += 1;
      this.sim.checkAchievements();
      this.advanceNewsTicker();
    });
  }

  public toggleZenMode(): void {
    this.isZenMode = !this.isZenMode;
    document.body.classList.toggle('zen-active', this.isZenMode);
    const btn = document.getElementById('btn-zen-mode');
    if (btn) {
      btn.textContent = this.isZenMode ? '✕ Salir Zen' : '✧ Zen';
    }
  }

  private bindSimulationEvents(): void {
    this.scene.onCoreClicked = (x, y) => {
      const res = this.sim.clickCore();
      const maxCombo = this.sim.state.darkMatterUpgrades?.includes('dm_resonance_ext') ? 50 : 30;
      this.audio.playClick(res.resonanceCombo / maxCombo);
      this.spawnFloatingNumber(x, y, `+${this.fmt(res.energyGained)}`);
      this.updateHUD();
    };

    this.scene.onCometCaught = (def, x, y, description) => {
      this.audio.playCometCatch();
      this.spawnFloatingNumber(x, y, `★ ${def.name}`);
      this.showToast(def.name, description);
      this.updateHUD();
    };

    this.sim.addEventListener((event, data) => {
      if (event === 'buy_generator') {
        const gen = GENERATORS.find((g) => g.id === data.generatorId);
        this.audio.playBuyGenerator(gen?.index ?? 1);
      } else if (event === 'buy_upgrade') {
        this.audio.playBuyUpgrade();
      } else if (event === 'milestone') {
        this.audio.playMilestone();
        this.showToast(
          `¡Hito de ${data.generatorName}!`,
          `Producción de ${data.generatorName} multiplicada ×${data.multiplier}.`
        );
      } else if (event === 'achievement') {
        this.audio.playAchievement();
        this.showToast(
          `Logro: ${data.achievement.name}`,
          `${data.achievement.description} (+2% producción)`
        );
      } else if (event === 'era_change') {
        this.audio.playMilestone();
        this.showEraBanner(data.newEra.name, data.newEra.quote);
      } else if (event === 'challenge_completed') {
        this.audio.playAchievement();
        this.showToast(
          `¡Reto Superado: ${data.challenge.name}!`,
          data.challenge.rewardDescription
        );
      }
    });
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.scene.triggerManualCoreClick();
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        const gen = GENERATORS[idx];
        if (gen) {
          const res = this.sim.buyGenerator(gen.id, this.buyMode);
          if (res.boughtCount > 0) {
            this.renderActiveTabContent();
          }
        }
      } else if (e.key.toLowerCase() === 'z') {
        this.toggleZenMode();
      } else if (e.key.toLowerCase() === 'p') {
        document.getElementById('btn-pause')?.click();
      }
    });
  }

  public fmt(val: Decimal | number): string {
    return formatDecimal(val, { mode: this.numberMode });
  }

  public showToast(title: string, body: string): void {
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
    this.toastContainerEl.appendChild(item);

    while (this.toastContainerEl.children.length > 4) {
      this.toastContainerEl.removeChild(this.toastContainerEl.firstChild!);
    }

    setTimeout(() => {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }, 4200);
  }

  public showEraBanner(title: string, quote: string): void {
    this.eraBannerTitleEl.textContent = title;
    this.eraBannerQuoteEl.textContent = quote;
    this.eraBannerEl.classList.add('visible');
    setTimeout(() => {
      this.eraBannerEl.classList.remove('visible');
    }, 3600);
  }

  public spawnFloatingNumber(x: number, y: number, text: string): void {
    if (this.scene.quality.reduceMotion || this.isZenMode) return;
    const el = document.createElement('div');
    el.className = 'floating-number';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = text;
    this.rootEl.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 850);
  }

  public showOfflineModal(secondsAway: number, energyGained: Decimal): void {
    if (secondsAway < 15 || energyGained.lte(0)) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="offline-modal-title">
        <h2 id="offline-modal-title" class="section-title" style="font-size: 1.25rem; margin-bottom: 10px;">
          ${t('offline_title')}
        </h2>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
          ${t('offline_desc')}<br/>
          Tiempo ausente: <strong>${formatTime(secondsAway)}</strong>
          (Eficiencia: ${Math.round(this.sim.state.offlineEfficiency * 100)}%)
        </p>
        <div style="font-family: var(--font-display); font-size: 1.5rem; color: var(--gold); margin-bottom: 20px;">
          +${this.fmt(energyGained)} chispas
        </div>
        <button class="action-btn gold" id="btn-claim-offline" style="width: 100%;">
          ${t('offline_collect')}
        </button>
      </div>
    `;
    this.rootEl.appendChild(backdrop);
    document.getElementById('btn-claim-offline')?.addEventListener('click', () => {
      this.audio.playAchievement();
      backdrop.remove();
    });
  }

  private advanceNewsTicker(): void {
    const s = this.sim.state;
    const eligible = NEWS_ITEMS.filter((item) => {
      if (item.minEnergy && s.totalEnergyProduced.lt(item.minEnergy)) return false;
      if (item.requiredGeneratorId && (s.generators[item.requiredGeneratorId]?.owned ?? 0) <= 0) {
        return false;
      }
      if (item.requiredEra !== undefined && s.currentEraIndex < item.requiredEra) return false;
      return true;
    });

    if (eligible.length > 0) {
      this.currentNewsIndex = (this.currentNewsIndex + 1) % eligible.length;
      this.tickerTextEl.textContent = eligible[this.currentNewsIndex].text;
    }
  }

  public syncSkyConstellations(): void {
    const edges: Array<[number, number, number, number]> = [];
    for (const cid of this.sim.state.unlockedConstellations) {
      const cDef = CONSTELLATIONS.find((c) => c.id === cid);
      if (cDef && cDef.points.length >= 2) {
        for (let i = 0; i < cDef.points.length - 1; i++) {
          edges.push([
            cDef.points[i][0],
            cDef.points[i][1],
            cDef.points[i + 1][0],
            cDef.points[i + 1][1],
          ]);
        }
      }
    }
    this.scene.constellationEdges = edges;
  }

  public renderTabsNav(): void {
    const tabs: Array<{ id: TabId; label: string; visible: boolean }> = [
      { id: 'generators', label: t('tab_generators'), visible: true },
      { id: 'upgrades', label: t('tab_upgrades'), visible: true },
      { id: 'bigbang', label: t('tab_bigbang'), visible: true },
      {
        id: 'multiverse',
        label: t('tab_multiverse'),
        visible: this.sim.isMultiverseUnlocked() || this.sim.state.bigBangsTotal >= 1,
      },
      {
        id: 'constellations',
        label: t('tab_constellations'),
        visible: this.sim.isConsciousnessUnlocked() || this.sim.isMultiverseUnlocked(),
      },
      {
        id: 'eternity',
        label: t('tab_eternity'),
        visible: this.sim.isEternityUnlocked() || this.sim.isConsciousnessUnlocked(),
      },
      { id: 'achievements', label: t('tab_achievements'), visible: true },
      { id: 'encyclopedia', label: t('tab_encyclopedia'), visible: true },
      { id: 'settings', label: t('tab_settings'), visible: true },
    ];

    this.tabsNavEl.innerHTML = '';
    for (const tab of tabs) {
      if (!tab.visible) continue;
      const btn = document.createElement('button');
      btn.className = `tab-btn ${this.activeTab === tab.id ? 'active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', this.activeTab === tab.id ? 'true' : 'false');
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.renderTabsNav();
        this.renderActiveTabContent();
      });
      this.tabsNavEl.appendChild(btn);
    }

    // Toolbar for buy multipliers when on generators tab
    if (this.activeTab === 'generators') {
      this.panelToolbarEl.style.display = 'flex';
      this.panelToolbarEl.innerHTML = `
        <span style="font-size: 0.78rem; color: var(--text-muted);">Cantidad de compra:</span>
        <div class="buy-mode-group" role="group" aria-label="Multiplicador de compra">
          ${([1, 10, 100, 'max'] as const)
            .map(
              (m) => `
            <button class="buy-mode-btn ${this.buyMode === m ? 'active' : ''}" data-mode="${m}">
              ${m === 'max' ? t('buy_max') : `×${m}`}
            </button>
          `
            )
            .join('')}
        </div>
      `;
      this.panelToolbarEl.querySelectorAll('.buy-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const raw = (btn as HTMLElement).dataset.mode!;
          this.buyMode = raw === 'max' ? 'max' : (parseInt(raw, 10) as 1 | 10 | 100);
          this.renderTabsNav();
          this.renderActiveTabContent();
        });
      });
    } else {
      this.panelToolbarEl.style.display = 'none';
    }
  }

  public renderActiveTabContent(): void {
    switch (this.activeTab) {
      case 'generators':
        this.renderGeneratorsTab();
        break;
      case 'upgrades':
        this.renderUpgradesTab();
        break;
      case 'bigbang':
        this.renderBigBangTab();
        break;
      case 'multiverse':
        this.renderMultiverseTab();
        break;
      case 'constellations':
        this.renderConstellationsTab();
        break;
      case 'eternity':
        this.renderEternityTab();
        break;
      case 'achievements':
        this.renderAchievementsTab();
        break;
      case 'encyclopedia':
        this.renderEncyclopediaTab();
        break;
      case 'settings':
        this.renderSettingsTab();
        break;
    }
  }

  private renderGeneratorsTab(): void {
    const s = this.sim.state;
    const globalMult = calculateGlobalMultiplier(s);
    const totalSPS = s.energyPerSecond;
    this.panelContentEl.innerHTML = '';

    for (let i = 0; i < GENERATORS.length; i++) {
      const gen = GENERATORS[i];
      if (gen.index > 10 && !this.sim.isMultiverseUnlocked() && s.totalEnergyProduced.lt(1e11)) {
        continue;
      }

      const owned = s.generators[gen.id]?.owned ?? 0;
      const prevOwned = i === 0 ? 1 : s.generators[GENERATORS[i - 1].id]?.owned ?? 0;
      const isDiscovered =
        i === 0 || owned > 0 || prevOwned > 0 || s.totalEnergyProduced.gte(gen.baseCost.times(0.3));

      const btn = document.createElement('button');
      btn.type = 'button';

      if (!isDiscovered) {
        btn.className = 'gen-card mystery';
        btn.disabled = true;
        btn.innerHTML = `
          <div class="gen-top-row">
            <span class="gen-title">#${gen.index} · ???</span>
            <span class="gen-owned">—</span>
          </div>
          <div class="gen-desc">${t('undiscovered')}</div>
        `;
        this.panelContentEl.appendChild(btn);
        continue;
      }

      let countToBuy = 1;
      let cost = ZERO;
      if (this.buyMode === 'max') {
        const maxRes = calculateMaxAffordable(
          gen.baseCost,
          gen.costMultiplier,
          owned,
          s.energy,
          s
        );
        countToBuy = Math.max(1, maxRes.count);
        cost =
          maxRes.count > 0
            ? maxRes.cost
            : calculateBatchCost(gen.baseCost, gen.costMultiplier, owned, 1, s);
      } else {
        countToBuy = this.buyMode;
        cost = calculateBatchCost(gen.baseCost, gen.costMultiplier, owned, countToBuy, s);
      }

      const canAfford = s.energy.gte(cost);
      const genSPS = calculateGeneratorSPS(gen, s, globalMult);
      const pctOfTotal =
        totalSPS.gt(0) && genSPS.gt(0)
          ? Math.min(100, genSPS.dividedBy(totalSPS).toNumber() * 100).toFixed(1)
          : '0.0';
      const milestoneInfo = getNextMilestone(owned);
      const milestoneMult = Math.pow(2, getMilestoneCount(owned));

      btn.className = `gen-card ${canAfford ? 'affordable' : ''}`;
      btn.disabled = !canAfford;
      btn.dataset.testid = `buy-gen-${gen.id}`;
      btn.dataset.genId = gen.id;

      btn.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${gen.index}. ${gen.name}</span>
          <span class="gen-owned" data-role="owned">${owned}</span>
        </div>
        <div class="gen-desc">${gen.description}</div>
        <div class="gen-stats-row">
          <span>Prod: <strong data-role="sps">${this.fmt(genSPS)}/s</strong> (${pctOfTotal}%) · Hitos ×${milestoneMult}</span>
          <span class="gen-cost" data-role="cost">${this.buyMode === 'max' ? `×${countToBuy} · ` : ''}${this.fmt(cost)}</span>
        </div>
        <div class="progress-track" title="${t('milestone_next')}: ${milestoneInfo.next ?? 'Máx'}">
          <div class="progress-fill" data-role="milestone-bar" style="width: ${(milestoneInfo.progress * 100).toFixed(1)}%"></div>
        </div>
      `;

      btn.addEventListener('click', () => {
        const res = this.sim.buyGenerator(gen.id, this.buyMode);
        if (res.boughtCount > 0) {
          this.renderActiveTabContent();
          this.updateHUD();
        }
      });

      this.panelContentEl.appendChild(btn);
    }
  }

  private renderUpgradesTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    for (const up of UPGRADES) {
      const purchased = s.upgradesPurchased.includes(up.id);
      if (purchased) continue;

      let reqMet = true;
      if (up.requirement.generatorId && up.requirement.ownedCount) {
        const owned = s.generators[up.requirement.generatorId]?.owned ?? 0;
        if (owned < up.requirement.ownedCount) reqMet = false;
      }
      if (up.requirement.totalClicks && s.totalClicks < up.requirement.totalClicks) {
        reqMet = false;
      }
      if (up.requirement.totalEnergy && s.totalEnergyProduced.lt(up.requirement.totalEnergy)) {
        reqMet = false;
      }

      if (!reqMet) continue;

      const canAfford = s.energy.gte(up.cost);
      const btn = document.createElement('button');
      btn.className = `gen-card ${canAfford ? 'affordable' : ''}`;
      btn.disabled = !canAfford;
      btn.dataset.testid = `buy-upgrade-${up.id}`;
      btn.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${up.name}</span>
          <span class="gen-cost">${this.fmt(up.cost)}</span>
        </div>
        <div class="gen-desc">${up.description}</div>
      `;
      btn.addEventListener('click', () => {
        if (this.sim.buyUpgrade(up.id)) {
          this.renderUpgradesTab();
          this.updateHUD();
        }
      });
      this.panelContentEl.appendChild(btn);
    }

    // Mystery teaser card
    const mystery = document.createElement('div');
    mystery.className = 'gen-card mystery';
    mystery.innerHTML = `
      <div class="gen-top-row">
        <span class="gen-title">??? · Mejora Oculta</span>
      </div>
      <div class="gen-desc">Desbloquea más cuerpos orbitales o alcanza hitos para revelar nuevas mejoras (${s.upgradesPurchased.length}/${UPGRADES.length} adquiridas).</div>
    `;
    this.panelContentEl.appendChild(mystery);
  }

  private renderBigBangTab(): void {
    const s = this.sim.state;
    const pendingDM = calculateBigBangDarkMatter(s.totalEnergyProduced, s);
    this.panelContentEl.innerHTML = '';

    const headerBox = document.createElement('div');
    headerBox.className = 'section-box';
    headerBox.innerHTML = `
      <div class="section-title">Capa 1 · El Big Bang</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
        Colapsa tu universo actual para cristalizar <strong>Materia Oscura</strong>. Cada punto otorga un <strong>+10% permanente</strong> a toda la producción y desbloquea nodos del árbol cósmico.
      </p>
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.85rem;">
        <span>Materia Oscura disponible: <strong style="color: var(--accent-bright);">${this.fmt(s.darkMatter)}</strong> (Total: ${this.fmt(s.darkMatterTotal)})</span>
        <span>Al reiniciar hoy: <strong style="color: var(--gold);">+${this.fmt(pendingDM)} DM</strong></span>
      </div>
      <button class="action-btn gold" id="btn-trigger-bigbang" data-testid="btn-bigbang" style="width: 100%;" ${pendingDM.lte(0) ? 'disabled' : ''}>
        ${
          this.bigBangArmed
            ? t('bigbang_confirm')
            : `${t('bigbang_btn')} (+${this.fmt(pendingDM)} Materia Oscura)`
        }
      </button>
    `;
    this.panelContentEl.appendChild(headerBox);

    document.getElementById('btn-trigger-bigbang')?.addEventListener('click', () => {
      if (pendingDM.lte(0)) return;
      if (!this.bigBangArmed) {
        this.bigBangArmed = true;
        this.bigBangArmedTimer = 4.0;
        this.renderBigBangTab();
        return;
      }
      this.bigBangArmed = false;
      this.audio.playBigBang();
      this.scene.playBigBangCinematic(() => {
        const res = this.sim.triggerBigBang();
        this.showToast(
          `¡Big Bang Completado!`,
          `El cosmos renace con +${this.fmt(res.darkMatterGained)} de Materia Oscura.`
        );
        this.renderTabsNav();
        this.renderBigBangTab();
        this.updateHUD();
      });
    });

    // Automation Box if any automation node unlocked
    if (s.darkMatterUpgrades.some((id) => id.startsWith('dm_auto_'))) {
      const autoBox = document.createElement('div');
      autoBox.className = 'section-box';
      autoBox.innerHTML = `
        <div class="section-title">Autómatas Cuánticos</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-size: 0.8rem;">Compra automática activa:</span>
          <button class="action-btn" id="btn-toggle-auto">${s.automationEnabled ? 'Activada' : 'Pausada'}</button>
        </div>
      `;
      this.panelContentEl.appendChild(autoBox);
      document.getElementById('btn-toggle-auto')?.addEventListener('click', () => {
        s.automationEnabled = !s.automationEnabled;
        this.renderBigBangTab();
      });
    }

    // Dark Matter Tree (23 nodes)
    const treeTitle = document.createElement('div');
    treeTitle.className = 'section-title';
    treeTitle.style.marginTop = '8px';
    treeTitle.textContent = `Árbol de Materia Oscura (${s.darkMatterUpgrades.length}/${DARK_MATTER_NODES.length})`;
    this.panelContentEl.appendChild(treeTitle);

    for (const node of DARK_MATTER_NODES) {
      const owned = s.darkMatterUpgrades.includes(node.id);
      const prereqsMet = node.prerequisites.every((p) => s.darkMatterUpgrades.includes(p));
      const canBuy = !owned && prereqsMet && s.darkMatter.gte(node.cost);

      const card = document.createElement('button');
      card.className = `gen-card ${canBuy ? 'affordable' : ''}`;
      card.disabled = owned || !canBuy;
      card.dataset.testid = `dm-node-${node.id}`;
      card.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${node.name}</span>
          <span class="gen-cost">${owned ? '✓ Adquirido' : `${node.cost} DM`}</span>
        </div>
        <div class="gen-desc">${node.description}</div>
      `;
      card.addEventListener('click', () => {
        if (this.sim.buyDarkMatterUpgrade(node.id)) {
          this.audio.playBuyUpgrade();
          this.renderBigBangTab();
          this.updateHUD();
        }
      });
      this.panelContentEl.appendChild(card);
    }
  }

  private renderMultiverseTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    const infoBox = document.createElement('div');
    infoBox.className = 'section-box';
    infoBox.innerHTML = `
      <div class="section-title">Capa 2 · El Multiverso</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
        Otras realidades laten junto a la tuya con leyes físicas alteradas. Canaliza <strong>Fragmentos de Realidad</strong> para sintonizarlas.
      </p>
      <div style="font-family: var(--font-display); font-size: 1rem; color: var(--accent-bright);">
        Fragmentos de Realidad: <span data-testid="reality-fragments">${this.fmt(s.realityFragments)}</span>
      </div>
    `;
    this.panelContentEl.appendChild(infoBox);

    for (const u of PARALLEL_UNIVERSES) {
      const lvl = s.parallelUniverseAttention?.[u.id] ?? 0;
      const cost = D(10 * Math.pow(1.6, lvl));
      const canAfford = s.realityFragments.gte(cost);

      const card = document.createElement('button');
      card.className = `gen-card ${canAfford ? 'affordable' : ''}`;
      card.disabled = !canAfford;
      card.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${u.name}</span>
          <span class="gen-owned">Nivel ${lvl}</span>
        </div>
        <div class="gen-desc">${u.ruleDescription}<br/><strong style="color: var(--accent-bright);">${u.rewardDescription}</strong></div>
        <div class="gen-stats-row">
          <span>Genera +${u.fragmentRatePerSec}/s fragmentos por nivel</span>
          <span class="gen-cost">${this.fmt(cost)} Fragmentos</span>
        </div>
      `;
      card.addEventListener('click', () => {
        if (this.sim.upgradeParallelUniverse(u.id)) {
          this.audio.playBuyUpgrade();
          this.renderMultiverseTab();
          this.updateHUD();
        }
      });
      this.panelContentEl.appendChild(card);
    }

    // Cosmic Challenges
    const chalHeader = document.createElement('div');
    chalHeader.className = 'section-title';
    chalHeader.style.marginTop = '10px';
    chalHeader.textContent = 'Retos Cósmicos';
    this.panelContentEl.appendChild(chalHeader);

    for (const ch of COSMIC_CHALLENGES) {
      const done = s.completedChallenges.includes(ch.id);
      const active = s.activeChallengeId === ch.id;

      const card = document.createElement('button');
      card.className = `gen-card ${ !done && !active ? 'affordable' : '' }`;
      card.disabled = done || active;
      card.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${ch.name}</span>
          <span class="gen-cost">${done ? '✓ Completado' : active ? '⚡ En Curso' : 'Iniciar Reto'}</span>
        </div>
        <div class="gen-desc">${ch.restriction}<br/><strong style="color: var(--gold);">${ch.rewardDescription}</strong></div>
      `;
      card.addEventListener('click', () => {
        if (this.sim.startChallenge(ch.id)) {
          this.showToast(`Reto Iniciado: ${ch.name}`, ch.restriction);
          this.renderMultiverseTab();
        }
      });
      this.panelContentEl.appendChild(card);
    }
  }

  private renderConstellationsTab(): void {
    const s = this.sim.state;
    this.observerCardEl.style.display = 'flex';
    this.panelContentEl.innerHTML = '';

    const nextConst =
      CONSTELLATIONS.find((c) => !s.unlockedConstellations.includes(c.id)) ?? CONSTELLATIONS[0];

    const box = document.createElement('div');
    box.className = 'section-box';
    box.innerHTML = `
      <div class="section-title">Capa 3 · Conciencia y Mapa de Constelaciones</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
        El Observador ha despertado. Une las estrellas en el lienzo interactivo o selecciona una constelación con tu <strong>Atención</strong> para grabarla en el cielo.
      </p>
      <div style="display: flex; justify-content: space-between; font-family: var(--font-display); font-size: 0.92rem; margin-bottom: 10px;">
        <span>Atención: <strong style="color: var(--accent-bright);">${this.fmt(s.attentionCurrency)}</strong></span>
        <span>Trazadas: <strong>${s.unlockedConstellations.length} / ${CONSTELLATIONS.length}</strong></span>
      </div>
      <canvas id="constellation-canvas" width="380" height="150" style="width: 100%; height: 150px; border-radius: 12px; background: radial-gradient(circle, rgba(20,28,60,0.85), #05040f); border: 1px solid var(--glass-border); cursor: crosshair; display: block;"></canvas>
      <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px; text-align: center;">
        Toca o arrastra sobre las estrellas de <strong>${nextConst.name}</strong> (${nextConst.costAttention} Atención) para unirlas.
      </div>
    `;
    this.panelContentEl.appendChild(box);

    // Interactive Star-Drawing Canvas
    const canvas = box.querySelector('#constellation-canvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let connectedCount = 1;
      const drawCanvas = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pts = [
          [70, 95],
          [145, 42],
          [235, 108],
          [315, 52],
        ];
        // Dashed guide
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        ctx.setLineDash([]);

        // Connected segments
        if (connectedCount > 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < connectedCount; i++) {
            const [x, y] = pts[i];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Stars
        pts.forEach(([x, y], i) => {
          ctx.fillStyle = i < connectedCount ? '#fbbf24' : '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, i < connectedCount ? 7 : 5, 0, Math.PI * 2);
          ctx.fill();
        });
      };
      drawCanvas();

      const advanceTrace = () => {
        connectedCount++;
        drawCanvas();
        this.audio.playClick(connectedCount / 4);
        if (connectedCount >= 4) {
          if (this.sim.unlockConstellation(nextConst.id)) {
            this.audio.playAchievement();
            this.syncSkyConstellations();
            this.showToast(`Constelación Trazada: ${nextConst.name}`, nextConst.bonusDescription);
            this.renderConstellationsTab();
            this.updateHUD();
          } else {
            connectedCount = 1;
            drawCanvas();
          }
        }
      };

      canvas.addEventListener('pointerdown', advanceTrace);
    }

    const grid = document.createElement('div');
    grid.className = 'constellation-grid';

    for (const cDef of CONSTELLATIONS) {
      const unlocked = s.unlockedConstellations.includes(cDef.id);
      const canAfford = !unlocked && s.attentionCurrency.gte(cDef.costAttention);

      const card = document.createElement('button');
      card.className = `gen-card ${canAfford ? 'affordable' : ''}`;
      card.disabled = unlocked || !canAfford;
      card.dataset.testid = `constellation-${cDef.id}`;
      card.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title" style="font-size: 0.8rem;">#${cDef.index} ${cDef.name}</span>
        </div>
        <div class="gen-desc" style="font-size: 0.72rem;">${cDef.bonusDescription}</div>
        <div class="gen-stats-row">
          <span class="gen-cost">${unlocked ? '★ En el Cielo' : `${cDef.costAttention} Atención`}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        if (this.sim.unlockConstellation(cDef.id)) {
          this.audio.playAchievement();
          this.syncSkyConstellations();
          this.renderConstellationsTab();
          this.updateHUD();
        }
      });
      grid.appendChild(card);
    }

    this.panelContentEl.appendChild(grid);
  }

  private renderEternityTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'section-box';
    box.innerHTML = `
      <div class="section-title">Capa 4 · Eternidad y el Reloj Cósmico</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
        El tiempo mismo es ahora maleable. Usa tus <strong>Eones</strong> para acelerar el flujo temporal, rebobinar ciclos pasados o reescribir la primera chispa.
      </p>
      <div style="font-family: var(--font-display); font-size: 1rem; color: var(--gold); margin-bottom: 12px;">
        Eones acumulados: ${this.fmt(s.aeonsCurrency)} · Partida+: Nivel ${s.newGamePlusCount}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="action-btn" id="btn-clock-boost" ${s.aeonsCurrency.lt(10) ? 'disabled' : ''}>
          ⏱ Acelerar Reloj Cósmico ×2 por 2 min (10 Eones) ${s.cosmicClockBoostTimer > 0 ? `[Activo: ${Math.ceil(s.cosmicClockBoostTimer)}s]` : ''}
        </button>
        <button class="action-btn" id="btn-clock-rewind" ${s.aeonsCurrency.lt(25 * Math.pow(1.5, s.rewindsCount)) ? 'disabled' : ''}>
          ↺ Rebobinar Ejecución (+25% producción eterna · Coste: ${Math.round(25 * Math.pow(1.5, s.rewindsCount))} Eones)
        </button>
        <button class="action-btn gold" id="btn-new-game-plus">
          ∞ Reescribir la Primera Chispa · Nueva Partida+ (Producción ×3 permanente)
        </button>
      </div>
    `;
    this.panelContentEl.appendChild(box);

    document.getElementById('btn-clock-boost')?.addEventListener('click', () => {
      if (this.sim.activateCosmicClockBoost()) {
        this.audio.playBuyUpgrade();
        this.renderEternityTab();
      }
    });

    document.getElementById('btn-clock-rewind')?.addEventListener('click', () => {
      if (this.sim.rewindCosmicRun()) {
        this.audio.playBigBang();
        this.showToast('Reloj Cósmico Rebobinado', 'El universo conserva la sabiduría temporal (+25% SPS).');
        this.renderEternityTab();
      }
    });

    document.getElementById('btn-new-game-plus')?.addEventListener('click', () => {
      if (this.sim.triggerNewGamePlus()) {
        this.audio.playBigBang();
        this.showToast(
          `¡Nueva Partida+ ${s.newGamePlusCount}!`,
          'Has reescrito la Primera Chispa. Multiplicador eterno ×3 aplicado.'
        );
        this.renderEternityTab();
      }
    });
  }

  private renderAchievementsTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    const skins = [
      { id: 'skin_default', name: 'Chispa de Era (Dinámico)' },
      { id: 'skin_solar_flare', name: 'Fulgor Solar' },
      { id: 'skin_rainbow_resonator', name: 'Prisma de Resonancia' },
      { id: 'skin_comet_gold', name: 'Núcleo de Midas' },
      { id: 'skin_void_black_hole', name: 'Singularidad Abisal' },
    ];

    const header = document.createElement('div');
    header.className = 'section-box';
    header.innerHTML = `
      <div class="section-title">Logros Cósmicos (${s.achievementsUnlocked.length} / ${ACHIEVEMENTS.length})</div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
        Bonificación global acumulada: <strong style="color: var(--gold);">+${s.achievementsUnlocked.length * 2}%</strong> de producción.
      </p>
      <div style="font-size: 0.78rem; margin-bottom: 6px;">Aspecto del Núcleo:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;" id="skins-selector"></div>
    `;
    this.panelContentEl.appendChild(header);

    const skinRow = header.querySelector('#skins-selector')!;
    for (const sk of skins) {
      const unlocked = s.unlockedSkins.includes(sk.id);
      const btn = document.createElement('button');
      btn.className = `buy-mode-btn ${s.selectedSkinId === sk.id ? 'active' : ''}`;
      btn.disabled = !unlocked;
      btn.textContent = unlocked ? sk.name : '🔒 ???';
      btn.addEventListener('click', () => {
        s.selectedSkinId = sk.id;
        this.renderAchievementsTab();
      });
      skinRow.appendChild(btn);
    }

    // Daily & Weekly Missions (3 daily + 3 weekly)
    const missionsBox = document.createElement('div');
    missionsBox.className = 'section-box';
    missionsBox.innerHTML = `<div class="section-title">Misiones Diarias y Semanales (Opcionales)</div>`;
    for (const m of MISSIONS) {
      const done = m.isCompleted(s);
      const item = document.createElement('div');
      item.style.cssText = 'font-size:0.76rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; gap:8px;';
      item.innerHTML = `
        <span><strong>[${m.period === 'daily' ? 'Diaria' : 'Semanal'}] ${m.title}:</strong> ${m.targetText}</span>
        <span style="color:${done ? 'var(--success)' : 'var(--gold)'}; white-space:nowrap;">${done ? '✓ Completada' : m.rewardText}</span>
      `;
      missionsBox.appendChild(item);
    }
    this.panelContentEl.appendChild(missionsBox);

    for (const ach of ACHIEVEMENTS) {
      const unlocked = s.achievementsUnlocked.includes(ach.id);
      const isHiddenSecret = ach.secret && !unlocked;

      const card = document.createElement('div');
      card.className = `gen-card ${unlocked ? 'affordable' : isHiddenSecret ? 'mystery' : ''}`;
      card.style.cursor = 'default';
      card.innerHTML = `
        <div class="gen-top-row">
          <span class="gen-title">${isHiddenSecret ? '🔒 Logro Secreto (???)' : ach.name}</span>
          <span class="gen-cost">${unlocked ? '★ Desbloqueado' : 'Pendiente'}</span>
        </div>
        <div class="gen-desc">${isHiddenSecret ? 'Realiza una acción inusual en el cosmos para descubrirlo.' : ach.description}</div>
      `;
      this.panelContentEl.appendChild(card);
    }
  }

  private renderEncyclopediaTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    // 5 Story Chapters (Section 11)
    const chaptersBox = document.createElement('div');
    chaptersBox.className = 'section-box';
    chaptersBox.innerHTML = `<div class="section-title">Crónica en Cinco Capítulos</div>`;
    for (const ch of STORY_CHAPTERS) {
      const unlocked = ch.isUnlocked(s);
      const item = document.createElement('div');
      item.style.cssText = 'padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.78rem;';
      item.innerHTML = unlocked
        ? `<div style="color:var(--accent-bright); font-weight:600;">${ch.title}</div><div style="color:#e2e8f0; margin-top:2px;">«${ch.body}»</div>`
        : `<div style="color:var(--text-muted); opacity:0.6;">Capítulo ${ch.chapter} · ??? (Sigue avanzando de capa)</div>`;
      chaptersBox.appendChild(item);
    }
    this.panelContentEl.appendChild(chaptersBox);

    const intro = document.createElement('div');
    intro.className = 'section-box';
    intro.innerHTML = `
      <div class="section-title">Archivo Astronómico Real</div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        Fichas científicas con magnitudes astrofísicas reales verificadas de cada estructura que orbita tu chispa.
      </p>
    `;
    this.panelContentEl.appendChild(intro);

    for (let i = 0; i < ENCYCLOPEDIA_ENTRIES.length; i++) {
      const entry = ENCYCLOPEDIA_ENTRIES[i];
      const owned = s.generators[entry.genId]?.owned ?? 0;
      const unlocked = owned > 0 || entry.genId === 'atom';

      const card = document.createElement('div');
      card.className = `section-box ${unlocked ? '' : 'gen-card mystery'}`;
      if (!unlocked) {
        card.innerHTML = `
          <div class="section-title">??? · Registro bloqueado</div>
          <div class="gen-desc">Adquiere al menos una unidad de este cuerpo para desbloquear su ficha astrofísica.</div>
        `;
      } else {
        const svgHtml = generateEncyclopediaSVG(entry.genId, i + 1);
        card.innerHTML = `
          <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:8px;">
            ${svgHtml}
            <div>
              <div class="section-title" style="margin-bottom:2px;">${entry.title}</div>
              <div style="font-size: 0.76rem; color: var(--accent-bright);">${entry.subtitle}</div>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; display: grid; gap: 2px;">
            <span>• <strong>Escala:</strong> ${entry.scaleReal}</span>
            <span>• <strong>Energía/Temp:</strong> ${entry.temperatureOrEnergy}</span>
            <span>• <strong>Masa/Densidad:</strong> ${entry.massOrDensity}</span>
          </div>
          <p style="font-size: 0.78rem; color: #e2e8f0;">${entry.scientificFact}</p>
        `;
      }
      this.panelContentEl.appendChild(card);
    }
  }

  private renderSettingsTab(): void {
    const s = this.sim.state;
    this.panelContentEl.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'section-box';
    box.innerHTML = `
      <div class="section-title">Ajustes Gráficos, Audio y Accesibilidad</div>
      <div style="display: grid; gap: 10px; font-size: 0.8rem; margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Calidad Gráfica (FPS: ${Math.round(this.scene.quality.currentFps)}):</span>
          <div class="buy-mode-group">
            ${(['auto', 'high', 'medium', 'low'] as QualitySetting[])
              .map(
                (q) => `
              <button class="buy-mode-btn ${this.scene.quality.setting === q ? 'active' : ''}" data-q="${q}">
                ${q.toUpperCase()}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Modo Ahorro de Batería / Reducir Movimiento:</span>
          <button class="buy-mode-btn ${this.scene.quality.reduceMotion ? 'active' : ''}" id="btn-toggle-motion">
            ${this.scene.quality.reduceMotion ? 'Activado' : 'Desactivado'}
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Audio Sintetizado WebAudio:</span>
          <button class="buy-mode-btn ${!this.audio.muted ? 'active' : ''}" id="btn-toggle-mute">
            ${this.audio.muted ? 'Silenciado' : 'Activo'}
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Notación Numérica:</span>
          <button class="buy-mode-btn" id="btn-toggle-notation">
            ${this.numberMode === 'standard' ? 'Estándar (K, M, B)' : 'Científica (1e12)'}
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Idioma / Language:</span>
          <button class="buy-mode-btn" id="btn-toggle-locale">
            ${getLocale() === 'es' ? 'Español' : 'English'}
          </button>
        </div>
      </div>
    `;
    this.panelContentEl.appendChild(box);

    box.querySelectorAll('[data-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = (btn as HTMLElement).dataset.q as QualitySetting;
        this.scene.quality.setSetting(q);
        this.renderSettingsTab();
      });
    });

    document.getElementById('btn-toggle-motion')?.addEventListener('click', () => {
      this.scene.quality.reduceMotion = !this.scene.quality.reduceMotion;
      this.renderSettingsTab();
    });

    document.getElementById('btn-toggle-mute')?.addEventListener('click', () => {
      this.audio.muted = !this.audio.muted;
      this.audio.syncVolumes();
      this.renderSettingsTab();
    });

    document.getElementById('btn-toggle-notation')?.addEventListener('click', () => {
      this.numberMode = this.numberMode === 'standard' ? 'scientific' : 'standard';
      this.renderSettingsTab();
      this.updateHUD();
    });

    document.getElementById('btn-toggle-locale')?.addEventListener('click', () => {
      setLocale(getLocale() === 'es' ? 'en' : 'es');
      this.renderTabsNav();
      this.renderSettingsTab();
      this.updateHUD();
    });

    // Save Export / Import Box
    const saveBox = document.createElement('div');
    saveBox.className = 'section-box';
    saveBox.innerHTML = `
      <div class="section-title">Guardado Versionado y Copias de Seguridad</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
        <button class="action-btn" id="btn-manual-save">Guardar Ahora</button>
        <button class="action-btn" id="btn-export-save" data-testid="btn-export-save">Exportar Código</button>
        <button class="action-btn" id="btn-import-save">Importar Código</button>
      </div>
      <textarea id="save-code-area" rows="3" placeholder="Pega aquí tu código CHISPA2:... para importar o pulsa Exportar" style="width: 100%; border-radius: 8px; background: rgba(0,0,0,0.45); color: #fff; border: 1px solid var(--glass-border); padding: 8px; font-size: 0.75rem;"></textarea>
    `;
    this.panelContentEl.appendChild(saveBox);

    const textArea = document.getElementById('save-code-area') as HTMLTextAreaElement;
    document.getElementById('btn-manual-save')?.addEventListener('click', () => {
      this.saveManager.saveToLocal(this.sim.state);
      this.showToast('Partida Guardada', 'Guardado local sincronizado correctamente.');
    });

    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      s.hasExportedSave = true;
      this.sim.checkAchievements();
      const code = exportSaveString(this.sim.state);
      textArea.value = code;
      navigator.clipboard?.writeText(code).catch(() => {});
      this.showToast('Código Exportado', 'Copiado al cuadro de texto y portapapeles.');
    });

    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      try {
        const imported = importSaveString(textArea.value);
        this.sim.state = imported;
        this.sim.recalculateRates();
        this.saveManager.saveToLocal(this.sim.state);
        this.syncSkyConstellations();
        this.showToast('Partida Importada', 'Tu universo ha sido restaurado con éxito.');
        this.renderTabsNav();
        this.renderSettingsTab();
        this.updateHUD();
      } catch (err: any) {
        this.showToast('Error al Importar', err?.message || 'Código inválido.');
      }
    });

    // Statistics Box
    const statsBox = document.createElement('div');
    statsBox.className = 'section-box';
    statsBox.innerHTML = `
      <div class="section-title">Estadísticas del Universo</div>
      <div style="font-size: 0.78rem; color: var(--text-muted); display: grid; gap: 4px;">
        <span>• Tiempo jugado: <strong>${formatTime(s.timePlayedSeconds)}</strong></span>
        <span>• Energía histórica total: <strong>${this.fmt(s.allTimeEnergyProduced)}</strong></span>
        <span>• Clics manuales realizados: <strong>${s.totalClicks}</strong> (Combo máx: ${s.maxResonanceComboReached})</span>
        <span>• Cometas dorados atrapados: <strong>${s.totalCometsCaught}</strong></span>
        <span>• Ciclos de Big Bang: <strong>${s.bigBangsTotal}</strong></span>
      </div>
    `;
    this.panelContentEl.appendChild(statsBox);

    // Developer Debug Tools (Section 7.16)
    const debugBox = document.createElement('div');
    debugBox.className = 'section-box';
    debugBox.innerHTML = `
      <div class="section-title">Herramientas de Depuración (Dev)</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button class="buy-mode-btn" id="dbg-speed-1">×1</button>
        <button class="buy-mode-btn" id="dbg-speed-10">×10 Tiempo</button>
        <button class="buy-mode-btn" id="dbg-speed-100">×100 Tiempo</button>
        <button class="buy-mode-btn" id="dbg-give-energy" data-testid="dbg-give-energy">+Energía ×100</button>
        <button class="buy-mode-btn" id="dbg-spawn-comet">Forzar Cometa</button>
        <button class="buy-mode-btn" id="dbg-next-era">Saltar Era</button>
        <button class="buy-mode-btn" id="dbg-unlock-all" data-testid="dbg-unlock-all">Abrir 5 Capas</button>
      </div>
    `;
    this.panelContentEl.appendChild(debugBox);

    document.getElementById('dbg-speed-1')?.addEventListener('click', () => (this.timeScale = 1));
    document.getElementById('dbg-speed-10')?.addEventListener('click', () => (this.timeScale = 10));
    document.getElementById('dbg-speed-100')?.addEventListener('click', () => (this.timeScale = 100));
    document.getElementById('dbg-give-energy')?.addEventListener('click', () => {
      const boost = Decimal.max(D(1e7), s.energy.times(100));
      s.energy = s.energy.plus(boost);
      s.totalEnergyProduced = s.totalEnergyProduced.plus(boost);
      s.allTimeEnergyProduced = s.allTimeEnergyProduced.plus(boost);
      this.sim.checkEraProgression();
      this.sim.checkAchievements();
      this.updateHUD();
      this.renderTabsNav();
    });
    document.getElementById('dbg-spawn-comet')?.addEventListener('click', () => {
      this.scene.forceSpawnComet();
    });
    document.getElementById('dbg-next-era')?.addEventListener('click', () => {
      const nextIdx = Math.min(ERAS.length - 1, s.currentEraIndex + 1);
      const nextEra = ERAS[nextIdx];
      s.energy = Decimal.max(s.energy, nextEra.energyThreshold);
      s.totalEnergyProduced = Decimal.max(s.totalEnergyProduced, nextEra.energyThreshold);
      this.sim.checkEraProgression();
      this.updateHUD();
    });
    document.getElementById('dbg-unlock-all')?.addEventListener('click', () => {
      s.bigBangsTotal = Math.max(s.bigBangsTotal, 25);
      s.darkMatter = s.darkMatter.plus(500);
      s.darkMatterTotal = s.darkMatterTotal.plus(500);
      s.realityFragments = s.realityFragments.plus(1000);
      s.parallelUniverseAttention['uni_dense'] = 3;
      s.attentionCurrency = s.attentionCurrency.plus(5000);
      s.aeonsCurrency = s.aeonsCurrency.plus(250);
      this.sim.recalculateRates();
      this.renderTabsNav();
      this.renderSettingsTab();
      this.updateHUD();
    });
  }

  public update(dt: number): void {
    if (this.bigBangArmed) {
      this.bigBangArmedTimer -= dt;
      if (this.bigBangArmedTimer <= 0) {
        this.bigBangArmed = false;
        if (this.activeTab === 'bigbang') this.renderBigBangTab();
      }
    }

    this.newsTimer += dt;
    if (this.newsTimer >= 14.0) {
      this.newsTimer = 0;
      this.advanceNewsTicker();
    }

    this.updateHUD();
    this.updateGeneratorsLiveAffordability();
  }

  public updateHUD(): void {
    const s = this.sim.state;
    const era = ERAS[s.currentEraIndex] ?? ERAS[0];

    this.eraBadgeEl.textContent = era.name;
    this.energyValEl.textContent = this.fmt(s.energy);
    this.spsValEl.textContent = this.fmt(s.energyPerSecond);
    this.clickValEl.textContent = this.fmt(s.energyPerClick);

    this.resonanceBadgeEl.textContent = `×${s.resonanceMultiplier.toFixed(2)}`;
    this.resonanceBadgeEl.classList.toggle('active', s.resonanceCombo > 0);

    const nextTarget = this.sim.getNextBestTarget();
    if (nextTarget) {
      const pct = Math.round(nextTarget.progress * 100);
      this.nextGoalNameEl.textContent = `${nextTarget.name} (${this.fmt(nextTarget.cost)})`;
      this.nextGoalPctEl.textContent = `${pct}%`;
      this.nextGoalFillEl.style.width = `${pct}%`;
    }

    // Active buffs row
    const weekly = getCurrentWeeklyEvent();
    let buffsHtml = `<span class="buff-chip" title="${weekly.description}">★ ${weekly.name}</span>`;
    for (const eff of s.activeCometEffects) {
      const label = eff.type === 'frenzy' ? `Frenesí ×${eff.multiplier}` : `Clic ×${eff.multiplier}`;
      buffsHtml += `<span class="buff-chip">☄ ${label} (${Math.ceil(eff.durationRemaining)}s)</span>`;
    }
    if (this.buffsRowEl.innerHTML !== buffsHtml) {
      this.buffsRowEl.innerHTML = buffsHtml;
    }

    if (this.sim.isConsciousnessUnlocked()) {
      this.observerCardEl.style.display = 'flex';
    }
  }

  private updateGeneratorsLiveAffordability(): void {
    if (this.activeTab !== 'generators') return;
    const s = this.sim.state;
    const cards = this.panelContentEl.querySelectorAll<HTMLButtonElement>('.gen-card[data-gen-id]');
    cards.forEach((btn) => {
      const genId = btn.dataset.genId!;
      const gen = GENERATORS.find((g) => g.id === genId);
      if (!gen) return;
      const owned = s.generators[genId]?.owned ?? 0;
      const cost =
        this.buyMode === 'max'
          ? calculateBatchCost(gen.baseCost, gen.costMultiplier, owned, 1, s)
          : calculateBatchCost(gen.baseCost, gen.costMultiplier, owned, this.buyMode, s);

      const canAfford = s.energy.gte(cost);
      btn.disabled = !canAfford;
      btn.classList.toggle('affordable', canAfford);
    });
  }
}
