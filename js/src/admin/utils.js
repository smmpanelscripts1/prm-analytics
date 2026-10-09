import app from 'flarum/admin/app';

export function t(key, params) {
  return app.translator.trans('prm-analytics.admin.' + key, params || {});
}

export function formatNumber(n) {
  const v = Number(n) || 0;
  return v.toLocaleString();
}

export function deltaClass(delta) {
  if (delta == null) return '';
  if (delta > 0) return 'StatisticsWidget-change--up';
  if (delta < 0) return 'StatisticsWidget-change--down';
  return '';
}

export function deltaLabel(delta) {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : '';
  return sign + delta + '%';
}

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '').trim();
  if (raw.length !== 3 && raw.length !== 6) {
    return 'rgba(77, 105, 142, ' + alpha + ')';
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) {
    return 'rgba(77, 105, 142, ' + alpha + ')';
  }
  return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alpha + ')';
}

/** Colors from the live Flarum admin theme (same idea as core Statistics). */
export function themeColors() {
  const primary = cssVar('--primary-color', '#4D698E');
  const muted = cssVar('--muted-color', '#6c7680');
  const text = cssVar('--text-color', '#111');
  const control = cssVar('--control-bg', '#e8ecf3');

  return {
    primary,
    primarySoft: hexToRgba(primary, 0.18),
    muted,
    mutedSoft: hexToRgba(muted, 0.2),
    text,
    control,
    // Match StatisticsWidget-change exactly
    up: '#00a502',
    down: '#d0011b',
    grid: hexToRgba(muted, 0.25),
  };
}

export function chartDefaults() {
  const c = themeColors();
  return {
    color: c.text,
    borderColor: c.grid,
    muted: c.muted,
    primary: c.primary,
  };
}

/** Small, theme-tied palette — no rainbow SaaS colors. */
export function seriesColors() {
  const c = themeColors();
  return [
    { border: c.primary, fill: c.primarySoft },
    { border: c.muted, fill: c.mutedSoft },
    { border: c.text, fill: hexToRgba(c.text, 0.12) },
  ];
}

export function doughnutColors(count) {
  const c = themeColors();
  const bases = [c.primary, c.muted, c.text, hexToRgba(c.primary, 0.55), hexToRgba(c.muted, 0.7)];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(bases[i % bases.length]);
  }
  return out;
}
