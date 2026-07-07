/**
 * @file scripts/dense-layout-planner.js
 * @brief Objective candidate scoring for SP-022 Dense gallery layout.
 */

export const DENSE_LAYOUT_PLANNER_VERSION = 'sp-022-objective-planner-2026-07-07';

export const DENSE_LAYOUT_SCORING_WEIGHTS = Object.freeze({
  areaUtilization: 1,
  verticalSlack: 1.15,
  horizontalSlack: 0.18,
  maxAxisUnderuse: 0.18,
  emptySlots: 0.2,
  minTileWidth: 0.12,
});

const DEFAULT_TILE_ASPECT_RATIO = 16 / 9;
const DEFAULT_MIN_TILE_WIDTH = 120;
const SCORE_TIE_EPSILON = 0.000001;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundMetric(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizePadding(padding) {
  if (!padding || typeof padding !== 'object') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  return {
    top: Math.max(0, finiteNumber(padding.top)),
    right: Math.max(0, finiteNumber(padding.right)),
    bottom: Math.max(0, finiteNumber(padding.bottom)),
    left: Math.max(0, finiteNumber(padding.left)),
  };
}

function sumScoreComponents(components) {
  return Object.values(components).reduce((total, value) => total + value, 0);
}

function compareDenseCandidates(a, b) {
  if (Math.abs(b.score - a.score) > SCORE_TIE_EPSILON) {
    return b.score - a.score;
  }
  if (Math.abs(a.verticalSlackRatio - b.verticalSlackRatio) > SCORE_TIE_EPSILON) {
    return a.verticalSlackRatio - b.verticalSlackRatio;
  }
  const aMaxSlack = Math.max(a.horizontalSlackRatio, a.verticalSlackRatio);
  const bMaxSlack = Math.max(b.horizontalSlackRatio, b.verticalSlackRatio);
  if (Math.abs(aMaxSlack - bMaxSlack) > SCORE_TIE_EPSILON) {
    return aMaxSlack - bMaxSlack;
  }
  if (Math.abs(b.visibleTileArea - a.visibleTileArea) > SCORE_TIE_EPSILON) {
    return b.visibleTileArea - a.visibleTileArea;
  }
  return a.columns - b.columns;
}

function makeCandidateReason(candidate, selected) {
  const grid = `${candidate.columns}x${candidate.rows}`;
  const slack =
    `vSlack=${roundMetric(candidate.verticalSlackRatio * 100, 1)}%, ` +
    `hSlack=${roundMetric(candidate.horizontalSlackRatio * 100, 1)}%`;
  const area = `area=${roundMetric(candidate.areaUtilizationRatio * 100, 1)}%`;
  const empty = `empty=${candidate.emptySlots}`;

  if (selected) {
    return `${grid} selected: highest objective score after area, vertical slack, horizontal slack, max-axis underuse, and empty-slot penalties (${area}; ${slack}; ${empty}).`;
  }

  return `${grid} not selected: lower objective score than the selected candidate (${area}; ${slack}; ${empty}).`;
}

export function planDenseLayout(options) {
  const stageWidth = Math.max(0, finiteNumber(options?.stageWidth ?? options?.width));
  const stageHeight = Math.max(0, finiteNumber(options?.stageHeight ?? options?.height));
  const tileCount = Math.max(0, Math.floor(finiteNumber(options?.tileCount ?? options?.count)));
  const gap = Math.max(0, finiteNumber(options?.gap));
  const padding = normalizePadding(options?.padding);
  const tileAspectRatio = Math.max(
    0.1,
    finiteNumber(options?.tileAspectRatio, DEFAULT_TILE_ASPECT_RATIO)
  );
  const minTileWidth = Math.max(1, finiteNumber(options?.minTileWidth, DEFAULT_MIN_TILE_WIDTH));
  const weights = { ...DENSE_LAYOUT_SCORING_WEIGHTS, ...(options?.weights || {}) };
  const usableWidth = Math.max(0, stageWidth - padding.left - padding.right);
  const usableHeight = Math.max(0, stageHeight - padding.top - padding.bottom);
  const stageArea = usableWidth * usableHeight;
  const chromeMode = options?.chromeMode || 'unknown';
  const candidates = [];

  for (let columns = 1; columns <= tileCount; columns += 1) {
    const rows = Math.ceil(tileCount / columns);
    const capacity = columns * rows;
    const emptySlots = capacity - tileCount;
    const widthAfterGaps = usableWidth - gap * (columns - 1);
    const heightAfterGaps = usableHeight - gap * (rows - 1);

    if (widthAfterGaps <= 0 || heightAfterGaps <= 0 || stageArea <= 0) {
      continue;
    }

    const maxTileWidthFromWidth = widthAfterGaps / columns;
    const maxTileHeightFromHeight = heightAfterGaps / rows;
    const tileWidth = Math.floor(
      Math.min(maxTileWidthFromWidth, maxTileHeightFromHeight * tileAspectRatio)
    );
    const tileHeight = tileWidth / tileAspectRatio;

    if (tileWidth <= 0 || tileHeight <= 0) {
      continue;
    }

    const usedStageWidth = tileWidth * columns + gap * (columns - 1);
    const usedStageHeight = tileHeight * rows + gap * (rows - 1);
    const horizontalSlack = Math.max(0, usableWidth - usedStageWidth);
    const verticalSlack = Math.max(0, usableHeight - usedStageHeight);
    const visibleTileArea = tileWidth * tileHeight * tileCount;
    const totalTileArea = tileWidth * tileHeight * capacity;
    const areaUtilizationRatio = stageArea > 0 ? visibleTileArea / stageArea : 0;
    const horizontalSlackRatio = usableWidth > 0 ? horizontalSlack / usableWidth : 0;
    const verticalSlackRatio = usableHeight > 0 ? verticalSlack / usableHeight : 0;
    const emptySlotRatio = capacity > 0 ? emptySlots / capacity : 0;
    const maxAxisUnderuseRatio = Math.max(horizontalSlackRatio, verticalSlackRatio);
    const minTileWidthPenaltyRatio =
      tileWidth < minTileWidth ? (minTileWidth - tileWidth) / minTileWidth : 0;

    const scoreComponents = {
      areaUtilization: areaUtilizationRatio * weights.areaUtilization,
      verticalSlackPenalty: -verticalSlackRatio * weights.verticalSlack,
      horizontalSlackPenalty: -horizontalSlackRatio * weights.horizontalSlack,
      maxAxisUnderusePenalty: -maxAxisUnderuseRatio * weights.maxAxisUnderuse,
      emptySlotPenalty: -emptySlotRatio * weights.emptySlots,
      minTileWidthPenalty: -minTileWidthPenaltyRatio * weights.minTileWidth,
    };
    const score = sumScoreComponents(scoreComponents);

    candidates.push({
      columns,
      rows,
      capacity,
      emptySlots,
      tileWidth,
      tileHeight: roundMetric(tileHeight, 2),
      visibleTileArea: roundMetric(visibleTileArea, 2),
      totalTileArea: roundMetric(totalTileArea, 2),
      stageArea: roundMetric(stageArea, 2),
      areaUtilizationRatio: roundMetric(areaUtilizationRatio),
      horizontalSlack: roundMetric(horizontalSlack, 2),
      verticalSlack: roundMetric(verticalSlack, 2),
      horizontalSlackRatio: roundMetric(horizontalSlackRatio),
      verticalSlackRatio: roundMetric(verticalSlackRatio),
      maxAxisUnderuseRatio: roundMetric(maxAxisUnderuseRatio),
      scoreComponents: Object.fromEntries(
        Object.entries(scoreComponents).map(([key, value]) => [key, roundMetric(value)])
      ),
      score: roundMetric(score),
      selected: false,
      reason: '',
    });
  }

  const rankedCandidates = candidates.slice().sort(compareDenseCandidates);
  const selectedCandidate = rankedCandidates[0] || null;

  for (const candidate of candidates) {
    const selected =
      selectedCandidate &&
      candidate.columns === selectedCandidate.columns &&
      candidate.rows === selectedCandidate.rows;
    candidate.selected = Boolean(selected);
    candidate.reason = makeCandidateReason(candidate, selected);
  }

  const selected =
    selectedCandidate &&
    candidates.find(
      (candidate) =>
        candidate.columns === selectedCandidate.columns && candidate.rows === selectedCandidate.rows
    );

  return {
    version: DENSE_LAYOUT_PLANNER_VERSION,
    input: {
      viewportWidth: finiteNumber(options?.viewportWidth, null),
      viewportHeight: finiteNumber(options?.viewportHeight, null),
      stageWidth: roundMetric(stageWidth, 2),
      stageHeight: roundMetric(stageHeight, 2),
      usableWidth: roundMetric(usableWidth, 2),
      usableHeight: roundMetric(usableHeight, 2),
      tileCount,
      tileAspectRatio: roundMetric(tileAspectRatio, 6),
      gap,
      padding,
      chromeMode,
      minTileWidth,
    },
    scoring: {
      weights,
      objective:
        'score = weighted area utilization + negative weighted penalties for vertical slack, horizontal slack, max-axis underuse, empty slots, and undersized tiles',
      tieBreaker:
        'If scores tie, choose lower vertical slack, then lower maximum axis underuse, then larger visible tile area, then fewer columns.',
      note: 'The usable stage area is measured after app chrome; chrome-visible states are scored against their reduced usable canvas.',
    },
    candidates,
    selectedCandidate: selected || null,
  };
}
