// 太陽位置計算 — 標準天文公式

export const CITIES = {
  // 台灣
  taipei:    { name: '台北',    lat: 25.04,  group: 'TW' },
  taichung:  { name: '台中',    lat: 24.15,  group: 'TW' },
  tainan:    { name: '台南',    lat: 22.99,  group: 'TW' },
  kaohsiung: { name: '高雄',    lat: 22.63,  group: 'TW' },
  // 國際
  singapore: { name: '新加坡',  lat: 1.35,   group: 'INT' },
  bangkok:   { name: '曼谷',    lat: 13.75,  group: 'INT' },
  tokyo:     { name: '東京',    lat: 35.68,  group: 'INT' },
  london:    { name: '倫敦',    lat: 51.51,  group: 'INT' },
  helsinki:  { name: '赫爾辛基', lat: 60.17,  group: 'INT' },
  sydney:    { name: '雪梨',    lat: -33.87, group: 'INT' },
};

export const SEASON_PRESETS = [
  { label: '冬至', month: 12, day: 21 },
  { label: '春分', month: 3,  day: 20 },
  { label: '夏至', month: 6,  day: 21 },
  { label: '秋分', month: 9,  day: 23 },
];

function dayOfYear(month, day) {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let d = day;
  for (let i = 1; i < month; i++) d += days[i];
  return d;
}

/**
 * 計算太陽方位角與高度角
 * @param {number} hour       - 時間 (6.0 ~ 18.0)
 * @param {number} month      - 月份 (1-12)
 * @param {number} day        - 日期 (1-31)
 * @param {number} latDeg     - 緯度（度）
 * @returns {{ altitude, azimuth, isAboveHorizon }}
 *   altitude: 高度角（度），負值代表日落後
 *   azimuth:  方位角（度），0=北 90=東 180=南 270=西
 */
export function calcSunPosition(hour, month, day, latDeg) {
  const DEG = Math.PI / 180;
  const N = dayOfYear(month, day);

  // 太陽赤緯角
  const dec = 23.45 * Math.sin(DEG * (360 / 365) * (284 + N));

  // 時角（正午=0，上午為負，下午為正）
  const ha = (hour - 12) * 15;

  // 高度角
  const sinAlt =
    Math.sin(DEG * latDeg) * Math.sin(DEG * dec) +
    Math.cos(DEG * latDeg) * Math.cos(DEG * dec) * Math.cos(DEG * ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;

  // 方位角（從南方量起，往西為正）
  const cosAlt = Math.cos(DEG * alt);
  let az = 180; // default: south
  if (cosAlt > 0.0001) {
    const cosAzFromSouth =
      (Math.sin(DEG * dec) - Math.sin(DEG * latDeg) * sinAlt) /
      (Math.cos(DEG * latDeg) * cosAlt);
    const azFromSouth = Math.acos(Math.max(-1, Math.min(1, cosAzFromSouth))) / DEG;
    // 轉換成從北方順時針（ha>0 午後太陽在西）
    az = ha > 0 ? 360 - azFromSouth : azFromSouth;
    az = ((az % 360) + 360) % 360;
  }

  // 日出日落時間估算
  const cosHA0 =
    -(Math.tan(DEG * latDeg) * Math.tan(DEG * dec));
  let sunrise = 6, sunset = 18;
  if (Math.abs(cosHA0) <= 1) {
    const ha0 = Math.acos(cosHA0) / DEG;
    sunrise = 12 - ha0 / 15;
    sunset = 12 + ha0 / 15;
  }

  // 方向文字
  const dirs = ['北', '東北', '東', '東南', '南', '西南', '西', '西北', '北'];
  const dirLabel = dirs[Math.round(az / 45)];

  return {
    altitude: alt,
    azimuth: az,
    isAboveHorizon: alt > 0,
    sunrise: sunrise.toFixed(1),
    sunset: sunset.toFixed(1),
    dirLabel,
  };
}

/** 格式化小時為 HH:MM */
export function formatHour(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 月份中文 */
export const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
