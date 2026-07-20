/* eslint-disable no-alert */
(() => {
  // 빌드 버전(로컬에서 index.html을 바로 열어도 표시되도록 코드에 내장)
  // 수정할 때마다 값을 갱신합니다. 포맷: YYYYMMDD-HHMMSS
  const BUILD_VERSION = "20260720-105243";

  const SUPABASE_URL = "https://dyfycrmltqosezmsufup.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Znljcm1sdHFvc2V6bXN1ZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzg4MDIsImV4cCI6MjA5NTYxNDgwMn0.VpJCBdD1g8YZiaa6Zah9ZKIu3ydu_RkSgWCdEXe2QGw";
  const SUPABASE_TABLE = "coinbreaker_state";

  function getSupabaseRowId() {
    const p = String(location.pathname || "").toLowerCase();
    // maker는 메인과 상태를 분리해서 저장합니다.
    // (메인/컨트롤: main, maker: maker)
    if (p.includes("/maker/") || p.endsWith("/maker") || p.endsWith("/maker/index.html")) return "maker";
    return "main";
  }

  function isMakerPage() {
    return getSupabaseRowId() === "maker";
  }

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const LS_SIDE_TS = "coinbreaker_side_ts";
  const LS_ENTRY_TS = "coinbreaker_entry_ts";

  const DEFAULTS = {
    percentMin: "20",
    percentMax: "25",
    profitMin: "300",
    profitMax: "1000",
    symbol: "DOGE/USDT",
    side: "LONG",
    leverage: "100x",
    entry: "0.11445",
    bgZoom: 1.0,
    count: 1,
    prefix: "screenshot",
  };

  const els = {
    cardRoot: document.getElementById("cardRoot"),
    toast: document.getElementById("toast"),
    centerTip: document.getElementById("centerTip"),
    croppedPreviewImg: document.getElementById("croppedPreviewImg"),
    maskedPreviewEmpty: document.getElementById("maskedPreviewEmpty"),

    percentMin: document.getElementById("inpPercentMin"),
    percentMax: document.getElementById("inpPercentMax"),
    profitMin: document.getElementById("inpProfitMin"),
    profitMax: document.getElementById("inpProfitMax"),
    symbol: document.getElementById("inpSymbol"),
    side: document.getElementById("inpSide"),
    leverage: document.getElementById("inpLeverage"),
    entry: document.getElementById("inpEntry"),
    entryReal: document.getElementById("inpEntryReal"),
    entryRandPlace: document.getElementById("inpEntryRandPlace"),
    entryRandGap: document.getElementById("inpEntryRandGap"),
    entryZeroProb: document.getElementById("inpEntryZeroProb"),
    exitZeroProb: document.getElementById("inpExitZeroProb"),
    exit: document.getElementById("inpExit"),
    bgZoom: document.getElementById("inpBgZoom"),
    bgShiftX: document.getElementById("inpBgShiftX"),
    bgShiftY: document.getElementById("inpBgShiftY"),
    count: document.getElementById("inpCount"),
    prefix: document.getElementById("inpPrefix"),

    generate: document.getElementById("btnGenerate"),
    downloadZip: document.getElementById("btnDownloadZip"),
    reroll: document.getElementById("btnReroll"),
    reset: document.getElementById("btnReset"),
    cloudLoad: document.getElementById("btnCloudLoad"),
    cloudSave: document.getElementById("btnCloudSave"),
    zoomIn: document.getElementById("btnZoomIn"),
    zoomOut: document.getElementById("btnZoomOut"),
    shiftUp: document.getElementById("btnShiftUp"),
    shiftDown: document.getElementById("btnShiftDown"),
    shiftLeft: document.getElementById("btnShiftLeft"),
    shiftRight: document.getElementById("btnShiftRight"),
    shiftReset: document.getElementById("btnShiftReset"),

    phraseFmt: document.getElementById("inpPhraseFmt"),
    phraseUnit: document.getElementById("inpPhraseUnit"),
    phrasePart3: document.getElementById("inpPhrasePart3"),
    phrasePart4: document.getElementById("inpPhrasePart4"),
    phrasePart4Prob: document.getElementById("inpPhrasePart4Prob"),

    txtPercent: document.getElementById("txtPercent"),
    txtProfit: document.getElementById("txtProfit"),
    txtSymbol: document.getElementById("txtSymbol"),
    txtSide: document.getElementById("txtSide"),
    txtLeverage: document.getElementById("txtLeverage"),
    txtEntry: document.getElementById("txtEntry"),
    txtExit: document.getElementById("txtExit"),
  };

  let cardCustomStyles = {};

  const sideUi = {
    longBtn: document.getElementById("btnSideLong"),
    shortBtn: document.getElementById("btnSideShort"),
  };

  let cloudReady = false;
  let cloudSaveTimer = null;
  let cloudSavePending = false;
  let generatedItems = [];
  let previewIndex = -1;
  let samplePercent = null;
  let sampleProfit = null;
  let sampleProfitRaw = null;
  let sampleEntry = null;
  let lastPercentKey = null;
  let lastProfitKey = null;
  let lastEntryBase = null;
  let lastPresetPhrase = "";
  let lastCroppedPreviewUrl = null;
  let bgShiftX = 0;
  let bgShiftY = 0;
  let overlayState = {
    src: "",
    opacity: 0.5,
    scale: 1,
    x: 0,
    y: 0,
  };

  const DEFAULT_PHRASE_CFG = {
    fmt: ["int", "2", "1"],
    unit: ["%", "프로", "퍼", ""],
    part3: ["감사합니다", "감사합니다", "고맙습니다", "고맙습니다", "수익입니다"],
    // 프리셋 1~10은 "4) 추가 마무리 문구" 항목 수가 10개 미만이면 동작을 막습니다.
    // 기본 상태에서도 프리셋이 바로 동작하도록, 빈칸 포함 10개로 기본값을 채웁니다.
    // (빈칸은 "추가 문구가 안 붙는" 효과)
    part4: ["", "", "", "", "", "", "", "대표님.", "대단하십니다.", "대박입니다."],
    part4Prob: 25,
  };
  const DEFAULT_ENTRY_VARIATION_CFG = {
    decimalPlace: 2,
    gap: 2,
    entryZeroProb: 50,
    exitZeroProb: 50,
  };
  let phraseCfg = JSON.parse(JSON.stringify(DEFAULT_PHRASE_CFG));
  const DEFAULT_CROP_CFG = {
    fullCaptureProb: 5,
    widthMinPct: 50,
    widthMaxPct: 100,
    startPadXMax: 28,
    startPadYMax: 18,
    bottomPadMin: 12,
    bottomPadMax: 36,
  };
  let cropCfg = { ...DEFAULT_CROP_CFG };

  const DEFAULT_PRESET_PROFIT_CFG = {
    "1": { min: "50", max: "100" },
    "2": { min: "100", max: "200" },
    "3": { min: "300", max: "400" },
    "4": { min: "300", max: "400" },
    "5": { min: "500", max: "700" },
    "6": { min: "1000", max: "2000" },
    "7": { min: "1500", max: "2500" },
    "8": { min: "2500", max: "3500" },
    "9": { min: "3500", max: "4500" },
    "10": { min: "5000", max: "6000" },
  };
  const DEFAULT_PRESET_PROFIT_SCALE_PCT = 100;
  const DEFAULT_PRESET_PROFIT_AUTO_SCALE = {
    enabled: false,
    // 규칙은 "나중에 체크한 항목은 체크가 안 되게" 하기 위해 서로 겹치지 않도록 강제합니다.
    // 구간은 [min, max) 기준으로 판정합니다. (예: 20~30과 30~40은 허용)
    rules: [
      { enabled: true, minP: 20, maxP: 30, scalePct: 100 },
      { enabled: true, minP: 30, maxP: 40, scalePct: 120 },
      { enabled: true, minP: 40, maxP: 60, scalePct: 140 },
      { enabled: false, minP: 60, maxP: 80, scalePct: 100 },
      { enabled: false, minP: 80, maxP: 100, scalePct: 100 },
    ],
  };
  let presetProfitCfg = JSON.parse(JSON.stringify(DEFAULT_PRESET_PROFIT_CFG));
  let presetProfitScalePct = DEFAULT_PRESET_PROFIT_SCALE_PCT;
  let presetProfitAutoScale = JSON.parse(JSON.stringify(DEFAULT_PRESET_PROFIT_AUTO_SCALE));
  let presetPart4Assignment = null;
  let presetPart4PoolKey = "";
  let lastPresetRetryCtx = null;
  let presetRetryArmed = false;

  function ensureCropGuideEl() {
    if (!els.cardRoot) return null;
    let el = document.getElementById("cropGuide");
    if (!el) {
      el = document.createElement("div");
      el.id = "cropGuide";
      el.className = "crop-guide";
      el.setAttribute("data-html2canvas-ignore", "true");
      els.cardRoot.appendChild(el);
    }
    return el;
  }

  function computeCropBoundsForUi() {
    if (!els.cardRoot) return null;
    const rr = els.cardRoot.getBoundingClientRect();
    const W = rr.width;
    const H = rr.height;

    const percentRect =
      getRectForSelectors(["#txtPercent", "#txtPercentSign"]) ||
      getRectForSelector("#txtPercent") ||
      { x: 0, y: 0, w: 1, h: 1 };
    const profitRect = getRectForSelectors(["#txtProfit"]) || getRectForSelector("#txtProfit") || percentRect;
    const exitRect = getRectForSelector("#txtExit") || profitRect;

    const startPadXMax = Math.max(0, Math.round(cropCfg?.startPadXMax ?? DEFAULT_CROP_CFG.startPadXMax));
    const startPadYMax = Math.max(0, Math.round(cropCfg?.startPadYMax ?? DEFAULT_CROP_CFG.startPadYMax));
    const x = Math.max(0, Math.floor(percentRect.x - Math.round(startPadXMax / 2)));
    const y = Math.max(0, Math.floor(percentRect.y - Math.round(startPadYMax / 2)));

    const widthMinRatio = clamp((cropCfg?.widthMinPct ?? DEFAULT_CROP_CFG.widthMinPct) / 100, 0.01, 1);
    const widthMaxRatio = clamp((cropCfg?.widthMaxPct ?? DEFAULT_CROP_CFG.widthMaxPct) / 100, widthMinRatio, 1);

    let minW = Math.round(widthMinRatio * W);
    let maxW = Math.round(widthMaxRatio * W);
    minW = Math.max(1, Math.min(W - x, minW));
    maxW = Math.max(1, Math.min(W - x, maxW));

    const padBottomMin = Math.max(0, Math.round(cropCfg?.bottomPadMin ?? DEFAULT_CROP_CFG.bottomPadMin));
    const padBottomMax = Math.max(padBottomMin, Math.round(cropCfg?.bottomPadMax ?? DEFAULT_CROP_CFG.bottomPadMax));
    const padBottomMid = Math.round((padBottomMin + padBottomMax) / 2);

    const minH = Math.ceil(profitRect.y + profitRect.h + padBottomMid) - y;
    const maxH = Math.ceil(exitRect.y + exitRect.h + padBottomMid) - y;
    const lo = Math.max(1, Math.min(H - y, Math.min(minH, maxH)));
    const hi = Math.max(lo, Math.min(H - y, Math.max(minH, maxH)));
    const sampleH = Math.round((lo + hi) / 2);

    return { W, H, x, y, minW, maxW, h: sampleH };
  }

  function updateCropGuideUi() {
    const guide = ensureCropGuideEl();
    const bounds = computeCropBoundsForUi();
    if (!guide || !bounds) return;
    guide.style.left = `${bounds.x}px`;
    guide.style.top = `${bounds.y}px`;
    guide.style.width = `${Math.max(1, bounds.minW)}px`;
    guide.style.height = `${Math.max(1, bounds.h)}px`;

    const summary = document.getElementById("cropSummary");
    if (summary) {
      const minPct = Math.round((bounds.minW / bounds.W) * 100);
      const maxPct = Math.round((bounds.maxW / bounds.W) * 100);
      summary.textContent =
        `가로(좌우) 설정 범위: ${minPct}% ~ ${maxPct}% (오른쪽이 잘림).`;
    }
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1000);
  }
  showToast._t = null;

  function showToastFor(message, ms) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), ms);
  }

  function showCenterTip(message, ms = 1000) {
    if (!els.centerTip) return;
    els.centerTip.textContent = message;
    els.centerTip.classList.add("show");
    clearTimeout(showCenterTip._t);
    showCenterTip._t = setTimeout(() => els.centerTip.classList.remove("show"), ms);
  }
  showCenterTip._t = null;

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.max(a, Math.min(x, b));
  }

  function randInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    if (b <= a) return a;
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function parseNumber(text, fallback) {
    const t = String(text ?? "").trim().replace(/,/g, "").replace("%", "");
    const n = Number(t);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseManWon(text, fallbackManWon) {
    return Math.floor(parseNumber(text, fallbackManWon) * 10000);
  }

  function getPercentMinMax() {
    const a = parseNumber(els.percentMin?.value, 20);
    const b = parseNumber(els.percentMax?.value, 25);
    return { minP: Math.min(a, b), maxP: Math.max(a, b) };
  }

  function getProfitMinMax() {
    const a = parseManWon(els.profitMin?.value, 300);
    const b = parseManWon(els.profitMax?.value, 1000);
    return { minWon: Math.min(a, b), maxWon: Math.max(a, b) };
  }

  function pickPercent2NoZeroSecondDigit(pMin, pMax) {
    const minI = Math.ceil(Math.min(pMin, pMax) * 100);
    const maxI = Math.floor(Math.max(pMin, pMax) * 100);
    let pi = minI;
    if (minI !== maxI) {
      for (let k = 0; k < 60; k++) {
        const cand = randInt(minI, maxI);
        if (Math.abs(cand) % 10 !== 0) {
          pi = cand;
          break;
        }
        pi = cand;
      }
      if (Math.abs(pi) % 10 === 0) {
        if (pi + 1 <= maxI) pi += 1;
        else if (pi - 1 >= minI) pi -= 1;
      }
    }
    return pi / 100;
  }

  function randomPercentProfit() {
    const { minP, maxP } = getPercentMinMax();
    const { minWon, maxWon } = getProfitMinMax();
    const p = pickPercent2NoZeroSecondDigit(minP, maxP);
    const f = minWon === maxWon ? minWon : randInt(minWon, maxWon);
    return { percent: p, profit: f };
  }

  function getEffectiveProfitScalePctForPercent(percentValue) {
    const p = Math.abs(Number(percentValue) || 0);
    if (presetProfitAutoScale?.enabled) {
      const rules = Array.isArray(presetProfitAutoScale.rules) ? presetProfitAutoScale.rules : [];
      for (const r of rules) {
        if (!r || !r.enabled) continue;
        const mn = Number(r.minP);
        const mx = Number(r.maxP);
        if (!Number.isFinite(mn) || !Number.isFinite(mx)) continue;
        const lo = Math.min(mn, mx);
        const hi = Math.max(mn, mx);
        // [min, max)
        if (p >= lo && p < hi) return clamp(r.scalePct, 0, 1000);
      }
    }
    return clamp(presetProfitScalePct ?? DEFAULT_PRESET_PROFIT_SCALE_PCT, 0, 1000);
  }

  function applyProfitScale(won, scalePct) {
    const w = Number(won);
    if (!Number.isFinite(w)) return Number(won) || 0;
    const s = clamp(scalePct, 0, 1000);
    return Math.floor((w * s) / 100 + 1e-9);
  }

  function formatProfit(won) {
    return `${Number(won).toLocaleString("en-US")} 원`;
  }

  function formatPercentText(value) {
    let percentText = Number(value).toFixed(2);
    if (percentText.includes(".")) {
      percentText = percentText.replace(/0+$/, "").replace(/\.$/, "");
    }
    return percentText;
  }

  function parseEntryToInt(entryText) {
    const n = Number(String(entryText || "").trim());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100000);
  }

  function entryIntToText(intVal) {
    return (intVal / 100000).toFixed(5);
  }

  function trimTrailingZeroIn5dp(text) {
    const s = String(text || "").trim();
    if (!s.includes(".")) return s;
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function getEntryVariationCfg() {
    return {
      decimalPlace: Math.round(clamp(els.entryRandPlace?.value, 1, 5)),
      gap: Math.round(clamp(els.entryRandGap?.value, 0, 20)),
      entryZeroProb: clamp(els.entryZeroProb?.value, 0, 100),
      exitZeroProb: clamp(els.exitZeroProb?.value, 0, 100),
    };
  }

  function setEntryVariationUi(cfg) {
    const next = cfg && typeof cfg === "object" ? cfg : DEFAULT_ENTRY_VARIATION_CFG;
    if (els.entryRandPlace) els.entryRandPlace.value = String(Math.round(clamp(next.decimalPlace, 1, 5)));
    if (els.entryRandGap) els.entryRandGap.value = String(Math.round(clamp(next.gap, 0, 20)));
    if (els.entryZeroProb) els.entryZeroProb.value = String(clamp(next.entryZeroProb, 0, 100));
    if (els.exitZeroProb) els.exitZeroProb.value = String(clamp(next.exitZeroProb, 0, 100));
  }

  function applyPriceTailVariation(intVal, decimalPlace, zeroProb) {
    const safeInt = Math.max(0, Math.round(Number(intVal) || 0));
    const place = Math.round(clamp(decimalPlace, 1, 5));
    const step = Math.pow(10, 5 - place);
    if (step <= 1) return safeInt;
    const head = Math.floor(safeInt / step) * step;
    if (Math.random() < clamp(zeroProb, 0, 100) / 100) return head;
    return head + randInt(0, step - 1);
  }

  function randomEntryFromBase(entryBaseText) {
    const baseInt = parseEntryToInt(entryBaseText);
    if (baseInt == null) return String(entryBaseText || "").trim();
    const { decimalPlace, gap, entryZeroProb } = getEntryVariationCfg();
    const step = Math.pow(10, 5 - decimalPlace);
    const shifted = Math.max(0, baseInt + randInt(-gap, gap) * step);
    const finalInt = applyPriceTailVariation(shifted, decimalPlace, entryZeroProb);
    return entryIntToText(finalInt);
  }

  // 프리셋 수익금 범위는 "만원" 단위 문자열을 저장합니다. (예: 50 ~ 100)

  function buildRenderItem(baseEntry) {
    const { percent, profit: rawProfit } = randomPercentProfit();
    const scalePct = getEffectiveProfitScalePctForPercent(percent);
    const profit = applyProfitScale(rawProfit, scalePct);
    return { percent, profit, entry: randomEntryFromBase(baseEntry) };
  }

  function getRenderSignature(item) {
    if (!item) return "";
    return [
      formatPercentText(item.percent),
      formatProfit(item.profit),
      String(item.entry || "").trim(),
    ].join("|");
  }

  function getCurrentRenderSignature() {
    return [
      String(els.txtPercent?.textContent || "").trim(),
      String(els.txtProfit?.textContent || "").trim(),
      String(els.entryReal?.value || "").trim(),
    ].join("|");
  }

  function buildRenderItemDifferentFrom(baseEntry, avoidSignature) {
    let fallback = buildRenderItem(baseEntry);
    if (!avoidSignature) return fallback;
    if (getRenderSignature(fallback) !== avoidSignature) return fallback;
    for (let i = 0; i < 48; i++) {
      const item = buildRenderItem(baseEntry);
      fallback = item;
      if (getRenderSignature(item) !== avoidSignature) return item;
    }
    return fallback;
  }

  function parseLeverage(text) {
    const m = String(text || "").match(/(\d+(\.\d+)?)/);
    const v = m ? Number(m[1]) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function computeExit(entry, pnlPercent, side, leverageText) {
    const e = Number(entry);
    const lev = parseLeverage(leverageText);
    const p = (Number(pnlPercent) / 100) / lev;
    const isShort = String(side || "").toUpperCase() === "SHORT";
    const raw = isShort ? e * (1 - p) : e * (1 + p);
    const baseInt = Math.max(0, Math.round((raw + Number.EPSILON) * 100000));
    const { decimalPlace, exitZeroProb } = getEntryVariationCfg();
    const finalInt = applyPriceTailVariation(baseInt, decimalPlace, exitZeroProb);
    return entryIntToText(finalInt);
  }

  function getTs(key) {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  }

  function setTs(key) {
    localStorage.setItem(key, String(Date.now()));
  }

  function cloudConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  function sbHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async function fetchCloudRow(id) {
    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=data&id=eq.${encodeURIComponent(id)}&limit=1`;
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) throw new Error(`load failed: ${res.status}`);
    const rows = await res.json();
    return rows && rows[0] && rows[0].data ? rows[0].data : null;
  }

  function mergeSharedLayoutState(baseState, sharedLayoutState) {
    const base = baseState && typeof baseState === "object" ? baseState : {};
    const shared = sharedLayoutState && typeof sharedLayoutState === "object" ? sharedLayoutState : null;
    if (!shared) return base;
    return {
      ...base,
      bg: shared.bg ?? base.bg,
      overlay: shared.overlay ?? base.overlay,
      cardCustomStyles: shared.cardCustomStyles ?? base.cardCustomStyles,
    };
  }

  function linesToWeightedArray(text, fallbackArr) {
    const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n").map((x) => x.trimEnd());
    const out = [];
    for (const raw of lines) {
      if (!raw) {
        out.push("");
        continue;
      }
      const m = raw.match(/^(.*?)(?:\|(\d+))?$/);
      const phrase = (m?.[1] ?? "").trim();
      const w = m?.[2] ? clamp(Number(m[2]), 1, 50) : 1;
      for (let i = 0; i < w; i++) out.push(phrase);
    }
    return out.length ? out : Array.isArray(fallbackArr) ? fallbackArr.slice() : [];
  }

  function pickFrom(arr, fallback = "") {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr[Math.floor(Math.random() * arr.length)] ?? fallback;
  }

  function cfgArrayToText(arr) {
    return (arr || []).map((x) => String(x ?? "")).join("\n");
  }

  function fillPhraseUiFromCfg() {
    if (els.phraseFmt) els.phraseFmt.value = cfgArrayToText(phraseCfg.fmt);
    if (els.phraseUnit) els.phraseUnit.value = cfgArrayToText(phraseCfg.unit);
    if (els.phrasePart3) els.phrasePart3.value = cfgArrayToText(phraseCfg.part3);
    if (els.phrasePart4) els.phrasePart4.value = cfgArrayToText(phraseCfg.part4);
    if (els.phrasePart4Prob) els.phrasePart4Prob.value = String(clamp(phraseCfg.part4Prob, 0, 100));
  }

  function readPhraseCfgFromUi() {
    return {
      fmt: linesToWeightedArray(els.phraseFmt?.value, DEFAULT_PHRASE_CFG.fmt),
      unit: linesToWeightedArray(els.phraseUnit?.value, DEFAULT_PHRASE_CFG.unit),
      part3: linesToWeightedArray(els.phrasePart3?.value, DEFAULT_PHRASE_CFG.part3),
      part4: linesToWeightedArray(els.phrasePart4?.value, DEFAULT_PHRASE_CFG.part4),
      part4Prob: clamp(els.phrasePart4Prob?.value, 0, 100),
    };
  }

  function normalizePresetProfitCfg(cfg) {
    const out = JSON.parse(JSON.stringify(DEFAULT_PRESET_PROFIT_CFG));
    if (!cfg || typeof cfg !== "object") return out;
    for (let i = 1; i <= 10; i++) {
      const k = String(i);
      const v = cfg[k];
      if (!v || typeof v !== "object") continue;
      out[k] = {
        min: String(v.min ?? out[k]?.min ?? "").trim(),
        max: String(v.max ?? out[k]?.max ?? "").trim(),
      };
    }
    return out;
  }

  function fillPresetProfitUiFromCfg() {
    for (let i = 1; i <= 10; i++) {
      const k = String(i);
      const minEl = document.getElementById(`inpPresetProfitMin${k}`);
      const maxEl = document.getElementById(`inpPresetProfitMax${k}`);
      if (minEl) minEl.value = String(presetProfitCfg?.[k]?.min ?? "");
      if (maxEl) maxEl.value = String(presetProfitCfg?.[k]?.max ?? "");
    }
    const scaleEl = document.getElementById("inpPresetProfitScalePct");
    if (scaleEl) scaleEl.value = String(Math.round(clamp(presetProfitScalePct, 0, 1000)));

    // 자동 배율 UI
    const autoChk = document.getElementById("chkPresetProfitAutoScale");
    const autoWrap = document.getElementById("presetProfitAutoScaleWrap");
    if (autoChk) autoChk.checked = !!presetProfitAutoScale?.enabled;
    if (autoWrap) autoWrap.style.display = presetProfitAutoScale?.enabled ? "block" : "none";
    updatePresetProfitScaleUiState();
    for (let i = 1; i <= 5; i++) {
      const r = presetProfitAutoScale?.rules?.[i - 1] || DEFAULT_PRESET_PROFIT_AUTO_SCALE.rules[i - 1];
      const chk = document.getElementById(`chkPresetProfitAutoRule${i}`);
      const minEl = document.getElementById(`inpPresetProfitAutoMin${i}`);
      const maxEl = document.getElementById(`inpPresetProfitAutoMax${i}`);
      const scaleEl2 = document.getElementById(`inpPresetProfitAutoScale${i}`);
      if (chk) chk.checked = !!r?.enabled;
      if (minEl) minEl.value = String(r?.minP ?? "");
      if (maxEl) maxEl.value = String(r?.maxP ?? "");
      if (scaleEl2) scaleEl2.value = String(r?.scalePct ?? "");
    }
  }

  function readPresetProfitCfgFromUi() {
    const out = JSON.parse(JSON.stringify(DEFAULT_PRESET_PROFIT_CFG));
    for (let i = 1; i <= 10; i++) {
      const k = String(i);
      const minEl = document.getElementById(`inpPresetProfitMin${k}`);
      const maxEl = document.getElementById(`inpPresetProfitMax${k}`);
      const min = minEl ? String(minEl.value ?? "").trim() : String(out[k]?.min ?? "");
      const max = maxEl ? String(maxEl.value ?? "").trim() : String(out[k]?.max ?? "");
      out[k] = { min, max };
    }
    return out;
  }

  function normalizePresetProfitAutoScale(cfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_PRESET_PROFIT_AUTO_SCALE));
    if (!cfg || typeof cfg !== "object") return base;
    base.enabled = !!cfg.enabled;
    const inRules = Array.isArray(cfg.rules) ? cfg.rules : [];
    base.rules = base.rules.map((r, idx) => {
      const v = inRules[idx] && typeof inRules[idx] === "object" ? inRules[idx] : r;
      const minP = parseNumber(v.minP, r.minP);
      const maxP = parseNumber(v.maxP, r.maxP);
      const a = Number.isFinite(minP) ? minP : r.minP;
      const b = Number.isFinite(maxP) ? maxP : r.maxP;
      return {
        enabled: !!v.enabled,
        minP: Math.min(a, b),
        maxP: Math.max(a, b),
        scalePct: clamp(parseNumber(v.scalePct, r.scalePct), 0, 1000),
      };
    });
    return base;
  }

  function updatePresetProfitScaleUiState() {
    const scaleEl = document.getElementById("inpPresetProfitScalePct");
    const rowEl = document.getElementById("presetProfitScaleRow");
    const hintEl = document.getElementById("presetProfitScaleHint");
    const autoEnabled = !!presetProfitAutoScale?.enabled;
    if (scaleEl) scaleEl.disabled = autoEnabled;
    if (rowEl) rowEl.classList.toggle("is-disabled", autoEnabled);
    if (hintEl) {
      hintEl.textContent = autoEnabled
        ? "자동배율적용이 켜져 있어서 전체 배율은 적용되지 않습니다."
        : "예: 200% = 2배, 50% = 절반";
    }
  }

  function readPresetProfitAutoScaleFromUi() {
    const out = normalizePresetProfitAutoScale(presetProfitAutoScale);
    const autoChk = document.getElementById("chkPresetProfitAutoScale");
    out.enabled = !!autoChk?.checked;
    out.rules = out.rules.map((r, idx) => {
      const i = idx + 1;
      const chk = document.getElementById(`chkPresetProfitAutoRule${i}`);
      const minEl = document.getElementById(`inpPresetProfitAutoMin${i}`);
      const maxEl = document.getElementById(`inpPresetProfitAutoMax${i}`);
      const scaleEl = document.getElementById(`inpPresetProfitAutoScale${i}`);
      const minP = parseNumber(minEl?.value, r.minP);
      const maxP = parseNumber(maxEl?.value, r.maxP);
      return {
        enabled: !!chk?.checked,
        minP: Math.min(minP, maxP),
        maxP: Math.max(minP, maxP),
        scalePct: clamp(parseNumber(scaleEl?.value, r.scalePct), 0, 1000),
      };
    });
    return out;
  }

  function rangesOverlap(aMin, aMax, bMin, bMax) {
    const A0 = Math.min(aMin, aMax);
    const A1 = Math.max(aMin, aMax);
    const B0 = Math.min(bMin, bMax);
    const B1 = Math.max(bMin, bMax);
    // [min, max) 기준
    return A0 < B1 && A1 > B0;
  }

  function validateAutoScaleNoOverlap(changedIndex0Based) {
    const cfg = readPresetProfitAutoScaleFromUi();
    const changed = cfg.rules[changedIndex0Based];
    if (!changed || !changed.enabled) return true;
    for (let j = 0; j < cfg.rules.length; j++) {
      if (j === changedIndex0Based) continue;
      const other = cfg.rules[j];
      if (!other?.enabled) continue;
      if (rangesOverlap(changed.minP, changed.maxP, other.minP, other.maxP)) {
        // 나중에 체크한 건 체크 해제
        const chk = document.getElementById(`chkPresetProfitAutoRule${changedIndex0Based + 1}`);
        if (chk) chk.checked = false;
        showToastFor("수익률 구간이 겹쳐서 중복 체크할 수 없습니다.", 2500);
        // cfg 갱신(해제 반영)
        presetProfitAutoScale = readPresetProfitAutoScaleFromUi();
        scheduleCloudSave();
        return false;
      }
    }
    return true;
  }

  function bindPresetProfitAutoScaleUi() {
    const autoChk = document.getElementById("chkPresetProfitAutoScale");
    const autoWrap = document.getElementById("presetProfitAutoScaleWrap");
    if (autoChk) {
      autoChk.addEventListener("change", () => {
        presetProfitAutoScale = readPresetProfitAutoScaleFromUi();
        if (autoWrap) autoWrap.style.display = presetProfitAutoScale.enabled ? "block" : "none";
        updatePresetProfitScaleUiState();
        scheduleCloudSave();
      });
    }
    for (let i = 1; i <= 5; i++) {
      const idx = i - 1;
      const chk = document.getElementById(`chkPresetProfitAutoRule${i}`);
      const minEl = document.getElementById(`inpPresetProfitAutoMin${i}`);
      const maxEl = document.getElementById(`inpPresetProfitAutoMax${i}`);
      const scaleEl = document.getElementById(`inpPresetProfitAutoScale${i}`);
      if (chk) {
        chk.addEventListener("change", () => {
          presetProfitAutoScale = readPresetProfitAutoScaleFromUi();
          if (chk.checked) validateAutoScaleNoOverlap(idx);
          else scheduleCloudSave();
        });
      }
      [minEl, maxEl, scaleEl].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", () => {
          presetProfitAutoScale = readPresetProfitAutoScaleFromUi();
          if (document.getElementById(`chkPresetProfitAutoRule${i}`)?.checked) {
            validateAutoScaleNoOverlap(idx);
          } else {
            scheduleCloudSave();
          }
        });
        el.addEventListener("change", () => {
          presetProfitAutoScale = readPresetProfitAutoScaleFromUi();
          if (document.getElementById(`chkPresetProfitAutoRule${i}`)?.checked) {
            validateAutoScaleNoOverlap(idx);
          } else {
            scheduleCloudSave();
          }
        });
      });
    }
  }

  function bindPresetProfitUi() {
    const onEdit = () => {
      presetProfitCfg = readPresetProfitCfgFromUi();
      scheduleCloudSave();
    };
    for (let i = 1; i <= 10; i++) {
      const k = String(i);
      const minEl = document.getElementById(`inpPresetProfitMin${k}`);
      const maxEl = document.getElementById(`inpPresetProfitMax${k}`);
      [minEl, maxEl].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", onEdit);
        el.addEventListener("change", onEdit);
      });
    }
    const scaleEl = document.getElementById("inpPresetProfitScalePct");
    if (scaleEl) {
      const onScaleEdit = () => {
        presetProfitScalePct = clamp(parseNumber(scaleEl.value, DEFAULT_PRESET_PROFIT_SCALE_PCT), 0, 1000);
        scheduleCloudSave();
      };
      scaleEl.addEventListener("input", onScaleEdit);
      scaleEl.addEventListener("change", onScaleEdit);
    }
    bindPresetProfitAutoScaleUi();
    fillPresetProfitUiFromCfg();
  }

  function getPart4ListAll(cfg) {
    const arr = Array.isArray(cfg?.part4) ? cfg.part4 : [];
    return arr.map((v) => String(v ?? "").trim());
  }

  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function ensurePresetPart4Assignment(cfg) {
    const list = getPart4ListAll(cfg);
    const key = list.join("\u0001");
    if (presetPart4Assignment && presetPart4PoolKey === key && presetPart4Assignment.length === 10) return presetPart4Assignment;
    if (list.length < 10) {
      presetPart4Assignment = null;
      presetPart4PoolKey = key;
      return null;
    }
    presetPart4Assignment = shuffleInPlace(list.slice()).slice(0, 10);
    presetPart4PoolKey = key;
    return presetPart4Assignment;
  }

  function makePresetPhrase(percentValue, presetId) {
    const cfg = phraseCfg || DEFAULT_PHRASE_CFG;
    const fmt = pickFrom(cfg.fmt, "int");
    const absP = Math.abs(Number(percentValue) || 0);
    let numText = "";
    if (fmt === "int") numText = String(Math.floor(absP));
    else if (fmt === "1") numText = (Math.floor(absP * 10) / 10).toFixed(1);
    else numText = (Math.floor(absP * 100) / 100).toFixed(2);
    if (numText.includes(".")) {
      numText = numText.replace(/0+$/, "").replace(/\.$/, "");
    }

    const unit = pickFrom(cfg.unit, "%");
    const part3 = pickFrom(cfg.part3, "감사합니다");
    let part4 = "";
    if (presetId != null) {
      const assign = ensurePresetPart4Assignment(cfg);
      const idx = Math.max(0, Math.min(9, Number(presetId) - 1));
      part4 = assign ? String(assign[idx] ?? "").trim() : "";
    } else if (Math.random() < clamp(cfg.part4Prob, 0, 100) / 100) {
      part4 = pickFrom(cfg.part4, "");
    }
    return `${`${numText}${unit}`.trim()} ${part4 ? `${part3} ${part4}` : part3}`.trim();
  }

  function collectState() {
    const toVal = (el) => (el ? String(el.value ?? "") : "");
    return {
      v: 3,
      inputs: {
        percentMin: toVal(els.percentMin),
        percentMax: toVal(els.percentMax),
        profitMin: toVal(els.profitMin),
        profitMax: toVal(els.profitMax),
        symbol: toVal(els.symbol),
        side: toVal(els.side),
        leverage: toVal(els.leverage),
        entry: toVal(els.entry),
        entryRandPlace: toVal(els.entryRandPlace),
        entryRandGap: toVal(els.entryRandGap),
        entryZeroProb: toVal(els.entryZeroProb),
        exitZeroProb: toVal(els.exitZeroProb),
        bgZoom: toVal(els.bgZoom),
        count: toVal(els.count),
        prefix: toVal(els.prefix),
      },
      bg: { shiftX: bgShiftX, shiftY: bgShiftY },
      overlay: {
        src: String(overlayState?.src || ""),
        opacity: clamp(overlayState?.opacity ?? 0.5, 0, 1),
        scale: clamp(Number(overlayState?.scale) || 1, 0.1, 4),
        x: Math.round(Number(overlayState?.x) || 0),
        y: Math.round(Number(overlayState?.y) || 0),
      },
      phraseCfg,
      entryVariationCfg: getEntryVariationCfg(),
      cropCfg,
      presetProfitCfg,
      presetProfitScalePct,
      presetProfitAutoScale,
      cardCustomStyles,
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;
    const s = state.inputs || {};
    const setVal = (el, v) => {
      if (!el || v == null) return;
      el.value = String(v);
    };
    setVal(els.percentMin, s.percentMin);
    setVal(els.percentMax, s.percentMax);
    setVal(els.profitMin, s.profitMin);
    setVal(els.profitMax, s.profitMax);
    setVal(els.symbol, s.symbol);
    if (s.side) setSide(String(s.side).toUpperCase(), { shouldSave: false });
    setVal(els.leverage, s.leverage);
    setVal(els.entry, s.entry);
    setEntryVariationUi({
      decimalPlace: state.entryVariationCfg?.decimalPlace ?? s.entryRandPlace ?? DEFAULT_ENTRY_VARIATION_CFG.decimalPlace,
      gap: state.entryVariationCfg?.gap ?? s.entryRandGap ?? DEFAULT_ENTRY_VARIATION_CFG.gap,
      entryZeroProb: state.entryVariationCfg?.entryZeroProb ?? s.entryZeroProb ?? DEFAULT_ENTRY_VARIATION_CFG.entryZeroProb,
      exitZeroProb: state.entryVariationCfg?.exitZeroProb ?? s.exitZeroProb ?? DEFAULT_ENTRY_VARIATION_CFG.exitZeroProb,
    });
    setVal(els.bgZoom, s.bgZoom);
    setVal(els.count, s.count);
    setVal(els.prefix, s.prefix);
    if (state.bg) {
      // 과거 저장값(0,0)이 들어있는 경우 배경이 중앙 기준으로 어색하게 보일 수 있어
      // C에서는 기본 원본 느낌(0,28)을 기준으로 두고, (0,0)은 "미설정"으로 취급합니다.
      const sx = typeof state.bg.shiftX === "number" ? state.bg.shiftX : bgShiftX;
      const sy = typeof state.bg.shiftY === "number" ? state.bg.shiftY : bgShiftY;
      if (sx === 0 && sy === 0) {
        bgShiftX = 0;
        bgShiftY = 0;
      } else {
        bgShiftX = sx;
        bgShiftY = sy;
      }
    }
    if (state.overlay && typeof state.overlay === "object") {
      overlayState = {
        src: String(state.overlay.src || ""),
        opacity: clamp(state.overlay.opacity ?? 0.5, 0, 1),
        scale: clamp(Number(state.overlay.scale) || 1, 0.1, 4),
        x: Math.round(Number(state.overlay.x) || 0),
        y: Math.round(Number(state.overlay.y) || 0),
      };
    }
    if (state.phraseCfg && typeof state.phraseCfg === "object") {
      const pc = state.phraseCfg;
      phraseCfg = {
        fmt: Array.isArray(pc.fmt) ? pc.fmt : DEFAULT_PHRASE_CFG.fmt,
        unit: Array.isArray(pc.unit) ? pc.unit : DEFAULT_PHRASE_CFG.unit,
        part3: Array.isArray(pc.part3) ? pc.part3 : DEFAULT_PHRASE_CFG.part3,
        part4: Array.isArray(pc.part4) ? pc.part4 : DEFAULT_PHRASE_CFG.part4,
        part4Prob: clamp(pc.part4Prob, 0, 100),
      };
    }
    if (state.cropCfg && typeof state.cropCfg === "object") {
      const cc = state.cropCfg;
      cropCfg = {
        fullCaptureProb: clamp(cc.fullCaptureProb, 0, 100),
        widthMinPct: clamp(cc.widthMinPct, 1, 100),
        widthMaxPct: clamp(cc.widthMaxPct, clamp(cc.widthMinPct, 1, 100), 100),
        startPadXMax: Math.max(0, Math.round(Number(cc.startPadXMax) || 0)),
        startPadYMax: Math.max(0, Math.round(Number(cc.startPadYMax) || 0)),
        bottomPadMin: Math.max(0, Math.round(Number(cc.bottomPadMin) || 0)),
        bottomPadMax: Math.max(Math.max(0, Math.round(Number(cc.bottomPadMin) || 0)), Math.round(Number(cc.bottomPadMax) || 0)),
      };
    } else {
      cropCfg = { ...DEFAULT_CROP_CFG };
    }

    // 마이그레이션: 이전 버전에서 presetEntryCfg(진입가)로 저장했던 값을
    // 이번 버전에서는 presetProfitCfg(수익금)로 재사용합니다.
    // (사용자가 "기존 진입가 범위에서 수정" 요청)
    presetProfitCfg = normalizePresetProfitCfg(state.presetProfitCfg || state.presetEntryCfg);
    presetProfitScalePct = clamp(state.presetProfitScalePct ?? DEFAULT_PRESET_PROFIT_SCALE_PCT, 0, 1000);
    presetProfitAutoScale = normalizePresetProfitAutoScale(state.presetProfitAutoScale);
    fillPhraseUiFromCfg();
    fillCropUiFromCfg();
    fillPresetProfitUiFromCfg();
    syncBgShiftInputs();
    syncOverlayUi();
    applyOverlayToDom();

    cardCustomStyles = state.cardCustomStyles || {};
    // 기본 선/박스가 항상 보이도록 최소 기본값 보정
    if (!cardCustomStyles["#profitDivider"] || typeof cardCustomStyles["#profitDivider"] !== "object") {
      cardCustomStyles["#profitDivider"] = { x: 0, y: 0, size: 300, weight: 4, color: "#38bdf8", opacity: 1 };
    } else {
      const st = cardCustomStyles["#profitDivider"];
      if (st.size == null || Number(st.size) < 160) st.size = 300;
      if (st.weight == null || Number(st.weight) < 2) st.weight = 4;
      if (st.opacity == null || Number(st.opacity) <= 0) st.opacity = 1;
      if (!st.color) st.color = "#38bdf8";
    }
    if (!cardCustomStyles["#txtSideBox"] || typeof cardCustomStyles["#txtSideBox"] !== "object") {
      cardCustomStyles["#txtSideBox"] = { x: 0, y: 0, size: 34, height: 46, weight: 2, color: "#facc15", opacity: 1 };
    } else {
      const st = cardCustomStyles["#txtSideBox"];
      if (st.size == null || Number(st.size) < 18) st.size = 34;
      if (st.height == null || Number(st.height) < 18) st.height = 46;
      if (st.weight == null || Number(st.weight) < 1) st.weight = 2;
      if (st.opacity == null || Number(st.opacity) <= 0) st.opacity = 1;
      if (!st.color) st.color = "#facc15";
    }

    generatedItems = [];
    previewIndex = -1;
    samplePercent = null;
    sampleProfit = null;
    sampleEntry = null;
    presetPart4Assignment = null;
    presetPart4PoolKey = "";
    renderAll();
  }

  async function cloudLoad() {
    if (!cloudConfigured()) {
      showToastFor("Supabase 설정값(SUPABASE_URL/ANON_KEY) 필요", 2000);
      return;
    }
    try {
      const rowId = getSupabaseRowId();
      let data = await fetchCloudRow(rowId);
      // 마이그레이션: 예전 버전은 "default"에 저장했으니, 새 키에 데이터가 없으면 가져옵니다.
      if (!data && rowId !== "default") {
        data = await fetchCloudRow("default");
        if (data) {
          const merged = isMakerPage() ? mergeSharedLayoutState(data, await fetchCloudRow("main")) : data;
          applyState(merged);
          showToastFor("클라우드(이전 데이터) 불러옴", 1400);
          scheduleCloudSave();
          return;
        }
      }
      if (data) {
        if (isMakerPage()) {
          data = mergeSharedLayoutState(data, await fetchCloudRow("main"));
        }
        applyState(data);
        showToastFor("클라우드 불러오기 완료", 1200);
      } else {
        if (isMakerPage()) {
          const layoutOnly = mergeSharedLayoutState(null, await fetchCloudRow("main"));
          if (layoutOnly && (layoutOnly.cardCustomStyles || layoutOnly.overlay || layoutOnly.bg)) {
            applyState(layoutOnly);
            showToastFor("메이커 설정 없음, 메인 레이아웃만 불러옴", 1400);
            return;
          }
        }
        showToastFor("클라우드 데이터 없음", 1200);
      }
    } catch (e) {
      console.error(e);
      showToastFor("클라우드 불러오기 실패", 2000);
    }
  }

  async function cloudSaveNow({ silent = false, keepalive = false } = {}) {
    if (!cloudConfigured()) return;
    try {
      const rowId = getSupabaseRowId();
      const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`;
      const body = [{ id: rowId, data: collectState() }];
      cloudSavePending = false;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(body),
        keepalive,
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      if (!silent) showToastFor("클라우드 저장됨", 1000);
    } catch (e) {
      console.error(e);
      cloudSavePending = true;
      if (!silent) showToastFor("클라우드 저장 실패", 1500);
    }
  }

  function scheduleCloudSave() {
    if (!cloudReady || !cloudConfigured()) return;
    clearTimeout(cloudSaveTimer);
    cloudSavePending = true;
    cloudSaveTimer = setTimeout(() => cloudSaveNow({ silent: true }), 1200);
  }

  function fillCropUiFromCfg() {
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = String(v);
    };
    setVal("inpCropFullCaptureProb", clamp(cropCfg.fullCaptureProb, 0, 100));
    setVal("inpCropWidthMinPct", clamp(cropCfg.widthMinPct, 1, 100));
    setVal("inpCropWidthMaxPct", clamp(cropCfg.widthMaxPct, 1, 100));
    setVal("inpCropStartPadXMax", Math.max(0, Math.round(cropCfg.startPadXMax)));
    setVal("inpCropStartPadYMax", Math.max(0, Math.round(cropCfg.startPadYMax)));
    setVal("inpCropBottomPadMin", Math.max(0, Math.round(cropCfg.bottomPadMin)));
    setVal("inpCropBottomPadMax", Math.max(0, Math.round(cropCfg.bottomPadMax)));

    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v);
    };
    setText("lblCropFullCaptureProb", clamp(cropCfg.fullCaptureProb, 0, 100));
    setText("lblCropWidthMinPct", clamp(cropCfg.widthMinPct, 1, 100));
    setText("lblCropWidthMaxPct", clamp(cropCfg.widthMaxPct, 1, 100));
  }

  function readCropCfgFromUi() {
    const num = (id, fallback) => {
      const el = document.getElementById(id);
      const v = Number(el?.value);
      return Number.isFinite(v) ? v : fallback;
    };
    const widthMinPct = clamp(num("inpCropWidthMinPct", DEFAULT_CROP_CFG.widthMinPct), 1, 100);
    const widthMaxPct = clamp(num("inpCropWidthMaxPct", DEFAULT_CROP_CFG.widthMaxPct), widthMinPct, 100);
    const bottomPadMin = Math.max(0, Math.round(num("inpCropBottomPadMin", DEFAULT_CROP_CFG.bottomPadMin)));
    const bottomPadMax = Math.max(bottomPadMin, Math.round(num("inpCropBottomPadMax", DEFAULT_CROP_CFG.bottomPadMax)));
    return {
      fullCaptureProb: clamp(num("inpCropFullCaptureProb", DEFAULT_CROP_CFG.fullCaptureProb), 0, 100),
      widthMinPct,
      widthMaxPct,
      startPadXMax: Math.max(0, Math.round(num("inpCropStartPadXMax", DEFAULT_CROP_CFG.startPadXMax))),
      startPadYMax: Math.max(0, Math.round(num("inpCropStartPadYMax", DEFAULT_CROP_CFG.startPadYMax))),
      bottomPadMin,
      bottomPadMax,
    };
  }

  function flushCloudSaveOnLeave() {
    if (!cloudReady || !cloudConfigured() || !cloudSavePending) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
    void cloudSaveNow({ silent: true, keepalive: true });
  }

  function syncBgShiftInputs() {
    if (els.bgShiftX) els.bgShiftX.value = String(Math.round(bgShiftX));
    if (els.bgShiftY) els.bgShiftY.value = String(Math.round(bgShiftY));
  }

  function applyOverlayToDom() {
    const imgOverlay = document.getElementById("imgOverlay");
    if (!imgOverlay) return;

    const hasSrc = !!String(overlayState?.src || "").trim();
    if (hasSrc) {
      imgOverlay.src = overlayState.src;
      imgOverlay.style.display = "block";
    } else {
      imgOverlay.removeAttribute("src");
      imgOverlay.style.display = "none";
    }

    imgOverlay.style.opacity = String(clamp(overlayState?.opacity ?? 0.5, 0, 1));
    imgOverlay.style.transform = `translate(${Math.round(Number(overlayState?.x) || 0)}px, ${Math.round(Number(overlayState?.y) || 0)}px) scale(${clamp(Number(overlayState?.scale) || 1, 0.1, 4).toFixed(3)})`;
  }

  function syncOverlayUi() {
    const lblOpacity = document.getElementById("lblOverlayOpacity");
    const lblScale = document.getElementById("lblOverlayScale");
    const lblX = document.getElementById("lblOverlayX");
    const lblY = document.getElementById("lblOverlayY");
    const rngOpacity = document.getElementById("valOverlayOpacity");

    if (rngOpacity) rngOpacity.value = String(clamp(overlayState?.opacity ?? 0.5, 0, 1));
    if (lblOpacity) lblOpacity.textContent = String(clamp(overlayState?.opacity ?? 0.5, 0, 1).toFixed(2));
    if (lblScale) lblScale.textContent = `${Math.round(clamp(Number(overlayState?.scale) || 1, 0.1, 4) * 100)}%`;
    if (lblX) lblX.textContent = `${Math.round(Number(overlayState?.x) || 0)}px`;
    if (lblY) lblY.textContent = `${Math.round(Number(overlayState?.y) || 0)}px`;
  }

  function applyCardBackground() {
    if (!els.cardRoot) return;
    // zoom이 1 미만이어도 최소 100% 폭을 유지하여 빈 공간 방지
    const z = clamp(els.bgZoom?.value, 0.5, 3);
    const sizePct = Math.max(100, z * 100);
    els.cardRoot.style.backgroundRepeat = "no-repeat";
    els.cardRoot.style.backgroundSize = `${sizePct.toFixed(3)}% auto`;
    // 기본적으로 중심(50% 50%)을 기준으로 shift 값만큼 이동
    els.cardRoot.style.backgroundPosition = `calc(50% + ${Math.round(bgShiftX)}px) calc(50% + ${Math.round(bgShiftY)}px)`;
  }

  function setSide(value, { shouldSave = true } = {}) {
    if (els.side) els.side.value = value;
    if (sideUi.longBtn) sideUi.longBtn.classList.toggle("active", value === "LONG");
    if (sideUi.shortBtn) sideUi.shortBtn.classList.toggle("active", value === "SHORT");
    if (shouldSave) {
      setTs(LS_SIDE_TS);
      scheduleCloudSave();
    }
    renderAll();
  }

  function getCount() {
    const n = Number(els.count?.value);
    return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
  }

  function rerollIfNeeded(force = false) {
    const fk = `${String(els.profitMin?.value || "")}|${String(els.profitMax?.value || "")}`;
    const { minP, maxP } = getPercentMinMax();
    const pk = `${minP}|${maxP}`;
    if (force || pk !== lastPercentKey || fk !== lastProfitKey || samplePercent == null || sampleProfitRaw == null) {
      samplePercent = pickPercent2NoZeroSecondDigit(minP, maxP);
      const { minWon, maxWon } = getProfitMinMax();
      sampleProfitRaw = minWon === maxWon ? minWon : randInt(minWon, maxWon);
      lastPercentKey = pk;
      lastProfitKey = fk;
    }
    sampleProfit = applyProfitScale(sampleProfitRaw, getEffectiveProfitScalePctForPercent(samplePercent));
    return { percent: samplePercent, profit: sampleProfit };
  }

  function renderCard(item) {
    const percentText = formatPercentText(item.percent);
    if (els.txtPercent) els.txtPercent.textContent = percentText;
    if (els.txtProfit) els.txtProfit.textContent = formatProfit(item.profit);
    if (els.txtSymbol) els.txtSymbol.textContent = String(els.symbol?.value || "").trim();
    
    const side = String(els.side?.value || "LONG").toUpperCase();
    if (els.cardRoot) {
      els.cardRoot.classList.toggle("LONG", side === "LONG");
      els.cardRoot.classList.toggle("SHORT", side === "SHORT");
    }
    if (els.txtSide) {
      const sideText = side === "LONG" ? "롱" : "숏";
      const t = els.txtSide.querySelector?.(".dgb-side-text");
      if (t) t.textContent = sideText;
      else els.txtSide.textContent = sideText;
      els.txtSide.classList.toggle("LONG", side === "LONG");
      els.txtSide.classList.toggle("SHORT", side === "SHORT");
    }
    if (els.entryReal) els.entryReal.value = item.entry;
    if (els.txtLeverage) {
      let levVal = String(els.leverage?.value || "").trim();
      if (levVal && !levVal.includes("격리") && !levVal.includes("교차")) {
        const cleanLev = levVal.replace(/^x/i, "").replace(/x$/i, "");
        levVal = `격리 x${cleanLev}`;
      }
      els.txtLeverage.textContent = levVal;
    }
    if (els.txtEntry) {
      const entryVal = String(item.entry).trim();
      els.txtEntry.textContent = entryVal.endsWith("USDT") ? entryVal : `${entryVal} USDT`;
    }
    const exit = computeExit(item.entry, item.percent, els.side?.value, els.leverage?.value);
    if (els.exit) els.exit.value = exit;
    if (els.txtExit) {
      const exitVal = String(exit).trim();
      els.txtExit.textContent = exitVal.endsWith("USDT") ? exitVal : `${exitVal} USDT`;
    }
    applyCardBackground();
    applyAllCustomStylesAndTextOverrides();
  }

  function renderPreview() {
    if (generatedItems.length > 0) {
      if (previewIndex < 0 || previewIndex >= generatedItems.length) previewIndex = 0;
      renderCard(generatedItems[previewIndex]);
      return;
    }
    const baseEntry = String(els.entry?.value || "").trim();
    if (sampleEntry == null || lastEntryBase !== baseEntry) {
      sampleEntry = randomEntryFromBase(baseEntry);
      lastEntryBase = baseEntry;
    }
    const { percent, profit } = rerollIfNeeded(false);
    renderCard({ percent, profit, entry: sampleEntry });
  }

  function renderAll() {
    renderPreview();
  }

  async function ensureFontsReady() {
    if (document.fonts && document.fonts.ready) {
      try {
        await Promise.allSettled([
          document.fonts.load('400 16px "Noto Sans KR"'),
          document.fonts.load('500 32px "Noto Sans KR"'),
          document.fonts.load('600 34px "Noto Sans KR"'),
        ]);
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }
  }

  async function renderCardCanvas({ foreignObjectRendering = false } = {}) {
    await ensureFontsReady();
    if (typeof window.html2canvas !== "function") {
      throw new Error("html2canvas_missing");
    }

    // DOM 업데이트가 반영될 시간을 조금 줌(프리셋 클릭 직후 텍스트가 캔버스에 누락되는 케이스 완화)
    await new Promise((r) => requestAnimationFrame(() => r()));

    return window.html2canvas(els.cardRoot, {
      backgroundColor: null,
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering,
    });
  }

  // ---- 캡쳐 매커니즘 (새 구현) ----
  // 요구사항:
  // - 수익퍼센트/수익금액은 무조건 보이게 캡쳐
  // - 설정된 확률로 수익화면 전체 캡쳐(카드 전체)
  // - 시작점은 항상 퍼센트 왼쪽 위 기준으로 랜덤한 좌표
  // - 캡쳐 가로: 설정된 최소~최대 비율 (오른쪽부터 잘림)
  // - 캡쳐 세로: (수익금액이 나오는 최소 범위) ~ (종료가격 숫자가 보이는 곳까지) 범위에서 랜덤
  function rectUnion(a, b) {
    if (!a) return b;
    if (!b) return a;
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w);
    const y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function getRectForSelector(sel) {
    const rootRect = els.cardRoot.getBoundingClientRect();
    const el = els.cardRoot.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - rootRect.left,
      y: r.top - rootRect.top,
      w: r.width,
      h: r.height,
    };
  }

  function getRectForSelectors(selectors) {
    let u = null;
    for (const sel of selectors) u = rectUnion(u, getRectForSelector(sel));
    return u;
  }

  function clampRectToCard(rect, W, H) {
    const x = Math.max(0, Math.min(W - 1, Math.floor(rect.x)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(rect.y)));
    const w = Math.max(1, Math.min(W - x, Math.ceil(rect.w)));
    const h = Math.max(1, Math.min(H - y, Math.ceil(rect.h)));
    return { x, y, w, h };
  }

  function computeCaptureRect() {
    // 좌표 계산은 getBoundingClientRect 기반으로 맞춰야 html2canvas 결과 캔버스와 싱크가 잘 맞습니다.
    const rootRect = els.cardRoot.getBoundingClientRect();
    const W = rootRect.width;
    const H = rootRect.height;
    if (Math.random() < clamp((cropCfg?.fullCaptureProb ?? DEFAULT_CROP_CFG.fullCaptureProb) / 100, 0, 1)) return { x: 0, y: 0, w: W, h: H };

    // 텍스트 실제 글자 기준(폭 100% 요소 제외)
    const percentRect =
      getRectForSelectors(["#txtPercent", "#txtPercentSign"]) ||
      getRectForSelector("#txtPercent") ||
      { x: 0, y: 0, w: 1, h: 1 };
    const profitRect = getRectForSelectors(["#txtProfit"]) || getRectForSelector("#txtProfit") || percentRect;
    const exitRect = getRectForSelector("#txtExit") || profitRect;

    // 시작점: 퍼센트 왼쪽 위 기준으로 랜덤
    const startPadX = randInt(0, Math.max(0, Math.round(cropCfg?.startPadXMax ?? DEFAULT_CROP_CFG.startPadXMax)));
    const startPadY = randInt(0, Math.max(0, Math.round(cropCfg?.startPadYMax ?? DEFAULT_CROP_CFG.startPadYMax)));
    let x = Math.max(0, Math.floor(percentRect.x - startPadX));
    let y = Math.max(0, Math.floor(percentRect.y - startPadY));

    // 가로: 설정 비율 범위에서 랜덤. 텍스트 보호 자동 보정은 하지 않음.
    const widthMinRatio = clamp((cropCfg?.widthMinPct ?? DEFAULT_CROP_CFG.widthMinPct) / 100, 0.01, 1);
    const widthMaxRatio = clamp((cropCfg?.widthMaxPct ?? DEFAULT_CROP_CFG.widthMaxPct) / 100, widthMinRatio, 1);
    let w = Math.round(randFloat(widthMinRatio, widthMaxRatio) * W);
    w = Math.max(1, Math.min(W - x, w));

    // 세로: 최소는 "수익금액이 보이는 최소 범위"(profit bottom 포함),
    // 최대는 "종료가격 숫자가 보이는 곳까지"(exit bottom 포함)
    const padBottom = randInt(
      Math.max(0, Math.round(cropCfg?.bottomPadMin ?? DEFAULT_CROP_CFG.bottomPadMin)),
      Math.max(
        Math.max(0, Math.round(cropCfg?.bottomPadMin ?? DEFAULT_CROP_CFG.bottomPadMin)),
        Math.round(cropCfg?.bottomPadMax ?? DEFAULT_CROP_CFG.bottomPadMax)
      )
    );
    const minH = Math.ceil(profitRect.y + profitRect.h + padBottom) - y;
    const maxH = Math.ceil(exitRect.y + exitRect.h + padBottom) - y;
    const lo = Math.max(1, Math.min(H - y, Math.min(minH, maxH)));
    const hi = Math.max(lo, Math.min(H - y, Math.max(minH, maxH)));
    let h = randInt(lo, hi);

    return clampRectToCard({ x, y, w, h }, W, H);
  }

  function hasGreenishText(canvasOrCtx) {
    const canvas = canvasOrCtx instanceof CanvasRenderingContext2D ? canvasOrCtx.canvas : canvasOrCtx;
    const ctx = canvasOrCtx instanceof CanvasRenderingContext2D ? canvasOrCtx : canvas.getContext("2d");
    if (!ctx) return true;
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return true;
    // 텍스트(초록색/흰색)가 전혀 없는 "배경만" 캡쳐를 걸러내기 위한 휴리스틱
    // 랜덤 샘플 픽셀에서 초록색 계열(수익 텍스트) 또는 밝은 픽셀이 있으면 정상으로 간주
    const img = ctx.getImageData(0, 0, w, h).data;
    const samples = 260;
    for (let i = 0; i < samples; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const idx = (y * w + x) * 4;
      const r = img[idx], g = img[idx + 1], b = img[idx + 2];
      const bright = (r + g + b) / 3;
      const greenish = g > 160 && g - r > 40 && g - b > 20;
      if (greenish || bright > 210) return true;
    }
    return false;
  }

  async function buildCapturedBlob() {
    let blob = null;
    let lastErr = null;

    // 1) 일반 모드 + 규칙 캡쳐
    // 2) 일반 모드 + 전체 캡쳐
    // 3) foreignObjectRendering 모드 + 전체 캡쳐 (환경별 텍스트 누락 대응)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const useFO = attempt >= 2;
        const canvas = await renderCardCanvas({ foreignObjectRendering: useFO });
        const rr = els.cardRoot.getBoundingClientRect();
        const crop = attempt === 0 ? computeCaptureRect() : { x: 0, y: 0, w: rr.width, h: rr.height };
        const rootRect = els.cardRoot.getBoundingClientRect();
        const scaleX = canvas.width / rootRect.width;
        const scaleY = canvas.height / rootRect.height;

        const outW = Math.max(1, Math.round(crop.w));
        const outH = Math.max(1, Math.round(crop.h));
        const off = document.createElement("canvas");
        off.width = outW;
        off.height = outH;
        const offCtx = off.getContext("2d");
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = "high";
        offCtx.drawImage(
          canvas,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.w * scaleX,
          crop.h * scaleY,
          0,
          0,
          outW,
          outH
        );

        blob = await new Promise((resolve, reject) =>
          off.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/png")
        );
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!blob) throw lastErr || new Error("capture_failed");
    return blob;
  }

  function updateCroppedPreview(blob) {
    if (!blob || !els.croppedPreviewImg) return;
    if (lastCroppedPreviewUrl) URL.revokeObjectURL(lastCroppedPreviewUrl);
    lastCroppedPreviewUrl = URL.createObjectURL(blob);
    els.croppedPreviewImg.src = lastCroppedPreviewUrl;
    els.croppedPreviewImg.style.display = "block";
    if (els.maskedPreviewEmpty) els.maskedPreviewEmpty.style.display = "none";
  }

  function initMaskedPreview() {
    if (els.croppedPreviewImg) {
      els.croppedPreviewImg.removeAttribute("src");
      els.croppedPreviewImg.style.display = "none";
    }
    if (els.maskedPreviewEmpty) els.maskedPreviewEmpty.style.display = "block";
  }

  function ensureClipboardWritable() {
    if (!window.isSecureContext || location.protocol === "file:") {
      throw new Error("clipboard_insecure_context");
    }
    if (!navigator.clipboard || typeof navigator.clipboard.write !== "function" || typeof ClipboardItem === "undefined") {
      throw new Error("clipboard_not_supported");
    }
  }

  function tryFocusDocument() {
    try { window.focus?.(); } catch {}
    try { document.body?.focus?.({ preventScroll: true }); } catch {}
    try { document.documentElement?.focus?.({ preventScroll: true }); } catch {}
  }

  function getClipboardFailureMessage(err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("clipboard_insecure_context")) return "클립보드는 HTTPS 또는 localhost에서만 이미지 복사가 가능합니다.";
    if (msg.includes("clipboard_not_supported")) return "현재 브라우저가 이미지 클립보드 복사를 지원하지 않습니다.";
    if (msg.includes("not focused") || msg.includes("Document is not focused")) {
      return "브라우저 창 포커스가 없어 클립보드 복사가 차단됐습니다. 화면을 한 번 클릭하면 자동으로 다시 시도합니다.";
    }
    if (msg.includes("NotAllowedError") || msg.includes("permission") || msg.includes("denied")) {
      return "브라우저가 클립보드 권한을 막았습니다. 화면을 한 번 클릭하면 자동으로 다시 시도합니다.";
    }
    return "클립보드 복사에 실패했습니다. 화면을 한 번 클릭하면 자동으로 다시 시도합니다.";
  }

  async function copyPresetToClipboardWithRetries({ maxAttempts = 6 } = {}) {
    ensureClipboardWritable();
    tryFocusDocument();

    // 사용자 제스처(프리셋 클릭)를 유지하기 위해, ClipboardItem에 Promise(blob)를 직접 넘깁니다.
    // Promise 내부에서 캡처 실패 시 재생성(doGenerate) 후 재시도해서 "캡처 실패"가 사용자에게 튀지 않게 합니다.
    const blobPromise = (async () => {
      let lastErr = null;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          // DOM 업데이트 반영
          await new Promise((r) => requestAnimationFrame(() => r()));
          const blob = await buildCapturedBlob();
          return blob;
        } catch (e) {
          lastErr = e;
          // 캡처가 흔들리는 경우(폰트/레이아웃/크롭 휴리스틱) 새로 생성해서 재시도
          try { doGenerate(); } catch {}
        }
      }
      throw lastErr || new Error("capture_failed");
    })();
    const previewPromise = blobPromise.then((blob) => {
      updateCroppedPreview(blob);
      return blob;
    });

    // clipboard.write()를 최대한 클릭 제스처에 붙여서 호출
    tryFocusDocument();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
    await previewPromise;
    return true;
  }

  function armPresetRetryOnNextGesture() {
    if (presetRetryArmed || !lastPresetRetryCtx) return;
    presetRetryArmed = true;

    const onNextGesture = async () => {
      presetRetryArmed = false;
      const ctx = lastPresetRetryCtx;
      if (!ctx) return;

      try {
        if (ctx.kind !== "preset0") {
          if (els.profitMin && ctx.pmin != null) els.profitMin.value = String(ctx.pmin);
          if (els.profitMax && ctx.pmax != null) els.profitMax.value = String(ctx.pmax);
        }
        doGenerate();
        await copyPresetToClipboardWithRetries({ maxAttempts: 6 });
        showToast("클립보드에 복사됨");
      } catch (e) {
        console.error(e);
        showToastFor(getClipboardFailureMessage(e), 2500);
        // 또 실패하면 다시 다음 제스처에서 재시도
        armPresetRetryOnNextGesture();
      }
    };

    // "사용자 제스처"가 되는 이벤트에서만 재시도해야 클립보드가 풀립니다.
    document.addEventListener("pointerdown", onNextGesture, { once: true, capture: true });
  }

  async function copyCardToClipboardAndPreview(options = {}) {
    const { preserveGesture = false, allowDownloadFallback = true } = options;
    ensureClipboardWritable();
    tryFocusDocument();
    const blobPromise = buildCapturedBlob();

    try {
      if (preserveGesture) {
        tryFocusDocument();
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blobPromise,
          }),
        ]);
        const blob = await blobPromise;
        updateCroppedPreview(blob);
        return blob;
      }

      const blob = await blobPromise;
      updateCroppedPreview(blob);
      tryFocusDocument();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return blob;
    } catch (e) {
      const blob = await blobPromise.catch(() => null);
      if (blob) updateCroppedPreview(blob);
      if (allowDownloadFallback && blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cropped.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      throw e;
    }
  }

  async function downloadZip() {
    if (!window.JSZip || !window.html2canvas) {
      alert("필수 라이브러리 로딩 실패");
      return;
    }
    const n = getCount();
    const prefix = (els.prefix?.value || "screenshot").trim() || "screenshot";
    const zip = new JSZip();
    const snapshot = {
      generatedItems: generatedItems.slice(),
      previewIndex,
      samplePercent,
      sampleProfit,
      sampleProfitRaw,
      sampleEntry,
      lastEntryBase,
    };
    const baseEntry = String(els.entry?.value || "").trim();
    for (let i = 1; i <= n; i++) {
      const item = buildRenderItem(baseEntry);
      renderCard(item);
      const canvas = await renderCardCanvas();
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("캡처 실패"))), "image/png")
      );
      zip.file(`${prefix}_${String(i).padStart(4, "0")}.png`, blob);
    }
    generatedItems = snapshot.generatedItems;
    previewIndex = snapshot.previewIndex;
    samplePercent = snapshot.samplePercent;
    sampleProfit = snapshot.sampleProfit;
    sampleProfitRaw = snapshot.sampleProfitRaw;
    sampleEntry = snapshot.sampleEntry;
    lastEntryBase = snapshot.lastEntryBase;
    renderAll();
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function triggerWarningFlash() {
    const el = document.getElementById("warningNotice");
    if (!el) return;
    el.classList.remove("flash-warning");
    void el.offsetWidth;
    el.classList.add("flash-warning");
  }

  function doGenerate() {
    triggerWarningFlash();
    const n = getCount();
    const baseEntry = String(els.entry?.value || "").trim();
    const currentSignature = getCurrentRenderSignature();
    generatedItems = Array.from({ length: n }, (_, index) =>
      index === 0
        ? buildRenderItemDifferentFrom(baseEntry, currentSignature)
        : buildRenderItem(baseEntry)
    );
    previewIndex = generatedItems.length > 0 ? 0 : -1;
    renderAll();
  }

  async function runPreset0Action() {
    lastPresetRetryCtx = { kind: "preset0" };
    doGenerate();

    const now = Date.now();
    const sideSelected = ["LONG", "SHORT"].includes(String(els.side?.value || "").toUpperCase());
    const sideOk = sideSelected && now - getTs(LS_SIDE_TS) < ONE_HOUR_MS;
    const entryOk = getTs(LS_ENTRY_TS) > 0 && now - getTs(LS_ENTRY_TS) < ONE_HOUR_MS;
    if (!sideSelected) showCenterTip("롱/숏 확인하세요", 1000);
    else if (!sideOk || !entryOk) showToastFor("롱/숏·진입가 확인하세요", 2000);

    try {
      await copyPresetToClipboardWithRetries({ maxAttempts: 6 });
      showToast("클립보드에 복사됨");
    } catch (e) {
      console.error(e);
      showToastFor(getClipboardFailureMessage(e), 2500);
      armPresetRetryOnNextGesture();
    }
  }

  function bindPhraseUi() {
    fillPhraseUiFromCfg();
    const onEdit = () => {
      phraseCfg = readPhraseCfgFromUi();
      presetPart4Assignment = null;
      presetPart4PoolKey = "";
      scheduleCloudSave();
    };
    [els.phraseFmt, els.phraseUnit, els.phrasePart3, els.phrasePart4, els.phrasePart4Prob].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", onEdit);
      el.addEventListener("change", onEdit);
    });
  }

  function bindEntryVariationUi() {
    setEntryVariationUi({
      decimalPlace: els.entryRandPlace?.value || DEFAULT_ENTRY_VARIATION_CFG.decimalPlace,
      gap: els.entryRandGap?.value || DEFAULT_ENTRY_VARIATION_CFG.gap,
      entryZeroProb: els.entryZeroProb?.value || DEFAULT_ENTRY_VARIATION_CFG.entryZeroProb,
      exitZeroProb: els.exitZeroProb?.value || DEFAULT_ENTRY_VARIATION_CFG.exitZeroProb,
    });
    const onEdit = () => {
      generatedItems = [];
      previewIndex = -1;
      sampleEntry = null;
      lastEntryBase = null;
      renderAll();
      scheduleCloudSave();
    };
    [els.entryRandPlace, els.entryRandGap, els.entryZeroProb, els.exitZeroProb].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", onEdit);
      el.addEventListener("change", onEdit);
    });
  }

  function bindCropUi() {
    fillCropUiFromCfg();
    const ids = [
      "inpCropFullCaptureProb",
      "inpCropWidthMinPct",
      "inpCropWidthMaxPct",
      "inpCropStartPadXMax",
      "inpCropStartPadYMax",
      "inpCropBottomPadMin",
      "inpCropBottomPadMax",
    ];
    const onEdit = () => {
      cropCfg = readCropCfgFromUi();
      fillCropUiFromCfg();
      updateCropGuideUi();
      scheduleCloudSave();
    };
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", onEdit);
      el.addEventListener("change", onEdit);
    });

    // 초기 가이드 표시
    updateCropGuideUi();
  }

  function bindSideUi() {
    if (sideUi.longBtn) sideUi.longBtn.addEventListener("click", () => setSide("LONG"));
    if (sideUi.shortBtn) sideUi.shortBtn.addEventListener("click", () => setSide("SHORT"));
  }

  function bind() {
    window.addEventListener("pagehide", flushCloudSaveOnLeave);
    window.addEventListener("beforeunload", flushCloudSaveOnLeave);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushCloudSaveOnLeave();
    });

    const reRender = () => {
      renderAll();
      scheduleCloudSave();
    };
    [
      els.percentMin, els.percentMax, els.profitMin, els.profitMax, els.symbol,
      els.leverage, els.bgZoom, els.count, els.prefix,
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", reRender);
      el.addEventListener("change", reRender);
    });
    if (els.entry) {
      const mark = () => {
        setTs(LS_ENTRY_TS);
        generatedItems = [];
        previewIndex = -1;
        sampleEntry = null;
        lastEntryBase = null;
        renderAll();
        scheduleCloudSave();
      };
      els.entry.addEventListener("input", mark);
      els.entry.addEventListener("change", mark);
    }
    if (els.cloudLoad) els.cloudLoad.addEventListener("click", cloudLoad);
    if (els.cloudSave) els.cloudSave.addEventListener("click", cloudSaveNow);
    if (els.generate) els.generate.addEventListener("click", runPreset0Action);
    if (els.downloadZip) els.downloadZip.addEventListener("click", downloadZip);
    if (els.reroll) {
      els.reroll.addEventListener("click", () => {
        generatedItems = [];
        previewIndex = -1;
        samplePercent = null;
        sampleProfit = null;
        sampleEntry = null;
        rerollIfNeeded(true);
        renderAll();
      });
    }
    if (els.reset) {
      els.reset.addEventListener("click", () => {
        els.percentMin.value = DEFAULTS.percentMin;
        els.percentMax.value = DEFAULTS.percentMax;
        els.profitMin.value = DEFAULTS.profitMin;
        els.profitMax.value = DEFAULTS.profitMax;
        els.symbol.value = DEFAULTS.symbol;
        els.leverage.value = DEFAULTS.leverage;
        els.entry.value = DEFAULTS.entry;
        setEntryVariationUi(DEFAULT_ENTRY_VARIATION_CFG);
        els.bgZoom.value = String(DEFAULTS.bgZoom.toFixed(3));
        if (els.count) els.count.value = String(DEFAULTS.count);
        if (els.prefix) els.prefix.value = DEFAULTS.prefix;
        bgShiftX = 0;
        bgShiftY = 0;
        setSide(DEFAULTS.side, { shouldSave: false });
        generatedItems = [];
        previewIndex = -1;
        samplePercent = null;
        sampleProfit = null;
        sampleEntry = null;
        lastEntryBase = null;
        syncBgShiftInputs();
        renderAll();
        scheduleCloudSave();
      });
    }

    const bumpZoom = (delta) => {
      const cur = Number(els.bgZoom?.value);
      els.bgZoom.value = clamp((Number.isFinite(cur) ? cur : 1) + delta, 0.5, 3).toFixed(3);
      renderAll();
      scheduleCloudSave();
    };
    if (els.zoomIn) els.zoomIn.addEventListener("click", () => bumpZoom(+0.05));
    if (els.zoomOut) els.zoomOut.addEventListener("click", () => bumpZoom(-0.05));

    const bumpBg = (key, delta) => {
      if (key === "x") bgShiftX = Math.round(bgShiftX) + delta;
      else bgShiftY = Math.round(bgShiftY) + delta;
      syncBgShiftInputs();
      renderAll();
      scheduleCloudSave();
    };
    if (els.shiftUp) els.shiftUp.addEventListener("click", () => bumpBg("y", -1));
    if (els.shiftDown) els.shiftDown.addEventListener("click", () => bumpBg("y", +1));
    if (els.shiftLeft) els.shiftLeft.addEventListener("click", () => bumpBg("x", -1));
    if (els.shiftRight) els.shiftRight.addEventListener("click", () => bumpBg("x", +1));
    if (els.shiftReset) {
      els.shiftReset.addEventListener("click", () => {
        bgShiftX = 0;
        bgShiftY = 0;
        syncBgShiftInputs();
        renderAll();
        scheduleCloudSave();
      });
    }
    if (els.bgShiftX) {
      els.bgShiftX.addEventListener("input", () => {
        bgShiftX = Number.isFinite(Number(els.bgShiftX.value)) ? Math.round(Number(els.bgShiftX.value)) : 0;
        renderAll();
        scheduleCloudSave();
      });
    }
    if (els.bgShiftY) {
      els.bgShiftY.addEventListener("input", () => {
        bgShiftY = Number.isFinite(Number(els.bgShiftY.value)) ? Math.round(Number(els.bgShiftY.value)) : 0;
        renderAll();
        scheduleCloudSave();
      });
    }

    let firstPresetHintShown = false;
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const presetId = btn.getAttribute("data-preset");
        const part4List = getPart4ListAll(phraseCfg || DEFAULT_PHRASE_CFG);
        if (part4List.length < 10) {
          showToastFor(`4) 추가 마무리 문구 항목이 10개 미만입니다. (현재 ${part4List.length}개)`, 2500);
          return;
        }
        ensurePresetPart4Assignment(phraseCfg || DEFAULT_PHRASE_CFG);

        const pmin = btn.getAttribute("data-pmin");
        const pmax = btn.getAttribute("data-pmax");
        if (els.profitMin && pmin != null) els.profitMin.value = String(pmin);
        if (els.profitMax && pmax != null) els.profitMax.value = String(pmax);

        // 프리셋별 수익금(만원) 범위 설정을 우선 적용
        // (배율은 생성 단계에서 percent에 따라 자동/수동으로 적용합니다)
        const pc = presetId != null ? presetProfitCfg?.[String(presetId)] : null;
        if (els.profitMin && els.profitMax && pc && pc.min != null && pc.max != null) {
          const mn = String(pc.min).trim();
          const mx = String(pc.max).trim();
          if (mn !== "" && mx !== "") {
            els.profitMin.value = mn;
            els.profitMax.value = mx;
            scheduleCloudSave();
          }
        }

        lastPresetRetryCtx = { kind: "preset", presetId, pmin, pmax };
        doGenerate();
        const percentForPhrase = generatedItems?.[0]?.percent ?? samplePercent ?? 0;
        let phrase = "";
        for (let i = 0; i < 30; i++) {
          phrase = makePresetPhrase(percentForPhrase, presetId);
          if (phrase && phrase !== lastPresetPhrase) break;
        }
        lastPresetPhrase = phrase;
        const caption = document.querySelector(`.preset-caption[data-preset="${presetId}"]`);
        if (caption) {
          caption.textContent = phrase;
          const range = document.createRange();
          range.selectNodeContents(caption);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }

        if (!firstPresetHintShown) {
          firstPresetHintShown = true;
          showToastFor("프리셋 적용됨", 1500);
        }

        const now = Date.now();
        const sideSelected = ["LONG", "SHORT"].includes(String(els.side?.value || "").toUpperCase());
        const sideOk = sideSelected && now - getTs(LS_SIDE_TS) < ONE_HOUR_MS;
        const entryOk = getTs(LS_ENTRY_TS) > 0 && now - getTs(LS_ENTRY_TS) < ONE_HOUR_MS;
        if (!sideSelected) showCenterTip("롱/숏 확인하세요", 1000);
        else if (!sideOk || !entryOk) showToastFor("롱/숏·진입가 확인하세요", 2000);

        try {
          await copyPresetToClipboardWithRetries({ maxAttempts: 6 });
          showToast("클립보드에 복사됨");
        } catch (e) {
          console.error(e);
          // 실패하면 다음 사용자 제스처(클릭)에서 자동으로 다시 시도
          showToastFor(getClipboardFailureMessage(e), 2500);
          armPresetRetryOnNextGesture();
        }
      });
    });

    // Unified Navigator event bindings
    const selTarget = document.getElementById("selNavTarget");
    const inpText = document.getElementById("inpNavText");
    const clrPicker = document.getElementById("clrNavColor");
    const selFont = document.getElementById("selNavFont");
    const inpColorHex = document.getElementById("inpNavColorHex");
    const rngNavOpacity = document.getElementById("rngNavOpacity");
    const lblNavOpacity = document.getElementById("lblNavOpacity");
    const rngSideBadgeSize = document.getElementById("rngSideBadgeSize");
    const rngSideBadgeBorder = document.getElementById("rngSideBadgeBorder");
    const rngSideBadgeOpacity = document.getElementById("rngSideBadgeOpacity");
    const lblSideBadgeSize = document.getElementById("lblSideBadgeSize");
    const rngSideBadgeHeight = document.getElementById("rngSideBadgeHeight");
    const lblSideBadgeHeight = document.getElementById("lblSideBadgeHeight");
    const lblSideBadgeBorder = document.getElementById("lblSideBadgeBorder");
    const lblSideBadgeOpacity = document.getElementById("lblSideBadgeOpacity");
    const rngProfitDividerWidth = document.getElementById("rngProfitDividerWidth");
    const rngProfitDividerThick = document.getElementById("rngProfitDividerThick");
    const lblProfitDividerWidth = document.getElementById("lblProfitDividerWidth");
    const lblProfitDividerThick = document.getElementById("lblProfitDividerThick");

    const ensureStyle = (selector) => {
      if (!cardCustomStyles[selector]) {
        cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
      }
      return cardCustomStyles[selector];
    };

    if (selTarget) {
      selTarget.addEventListener("change", () => {
        updateNavControlsForTarget(selTarget.value);
      });
    }

    // 초기 표시를 위해 투명도 라벨 동기화
    if (rngNavOpacity && lblNavOpacity) {
      lblNavOpacity.textContent = String(Number(rngNavOpacity.value).toFixed(2));
    }

    // LONG/SHORT 박스( #txtSideBox ) 전용
    const applySideBadge = () => {
      const st = ensureStyle("#txtSideBox");
      if (rngSideBadgeSize) st.size = Number(rngSideBadgeSize.value);
      if (rngSideBadgeHeight) st.height = Number(rngSideBadgeHeight.value);
      if (rngSideBadgeBorder) st.weight = Number(rngSideBadgeBorder.value);
      if (rngSideBadgeOpacity) st.opacity = Number(rngSideBadgeOpacity.value);
      if (lblSideBadgeSize && rngSideBadgeSize) lblSideBadgeSize.textContent = `${Math.round(Number(rngSideBadgeSize.value))}px`;
      if (lblSideBadgeHeight && rngSideBadgeHeight) lblSideBadgeHeight.textContent = `${Math.round(Number(rngSideBadgeHeight.value))}px`;
      if (lblSideBadgeBorder && rngSideBadgeBorder) lblSideBadgeBorder.textContent = `${Math.round(Number(rngSideBadgeBorder.value))}px`;
      if (lblSideBadgeOpacity && rngSideBadgeOpacity) lblSideBadgeOpacity.textContent = String(Number(rngSideBadgeOpacity.value).toFixed(2));
      renderAll();
      scheduleCloudSave();
    };

    [rngSideBadgeSize, rngSideBadgeHeight, rngSideBadgeBorder, rngSideBadgeOpacity].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", applySideBadge);
      el.addEventListener("change", applySideBadge);
    });

    // 파란 구분선( #profitDivider ) 전용
    const applyProfitDivider = () => {
      const st = ensureStyle("#profitDivider");
      if (rngProfitDividerWidth) st.size = Number(rngProfitDividerWidth.value);
      if (rngProfitDividerThick) st.weight = Number(rngProfitDividerThick.value);
      if (lblProfitDividerWidth && rngProfitDividerWidth) lblProfitDividerWidth.textContent = `${Math.round(Number(rngProfitDividerWidth.value))}px`;
      if (lblProfitDividerThick && rngProfitDividerThick) lblProfitDividerThick.textContent = `${Math.round(Number(rngProfitDividerThick.value))}px`;
      renderAll();
      scheduleCloudSave();
    };
    [rngProfitDividerWidth, rngProfitDividerThick].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", applyProfitDivider);
      el.addEventListener("change", applyProfitDivider);
    });

    if (inpText) {
      const updateText = () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        cardCustomStyles[selector].text = inpText.value;
        renderAll();
        scheduleCloudSave();
      };
      inpText.addEventListener("input", updateText);
      inpText.addEventListener("change", updateText);
    }

    if (clrPicker) {
      clrPicker.addEventListener("input", () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        cardCustomStyles[selector].color = clrPicker.value;
        if (inpColorHex) inpColorHex.value = clrPicker.value;
        renderAll();
        scheduleCloudSave();
      });
    }

    // HEX 입력(#RRGGBB) → 즉시 색상 적용
    if (inpColorHex) {
      const applyHex = () => {
        const raw = String(inpColorHex.value || "").trim();
        const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
        if (!m) return;
        const hex = "#" + m[1].toLowerCase();
        const selector = selTarget.value;
        const st = ensureStyle(selector);
        st.color = hex;
        if (clrPicker) clrPicker.value = hex;
        renderAll();
        scheduleCloudSave();
      };
      inpColorHex.addEventListener("input", applyHex);
      inpColorHex.addEventListener("change", applyHex);
    }

    if (selFont) {
      selFont.addEventListener("change", () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        cardCustomStyles[selector].font = selFont.value;
        renderAll();
        scheduleCloudSave();
      });
    }

    if (rngNavOpacity) {
      const onOpacity = () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        cardCustomStyles[selector].opacity = clamp(Number(rngNavOpacity.value), 0, 1);
        if (lblNavOpacity) lblNavOpacity.textContent = String(Number(rngNavOpacity.value).toFixed(2));
        renderAll();
        scheduleCloudSave();
      };
      rngNavOpacity.addEventListener("input", onOpacity);
      rngNavOpacity.addEventListener("change", onOpacity);
    }

    const btnBolder = document.getElementById("btnNavWeightBolder");
    if (btnBolder) {
      btnBolder.addEventListener("click", () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        if (selector === "#profitDivider" || selector === "#txtSideBox") {
          const cur = cardCustomStyles[selector].weight != null ? Number(cardCustomStyles[selector].weight) : 2;
          cardCustomStyles[selector].weight = Math.max(1, Math.min(12, Math.round(cur + 1)));
        } else {
          cardCustomStyles[selector].weight = "700";
        }
        renderAll();
        scheduleCloudSave();
      });
    }

    const btnLighter = document.getElementById("btnNavWeightLighter");
    if (btnLighter) {
      btnLighter.addEventListener("click", () => {
        const selector = selTarget.value;
        if (!cardCustomStyles[selector]) {
          cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
        }
        if (selector === "#profitDivider" || selector === "#txtSideBox") {
          const cur = cardCustomStyles[selector].weight != null ? Number(cardCustomStyles[selector].weight) : 2;
          cardCustomStyles[selector].weight = Math.max(1, Math.min(12, Math.round(cur - 1)));
        } else {
          cardCustomStyles[selector].weight = "400";
        }
        renderAll();
        scheduleCloudSave();
      });
    }

    const adjustSize = (delta) => {
      const selector = selTarget.value;
      if (!cardCustomStyles[selector]) {
        cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null };
      }
      let curSize = cardCustomStyles[selector].size;
      if (curSize == null) {
        const el = els.cardRoot.querySelector(selector);
        if (el) {
          if (selector === ".dgb-close-btn") {
            const r = el.getBoundingClientRect();
            curSize = Math.round(r.width || r.height || 32);
          } else if (selector === "#profitDivider") {
            curSize = Math.round(el.getBoundingClientRect().width || 220);
          } else if (selector === "#txtSideBox") {
            curSize = Number(cardCustomStyles[selector].size) || 34;
          } else {
            curSize = parseFloat(window.getComputedStyle(el).fontSize) || 16;
          }
        } else {
          curSize = 16;
        }
      }
      if (selector === ".dgb-close-btn") {
        cardCustomStyles[selector].size = Math.max(18, Math.min(80, Math.round(curSize + delta)));
      } else if (selector === "#profitDivider") {
        cardCustomStyles[selector].size = Math.max(40, Math.min(420, Math.round(curSize + delta * 10)));
      } else if (selector === "#txtSideBox") {
        cardCustomStyles[selector].size = Math.max(14, Math.min(80, Math.round(curSize + delta)));
      } else {
        cardCustomStyles[selector].size = Math.max(8, Math.round(curSize + delta));
      }
      renderAll();
      scheduleCloudSave();
    };

    const btnSizeUp = document.getElementById("btnNavSizeUp");
    if (btnSizeUp) btnSizeUp.addEventListener("click", () => adjustSize(1));

    const btnSizeDown = document.getElementById("btnNavSizeDown");
    if (btnSizeDown) btnSizeDown.addEventListener("click", () => adjustSize(-1));

    const adjustSpacing = (delta) => {
      const selector = selTarget.value;
      if (!cardCustomStyles[selector]) {
        cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null };
      }
      const el = els.cardRoot.querySelector(selector);
      const cur =
        cardCustomStyles[selector].tracking != null
          ? Number(cardCustomStyles[selector].tracking)
          : (el ? parseFloat(window.getComputedStyle(el).letterSpacing) || 0 : 0);
      cardCustomStyles[selector].tracking = Math.max(-2, Math.min(20, Number((cur + delta).toFixed(1))));
      renderAll();
      scheduleCloudSave();
    };

    const btnSpacingUp = document.getElementById("btnNavSpacingUp");
    if (btnSpacingUp) btnSpacingUp.addEventListener("click", () => adjustSpacing(0.5));

    const btnSpacingDown = document.getElementById("btnNavSpacingDown");
    if (btnSpacingDown) btnSpacingDown.addEventListener("click", () => adjustSpacing(-0.5));

    const adjustPos = (dx, dy) => {
      const selector = selTarget.value;
      if (!cardCustomStyles[selector]) {
        cardCustomStyles[selector] = { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null };
      }
      const step = parseInt(document.getElementById("numNavStep").value, 10) || 1;
      cardCustomStyles[selector].x = (cardCustomStyles[selector].x || 0) + dx * step;
      cardCustomStyles[selector].y = (cardCustomStyles[selector].y || 0) + dy * step;
      renderAll();
      scheduleCloudSave();
    };

    const btnUp = document.getElementById("btnNavUp");
    if (btnUp) btnUp.addEventListener("click", () => adjustPos(0, -1));

    const btnDown = document.getElementById("btnNavDown");
    if (btnDown) btnDown.addEventListener("click", () => adjustPos(0, 1));

    const btnLeft = document.getElementById("btnNavLeft");
    if (btnLeft) btnLeft.addEventListener("click", () => adjustPos(-1, 0));

    const btnRight = document.getElementById("btnNavRight");
    if (btnRight) btnRight.addEventListener("click", () => adjustPos(1, 0));

    const btnNavReset = document.getElementById("btnNavReset");
    if (btnNavReset) {
      btnNavReset.addEventListener("click", () => {
        const selector = selTarget.value;
        if (cardCustomStyles[selector]) {
          delete cardCustomStyles[selector];
          renderAll();
          scheduleCloudSave();
          updateNavControlsForTarget(selector);
        }
      });
    }

    // Keyboard Arrow Keys and Numpad +/- controls
    window.addEventListener("keydown", (e) => {
      const chk = document.getElementById("chkKbControl");
      if (!chk || !chk.checked) return;
      const chkOverlay = document.getElementById("chkOverlayKb");
      // 오버레이 키보드 조작이 켜져 있으면 네비게이터 단축키는 비활성(겹침 방지)
      if (chkOverlay && chkOverlay.checked) return;

      // Skip keyboard adjustments if user is typing in a text field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.target.id !== "chkKbControl" && e.target.id !== "numNavStep") return;
      }

      let handled = false;
      if (e.key === "ArrowUp") {
        adjustPos(0, -1);
        handled = true;
      } else if (e.key === "ArrowDown") {
        adjustPos(0, 1);
        handled = true;
      } else if (e.key === "ArrowLeft") {
        adjustPos(-1, 0);
        handled = true;
      } else if (e.key === "ArrowRight") {
        adjustPos(1, 0);
        handled = true;
      } else if (e.key === "+" || e.key === "Add" || e.key === "=" || e.code === "NumpadAdd") {
        adjustSize(1);
        handled = true;
      } else if (e.key === "-" || e.key === "Subtract" || e.code === "NumpadSubtract") {
        adjustSize(-1);
        handled = true;
      }

      if (handled) {
        e.preventDefault();
      }
    });
  }

  function applyAllCustomStylesAndTextOverrides() {
    if (!els.cardRoot) return;
    Object.keys(cardCustomStyles).forEach((selector) => {
      const styleData = cardCustomStyles[selector];
      if (!styleData) return;
      const el = els.cardRoot.querySelector(selector);
      if (el) {
        if (selector === "#txtSideBox") {
          el.style.transform = `translate(calc(-50% + ${styleData.x || 0}px), calc(-50% + ${styleData.y || 0}px))`;
        } else {
          el.style.transform = `translate(${styleData.x || 0}px, ${styleData.y || 0}px)`;
        }
        if (selector === "#profitDivider") {
          // 파란 구분선: size=길이(px), weight=굵기(px), opacity=투명도, color=색상
          if (styleData.size != null && styleData.size !== "") el.style.width = `${Math.max(40, Math.round(Number(styleData.size) || 0))}px`;
          else el.style.width = "";
          if (styleData.weight != null && styleData.weight !== "") el.style.height = `${Math.max(1, Math.round(Number(styleData.weight) || 0))}px`;
          else el.style.height = "";
          if (styleData.opacity != null && styleData.opacity !== "") el.style.opacity = String(clamp(styleData.opacity, 0, 1));
          else el.style.opacity = "";
          if (styleData.color) {
            const rgb = hexToRgb(styleData.color);
            if (rgb) {
              el.style.setProperty("--profit-divider-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            } else {
              el.style.removeProperty("--profit-divider-rgb");
            }
          } else {
            el.style.removeProperty("--profit-divider-rgb");
          }
        }
        if (selector === ".dgb-close-btn") {
          if (styleData.size) {
            const px = Math.max(18, Math.min(80, Math.round(Number(styleData.size) || 0)));
            el.style.width = px + "px";
            el.style.height = px + "px";
            const svg = el.querySelector("svg");
            if (svg) {
              const s = Math.max(10, Math.round(px * 0.55));
              svg.setAttribute("width", String(s));
              svg.setAttribute("height", String(s));
            }
          } else {
            el.style.width = "";
            el.style.height = "";
            const svg = el.querySelector("svg");
            if (svg) {
              svg.removeAttribute("width");
              svg.removeAttribute("height");
            }
          }
          el.style.fontSize = "";
        } else {
          if (styleData.size) el.style.fontSize = styleData.size + "px";
          else el.style.fontSize = "";
        }
        if (styleData.weight) el.style.fontWeight = styleData.weight;
        else el.style.fontWeight = "";
        if (styleData.color) el.style.color = styleData.color;
        else el.style.color = "";
        if (styleData.font && styleData.font !== "inherit") el.style.fontFamily = styleData.font;
        else el.style.fontFamily = "";
        if (styleData.tracking != null && styleData.tracking !== "") el.style.letterSpacing = `${Number(styleData.tracking)}px`;
        else el.style.letterSpacing = "";
        if (selector !== "#txtSide") {
          if (styleData.opacity != null && styleData.opacity !== "") el.style.opacity = String(styleData.opacity);
          else el.style.opacity = "";
        } else {
          // 롱/숏은 박스 투명도를 별도 변수로 제어(텍스트는 고정)
          el.style.opacity = "";
        }

        // LONG/SHORT 뱃지 박스(크기/굵기/투명도/색상)
        if (selector === "#txtSide") {
          if (styleData.badgeSize != null && styleData.badgeSize !== "") el.style.setProperty("--badge-size", `${Math.round(Number(styleData.badgeSize) || 24)}px`);
          else el.style.removeProperty("--badge-size");
          if (styleData.badgeBorder != null && styleData.badgeBorder !== "") el.style.setProperty("--badge-border-width", `${Math.round(Number(styleData.badgeBorder) || 1)}px`);
          else el.style.removeProperty("--badge-border-width");
          const boxAlpha = styleData.badgeBoxAlpha != null ? Number(styleData.badgeBoxAlpha) : (styleData.opacity != null ? Number(styleData.opacity) : null);
          if (boxAlpha != null) el.style.setProperty("--badge-box-alpha", String(clamp(boxAlpha, 0, 1)));
          // 박스 색상은 txtSideBox에서 처리(역호환 목적)
        }
        if (selector === "#txtSideBox") {
          const parent = els.cardRoot.querySelector("#txtSide");
          if (parent) {
            // size=박스 크기, weight=박스선 굵기, opacity=투명도(0~1), color=박스선 색상
          if (styleData.size != null && styleData.size !== "") parent.style.setProperty("--badge-box-width", `${Math.max(18, Math.round(Number(styleData.size) || 34))}px`);
          if (styleData.height != null && styleData.height !== "") parent.style.setProperty("--badge-box-height", `${Math.max(18, Math.round(Number(styleData.height) || 46))}px`);
            if (styleData.weight != null && styleData.weight !== "") parent.style.setProperty("--badge-border-width", `${Math.round(Number(styleData.weight) || 2)}px`);
            if (styleData.opacity != null && styleData.opacity !== "") parent.style.setProperty("--badge-box-alpha", String(clamp(styleData.opacity, 0, 1)));
            if (styleData.color) {
              const rgb = hexToRgb(styleData.color);
              if (rgb) parent.style.setProperty("--badge-box-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
          }
        }
        if (styleData.text !== undefined && styleData.text !== null && styleData.text !== "") {
          if (selector === "#txtSide") {
            const t = el.querySelector(".dgb-side-text");
            if (t) t.textContent = styleData.text;
          } else {
            el.textContent = styleData.text;
          }
        }
      }
    });
  }

  function updateNavControlsForTarget(selector) {
    const styleData = cardCustomStyles[selector] || { x: 0, y: 0, size: null, weight: null, color: null, font: "inherit", text: null, opacity: null, badgeSize: null, badgeBorder: null, badgeBoxAlpha: null };
    const el = els.cardRoot.querySelector(selector);
    const inpText = document.getElementById("inpNavText");
    if (inpText) {
      inpText.value = styleData.text !== undefined && styleData.text !== null ? styleData.text : (el ? el.textContent : "");
    }
    const clrPicker = document.getElementById("clrNavColor");
    const inpColorHex = document.getElementById("inpNavColorHex");
    if (clrPicker) {
      if (styleData.color) {
        clrPicker.value = styleData.color;
      } else if (selector === "#txtSideBox" && els.cardRoot.querySelector("#txtSide")) {
        const bc = getComputedStyle(els.cardRoot.querySelector("#txtSide").querySelector(".dgb-side-box")).borderColor;
        clrPicker.value = rgbToHex(bc) || "#3b82f6";
      } else if (selector === "#profitDivider" && el) {
        clrPicker.value = rgbToHex(window.getComputedStyle(el).backgroundColor) || "#3b82f6";
      } else if (el) {
        clrPicker.value = rgbToHex(window.getComputedStyle(el).color) || "#ffffff";
      } else {
        clrPicker.value = "#ffffff";
      }
    }
    if (inpColorHex) {
      if (styleData.color) {
        inpColorHex.value = String(styleData.color);
      } else if (selector === "#txtSideBox" && els.cardRoot.querySelector("#txtSide")) {
        inpColorHex.value = rgbToHex(getComputedStyle(els.cardRoot.querySelector("#txtSide").querySelector(".dgb-side-box")).borderColor) || "#3b82f6";
      } else if (selector === "#profitDivider" && el) {
        inpColorHex.value = rgbToHex(window.getComputedStyle(el).backgroundColor) || "#3b82f6";
      } else {
        inpColorHex.value = el ? (rgbToHex(window.getComputedStyle(el).color) || "#ffffff") : "#ffffff";
      }
    }
    const selFont = document.getElementById("selNavFont");
    if (selFont) {
      selFont.value = styleData.font || "inherit";
    }

    // 공용 투명도 슬라이더
    const rngOp = document.getElementById("rngNavOpacity");
    const lblOp = document.getElementById("lblNavOpacity");
    if (rngOp) {
      const v =
        styleData.opacity != null
          ? Number(styleData.opacity)
          : (selector === "#txtSideBox" && els.cardRoot.querySelector("#txtSide")
              ? parseFloat(getComputedStyle(els.cardRoot.querySelector("#txtSide")).getPropertyValue("--badge-box-alpha")) || 1
              : (el ? parseFloat(getComputedStyle(el).opacity) || 1 : 1));
      rngOp.value = String(Number.isFinite(v) ? v : 1);
      if (lblOp) lblOp.textContent = String(Number(rngOp.value).toFixed(2));
    }

    // LONG/SHORT 박스 전용 컨트롤
    const rngBadgeSize = document.getElementById("rngSideBadgeSize");
    const rngBadgeBorder = document.getElementById("rngSideBadgeBorder");
    const rngBadgeOpacity = document.getElementById("rngSideBadgeOpacity");
    const lblBadgeSize = document.getElementById("lblSideBadgeSize");
    const rngBadgeHeight = document.getElementById("rngSideBadgeHeight");
    const lblBadgeHeight = document.getElementById("lblSideBadgeHeight");
    const lblBadgeBorder = document.getElementById("lblSideBadgeBorder");
    const lblBadgeOpacity = document.getElementById("lblSideBadgeOpacity");

    const enabled = selector === "#txtSideBox" || selector === "#txtSide";
    [rngBadgeSize, rngBadgeHeight, rngBadgeBorder, rngBadgeOpacity].forEach((x) => {
      if (!x) return;
      x.disabled = !enabled;
      x.style.opacity = enabled ? "1" : "0.4";
    });

    if (rngBadgeSize) {
      const v =
        selector === "#txtSideBox" && styleData.size != null
          ? Number(styleData.size)
          : (styleData.badgeSize != null ? Number(styleData.badgeSize) : (els.cardRoot.querySelector("#txtSide") ? parseFloat(getComputedStyle(els.cardRoot.querySelector("#txtSide")).getPropertyValue("--badge-box-width")) || 34 : 34));
      rngBadgeSize.value = String(Number.isFinite(v) ? v : 34);
      if (lblBadgeSize) lblBadgeSize.textContent = `${Math.round(Number(rngBadgeSize.value))}px`;
    }
    if (rngBadgeHeight) {
      const v =
        selector === "#txtSideBox" && styleData.height != null
          ? Number(styleData.height)
          : (els.cardRoot.querySelector("#txtSide") ? parseFloat(getComputedStyle(els.cardRoot.querySelector("#txtSide")).getPropertyValue("--badge-box-height")) || 46 : 46);
      rngBadgeHeight.value = String(Number.isFinite(v) ? v : 46);
      if (lblBadgeHeight) lblBadgeHeight.textContent = `${Math.round(Number(rngBadgeHeight.value))}px`;
    }
    if (rngBadgeBorder) {
      const v =
        selector === "#txtSideBox" && styleData.weight != null
          ? Number(styleData.weight)
          : (styleData.badgeBorder != null ? Number(styleData.badgeBorder) : (els.cardRoot.querySelector("#txtSide") ? parseFloat(getComputedStyle(els.cardRoot.querySelector("#txtSide")).getPropertyValue("--badge-border-width")) || 1 : 1));
      rngBadgeBorder.value = String(Number.isFinite(v) ? v : 2);
      if (lblBadgeBorder) lblBadgeBorder.textContent = `${Math.round(Number(rngBadgeBorder.value))}px`;
    }
    if (rngBadgeOpacity) {
      const v =
        selector === "#txtSideBox" && styleData.opacity != null
          ? Number(styleData.opacity)
          : (styleData.badgeBoxAlpha != null
              ? Number(styleData.badgeBoxAlpha)
              : (styleData.opacity != null ? Number(styleData.opacity) : (els.cardRoot.querySelector("#txtSide") ? parseFloat(getComputedStyle(els.cardRoot.querySelector("#txtSide")).getPropertyValue("--badge-box-alpha")) || 1 : 1)));
      rngBadgeOpacity.value = String(Number.isFinite(v) ? v : 1);
      if (lblBadgeOpacity) lblBadgeOpacity.textContent = String(Number(rngBadgeOpacity.value).toFixed(2));
    }

    // 파란 구분선 전용 컨트롤
    const rngPDWidth = document.getElementById("rngProfitDividerWidth");
    const rngPDThick = document.getElementById("rngProfitDividerThick");
    const lblPDWidth = document.getElementById("lblProfitDividerWidth");
    const lblPDThick = document.getElementById("lblProfitDividerThick");

    const pdEnabled = selector === "#profitDivider";
    [rngPDWidth, rngPDThick].forEach((x) => {
      if (!x) return;
      x.disabled = !pdEnabled;
      x.style.opacity = pdEnabled ? "1" : "0.4";
    });
    if (rngPDWidth) {
      const v = styleData.size != null ? Number(styleData.size) : (el ? Math.round(el.getBoundingClientRect().width || 300) : 300);
      rngPDWidth.value = String(Number.isFinite(v) ? v : 300);
      if (lblPDWidth) lblPDWidth.textContent = `${Math.round(Number(rngPDWidth.value))}px`;
    }
    if (rngPDThick) {
      const v = styleData.weight != null ? Number(styleData.weight) : (el ? Math.round(el.getBoundingClientRect().height || 4) : 4);
      rngPDThick.value = String(Number.isFinite(v) ? v : 4);
      if (lblPDThick) lblPDThick.textContent = `${Math.round(Number(rngPDThick.value))}px`;
    }
  }

  function hexToRgb(hex) {
    const m = String(hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(rgb) {
    if (!rgb) return "#ffffff";
    const m = rgb.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
      return "#" + ("0" + parseInt(m[1], 10).toString(16)).slice(-2) +
                   ("0" + parseInt(m[2], 10).toString(16)).slice(-2) +
                   ("0" + parseInt(m[3], 10).toString(16)).slice(-2);
    }
    const mHex = rgb.match(/^#([0-9a-f]{6})$/i);
    if (mHex) return rgb;
    return "#ffffff";
  }

  function bindClickToNavTargets() {
    if (!els.cardRoot) return;
    els.cardRoot.querySelectorAll("[data-nav-target]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const selector = el.getAttribute("data-nav-target");
        const selTarget = document.getElementById("selNavTarget");
        if (selTarget) {
          selTarget.value = selector;
          selTarget.dispatchEvent(new Event("change"));
          showToastFor("대상 선택 완료", 800);
        }
      });
    });
  }

  function bindOverlayControls() {
    const inpFile = document.getElementById("inpOverlayFile");
    const rngOpacity = document.getElementById("valOverlayOpacity");
    const btnOverlayScaleDown = document.getElementById("btnOverlayScaleDown");
    const btnOverlayScaleUp = document.getElementById("btnOverlayScaleUp");
    const btnOverlayUp = document.getElementById("btnOverlayUp");
    const btnOverlayDown = document.getElementById("btnOverlayDown");
    const btnOverlayLeft = document.getElementById("btnOverlayLeft");
    const btnOverlayRight = document.getElementById("btnOverlayRight");
    const btnOverlayReset = document.getElementById("btnOverlayReset");

    if (!document.getElementById("imgOverlay")) return;

    const commitOverlay = () => {
      syncOverlayUi();
      applyOverlayToDom();
      scheduleCloudSave();
    };

    if (inpFile) {
      inpFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            overlayState.src = String(event.target.result || "");
            commitOverlay();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (rngOpacity) {
      const onOpacity = () => {
        overlayState.opacity = clamp(Number(rngOpacity.value), 0, 1);
        commitOverlay();
      };
      rngOpacity.addEventListener("input", onOpacity);
      rngOpacity.addEventListener("change", onOpacity);
    }

    const moveOverlay = (dx, dy) => {
      overlayState.x = Math.round(Number(overlayState.x) || 0) + dx;
      overlayState.y = Math.round(Number(overlayState.y) || 0) + dy;
      commitOverlay();
    };
    const scaleOverlay = (delta) => {
      overlayState.scale = clamp((Number(overlayState.scale) || 1) + delta, 0.1, 4);
      commitOverlay();
    };

    if (btnOverlayUp) btnOverlayUp.addEventListener("click", () => moveOverlay(0, -1));
    if (btnOverlayDown) btnOverlayDown.addEventListener("click", () => moveOverlay(0, 1));
    if (btnOverlayLeft) btnOverlayLeft.addEventListener("click", () => moveOverlay(-1, 0));
    if (btnOverlayRight) btnOverlayRight.addEventListener("click", () => moveOverlay(1, 0));
    if (btnOverlayScaleDown) btnOverlayScaleDown.addEventListener("click", () => scaleOverlay(-0.02));
    if (btnOverlayScaleUp) btnOverlayScaleUp.addEventListener("click", () => scaleOverlay(0.02));
    if (btnOverlayReset) {
      btnOverlayReset.addEventListener("click", () => {
        overlayState.x = 0;
        overlayState.y = 0;
        overlayState.scale = 1;
        overlayState.opacity = 0.5;
        if (rngOpacity) rngOpacity.value = "0.5";
        commitOverlay();
      });
    }

    // 오버레이 키보드 조작 (체크박스가 체크된 경우만)
    if (!bindOverlayControls._kbBound) {
      bindOverlayControls._kbBound = true;
      window.addEventListener("keydown", (e) => {
        const chk = document.getElementById("chkOverlayKb");
        if (!chk || !chk.checked) return;

        // 입력 중이면 무시 (체크박스 자체는 예외)
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) {
          if (e.target.id !== "chkOverlayKb") return;
        }

        let handled = false;
        if (e.key === "ArrowUp") {
          moveOverlay(0, -1);
          handled = true;
        } else if (e.key === "ArrowDown") {
          moveOverlay(0, 1);
          handled = true;
        } else if (e.key === "ArrowLeft") {
          moveOverlay(-1, 0);
          handled = true;
        } else if (e.key === "ArrowRight") {
          moveOverlay(1, 0);
          handled = true;
        } else if (e.code === "NumpadAdd") {
          scaleOverlay(+0.02);
          handled = true;
        } else if (e.code === "NumpadSubtract") {
          scaleOverlay(-0.02);
          handled = true;
        }

        if (handled) e.preventDefault();
      });
    }

    syncOverlayUi();
    applyOverlayToDom();
  }

  async function init() {
    initMaskedPreview();
    bindPhraseUi();
    bindEntryVariationUi();
    bindPresetProfitUi();
    bindCropUi();
    bind();
    bindSideUi();
    syncBgShiftInputs();
    bindClickToNavTargets();
    bindOverlayControls();
    cloudReady = false;
    if (cloudConfigured()) await cloudLoad();
    cloudReady = true;
    if (!els.side?.value) setSide(DEFAULTS.side, { shouldSave: false });
    
    const selTarget = document.getElementById("selNavTarget");
    if (selTarget) {
      updateNavControlsForTarget(selTarget.value);
    }

    rerollIfNeeded(true);
    renderAll();
    triggerWarningFlash();

    // 빌드 버전(커밋마다 갱신되는 version.json)
    if (els.buildVersion) {
      // file:// 로 열어도 무조건 표시되도록 우선 내장 버전을 표시
      els.buildVersion.textContent = BUILD_VERSION;
      try {
        // file:// 환경에서는 fetch가 실패할 수 있어, 성공할 때만 덮어씁니다.
        const res = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data && data.build) els.buildVersion.textContent = String(data.build);
      } catch {
        // ignore
      }
    }

    // 캡처/복사 UI가 있는 페이지에서만 file:// 제한 안내
    const hasCaptureUi = !!(els.generate || els.downloadZip || document.querySelector(".preset-btn"));
    if (location.protocol === "file:" && hasCaptureUi) {
      showToastFor("권장: 로컬 서버로 열기(파일로 열면 캡처/복사 제한 가능)", 3500);
    }
  }

  init();
})();
