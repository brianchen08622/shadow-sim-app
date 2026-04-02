import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { generateSceneHTML } from '../utils/scene';
import {
  calcSunPosition, CITIES, SEASON_PRESETS,
  formatHour, MONTH_LABELS,
} from '../utils/sunCalc';

const SCENE_HTML = generateSceneHTML();
const CITY_KEYS = Object.keys(CITIES);

const PRESETS = [
  { key: 'taipei101', label: '台北101', icon: '🏙', mainH: 38 },
  { key: 'ntust',     label: '台科大',  icon: '🎓', mainH: 24 },
  { key: 'indoor',    label: '室內採光', icon: '🏠', mainH: 3  },
];

const ORIENTATIONS = [
  { key: 'south', label: '南向' },
  { key: 'east',  label: '東向' },
  { key: 'west',  label: '西向' },
  { key: 'north', label: '北向' },
];

// ── Custom Slider ──────────────────────────────────────────────────────────────
function CustomSlider({ value, min, max, onValueChange, color }) {
  const trackWidth = useRef(0);
  const trackPageX = useRef(0);
  const viewRef    = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;

  const calc = (pageX) => {
    const x = Math.max(0, Math.min(pageX - trackPageX.current, trackWidth.current));
    onValueChange(min + (x / trackWidth.current) * (max - min));
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => calc(e.nativeEvent.pageX),
    onPanResponderMove:  (e) => calc(e.nativeEvent.pageX),
  })).current;

  return (
    <View
      ref={viewRef}
      style={styles.sliderTrack}
      onLayout={() => {
        viewRef.current?.measure((_fx, _fy, width, _h, px) => {
          trackWidth.current = width;
          trackPageX.current = px;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrackLine} />
      <View style={[styles.sliderFill, { width: `${pct}%`, backgroundColor: color }]} />
      <View style={[styles.sliderThumb, { left: `${pct}%`, backgroundColor: color,
        transform: [{ translateX: -10 }] }]} />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SimulatorScreen() {
  const insets = useSafeAreaInsets();
  const [hour,        setHour]        = useState(10);
  const [month,       setMonth]       = useState(6);
  const [cityKey,     setCityKey]     = useState('taipei');
  const [preset,      setPreset]      = useState('taipei101');
  const [orientation, setOrientation] = useState('south');
  const webViewRef = useRef(null);
  const isWebViewReady = useRef(false);

  const city    = CITIES[cityKey];
  const sun     = calcSunPosition(hour, month, 15, city.lat);
  const mainH   = PRESETS.find(p => p.key === preset)?.mainH ?? 38;

  // 陰影長度 / 光線進深計算
  const shadowLen = sun.isAboveHorizon && sun.altitude > 0.5
    ? (mainH / Math.tan(sun.altitude * Math.PI / 180)).toFixed(1)
    : null;
  // 室內：遮陽板高度(2.7m) / tan(altitude) = 光線進深
  const lightPenetration = preset === 'indoor' && sun.isAboveHorizon && sun.altitude > 0.5
    ? (2.7 / Math.tan(sun.altitude * Math.PI / 180)).toFixed(1)
    : null;

  // 傳送太陽狀態給 WebView
  const pushSun = useCallback(() => {
    if (!isWebViewReady.current) return;
    const msg = JSON.stringify({
      azimuth: sun.azimuth,
      altitude: sun.altitude,
      month,
      lat: city.lat,
      hour,
      preset,
      orientation: preset === 'indoor' ? orientation : undefined,
    }).replace(/'/g, "\\'");
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:'${msg}'}));true;`
    );
  }, [sun.azimuth, sun.altitude, month, city.lat, hour, preset, orientation]);

  useEffect(() => { pushSun(); }, [pushSun]);

  // HUD 顏色
  const hudColor = sun.isAboveHorizon
    ? (sun.altitude > 30 ? '#FFD54F' : '#FF9050')
    : '#607D8B';

  return (
    <View style={styles.root}>

      {/* ── 3D 場景 ─────────────────────────────────────────── */}
      <View style={styles.sceneWrap}>
        <WebView
          ref={webViewRef}
          source={{ html: SCENE_HTML }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          originWhitelist={['*']}
          onLoad={() => { isWebViewReady.current = true; pushSun(); }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />

        {/* ── HUD ─────────────────────────────────────────────── */}
        <View style={[styles.hud, { top: insets.top + 8 }]} pointerEvents="none">
          {[
            { val: sun.isAboveHorizon ? `${sun.altitude.toFixed(1)}°` : '日落', lbl: '高度角' },
            { val: sun.dirLabel,                                                  lbl: `${sun.azimuth.toFixed(0)}°` },
            { val: formatHour(parseFloat(sun.sunrise)),                           lbl: '日出' },
            { val: formatHour(parseFloat(sun.sunset)),                            lbl: '日落' },
          ].map(({ val, lbl }) => (
            <View key={lbl} style={[styles.hudCard, { borderColor: hudColor + '50' }]}>
              <Text style={[styles.hudVal, { color: hudColor }]}>{val}</Text>
              <Text style={styles.hudLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── 羅盤 ─────────────────────────────────────────────── */}
        <View style={styles.compass} pointerEvents="none">
          <View style={styles.compassInner}>
            <Text style={styles.compassN}>N</Text>
            <View style={styles.compassCross}>
              <Text style={styles.compassE}>E</Text>
              <View style={styles.compassDot} />
              <Text style={styles.compassW}>W</Text>
            </View>
            <Text style={styles.compassS}>S</Text>
          </View>
        </View>
      </View>

      {/* ── 控制面板 ─────────────────────────────────────────── */}
      <View style={styles.panel}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelContent}>

          {/* 場景切換 */}
          <View style={styles.presetRow}>
            {PRESETS.map(p => (
              <TouchableOpacity key={p.key}
                style={[styles.presetBtn, preset === p.key && styles.presetBtnOn]}
                onPress={() => setPreset(p.key)}>
                <Text style={styles.presetIcon}>{p.icon}</Text>
                <Text style={[styles.presetLabel, preset === p.key && styles.presetLabelOn]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 室內方位（只在 indoor 顯示）*/}
          {preset === 'indoor' && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Ionicons name="compass-outline" size={14} color="#FFA726" />
                <Text style={styles.sectionLabel}>窗戶朝向</Text>
              </View>
              <View style={styles.orientRow}>
                {ORIENTATIONS.map(o => (
                  <TouchableOpacity key={o.key}
                    style={[styles.orientBtn, orientation === o.key && styles.orientBtnOn]}
                    onPress={() => setOrientation(o.key)}>
                    <Text style={[styles.orientTxt, orientation === o.key && styles.orientTxtOn]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 時間 */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="sunny-outline" size={14} color="#FFD54F" />
              <Text style={styles.sectionLabel}>時間</Text>
              <Text style={styles.sectionVal}>{formatHour(hour)}</Text>
            </View>
            <CustomSlider value={hour} min={5} max={19} color="#FFD54F"
              onValueChange={v => setHour(Math.round(v * 2) / 2)} />
            <View style={styles.markers}>
              {['06','09','12','15','18'].map(t => (
                <Text key={t} style={styles.markerText}>{t}:00</Text>
              ))}
            </View>
          </View>

          {/* 月份 */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="calendar-outline" size={14} color="#81C784" />
              <Text style={styles.sectionLabel}>月份</Text>
              <Text style={styles.sectionVal}>{MONTH_LABELS[month - 1]}</Text>
            </View>
            <CustomSlider value={month} min={1} max={12} color="#81C784"
              onValueChange={v => setMonth(Math.max(1, Math.min(12, Math.round(v))))} />
            <View style={styles.seasonRow}>
              {SEASON_PRESETS.map(s => (
                <TouchableOpacity key={s.label}
                  style={[styles.seasonBtn, month === s.month && styles.seasonBtnOn]}
                  onPress={() => setMonth(s.month)}>
                  <Text style={[styles.seasonTxt, month === s.month && styles.seasonTxtOn]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 城市 */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="location-outline" size={14} color="#4FC3F7" />
              <Text style={styles.sectionLabel}>城市</Text>
              <Text style={[styles.cityLat, { color: '#4FC3F7' }]}>
                {CITIES[cityKey].lat > 0
                  ? `${CITIES[cityKey].lat}°N`
                  : `${Math.abs(CITIES[cityKey].lat)}°S`}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityRow}>
              {CITY_KEYS.map(k => (
                <TouchableOpacity key={k}
                  style={[styles.cityBtn, cityKey === k && styles.cityBtnOn,
                    CITIES[k].group === 'INT' && styles.cityBtnInt,
                    cityKey === k && CITIES[k].group === 'INT' && styles.cityBtnIntOn]}
                  onPress={() => setCityKey(k)}>
                  <Text style={[styles.cityName, cityKey === k && styles.cityNameOn]}>
                    {CITIES[k].name}
                  </Text>
                  <Text style={[styles.cityLat, cityKey === k && { color: '#4FC3F7' }]}>
                    {CITIES[k].lat > 0
                      ? `${CITIES[k].lat}°N`
                      : `${Math.abs(CITIES[k].lat)}°S`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 陰影/採光分析 */}
          <View style={styles.analysisCard}>
            {preset === 'indoor' ? (
              <>
                <Text style={styles.analysisTitle}>
                  <Ionicons name="sunny-outline" size={13} color="#FFA726" />  室內採光分析（窗頂高 2.7m）
                </Text>
                {lightPenetration ? (
                  <View style={styles.analysisRow}>
                    <View style={styles.analysisStat}>
                      <Text style={[styles.analysisVal, { color: '#FFA726' }]}>{lightPenetration} m</Text>
                      <Text style={styles.analysisLbl}>光線進深</Text>
                    </View>
                    <View style={styles.analysisDivider} />
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisVal}>{sun.altitude.toFixed(1)}°</Text>
                      <Text style={styles.analysisLbl}>太陽高度</Text>
                    </View>
                    <View style={styles.analysisDivider} />
                    <View style={styles.analysisStat}>
                      <Text style={[styles.analysisVal, { fontSize: 13 }]}>
                        {parseFloat(lightPenetration) > 6 ? '深入' : parseFloat(lightPenetration) > 2 ? '適中' : '遮陽'}
                      </Text>
                      <Text style={styles.analysisLbl}>採光效果</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.analysisNight}>
                    {sun.isAboveHorizon ? '太陽角度過低' : `日出 ${formatHour(parseFloat(sun.sunrise))} · 日落 ${formatHour(parseFloat(sun.sunset))}`}
                  </Text>
                )}
                {lightPenetration && (
                  <Text style={styles.analysisFormula}>
                    陽光從窗頂(2.7m)射入：2.7 ÷ tan({sun.altitude.toFixed(1)}°) = {lightPenetration}m
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.analysisTitle}>
                  <Ionicons name="analytics-outline" size={13} color="#A5D6A7" />  陰影分析（主建物 {mainH}m）
                </Text>
                {shadowLen ? (
                  <View style={styles.analysisRow}>
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisVal}>{shadowLen} m</Text>
                      <Text style={styles.analysisLbl}>陰影長度</Text>
                    </View>
                    <View style={styles.analysisDivider} />
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisVal}>
                        {(parseFloat(shadowLen) / mainH).toFixed(2)} ×
                      </Text>
                      <Text style={styles.analysisLbl}>建物高倍率</Text>
                    </View>
                    <View style={styles.analysisDivider} />
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisVal}>{sun.altitude.toFixed(1)}°</Text>
                      <Text style={styles.analysisLbl}>太陽高度</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.analysisNight}>
                    {sun.isAboveHorizon ? '太陽角度過低' : `日出 ${formatHour(parseFloat(sun.sunrise))} · 日落 ${formatHour(parseFloat(sun.sunset))}`}
                  </Text>
                )}
                {shadowLen && (
                  <Text style={styles.analysisFormula}>
                    公式：{mainH}m ÷ tan({sun.altitude.toFixed(1)}°) = {shadowLen}m
                  </Text>
                )}
              </>
            )}
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D1117' },

  sceneWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: '#0D1117' },

  hud: {
    position: 'absolute', top: 10, left: 10, right: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 7,
  },
  hudCard: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 9, paddingVertical: 5, alignItems: 'center', minWidth: 56,
  },
  hudVal: { fontSize: 14, fontWeight: '700' },
  hudLbl: { fontSize: 10, color: '#4A6A4A', marginTop: 1 },

  panel: {
    backgroundColor: '#0F180F', borderTopWidth: 1, borderTopColor: '#1A2A1A',
    maxHeight: 280,
  },
  panelContent: { padding: 14, gap: 12, paddingBottom: 24 },

  section: { gap: 7 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 13, color: '#8AAA8A', flex: 1 },
  sectionVal: { fontSize: 13, fontWeight: '700', color: '#E0EEE0' },

  sliderTrack: {
    height: 28, borderRadius: 14, backgroundColor: 'transparent',
    position: 'relative', justifyContent: 'center', marginHorizontal: 2,
    paddingVertical: 12,
  },
  sliderFill: {
    position: 'absolute', left: 0, top: 12, height: 4, borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute', width: 20, height: 20, borderRadius: 10,
    top: 4, marginLeft: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 3, elevation: 4,
  },
  sliderTrackLine: {
    position: 'absolute', left: 0, right: 0, top: 12, height: 4,
    borderRadius: 2, backgroundColor: '#1E2E1E',
  },

  markers: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 },
  markerText: { fontSize: 9, color: '#2E4A2E' },

  seasonRow: { flexDirection: 'row', gap: 7 },
  seasonBtn: {
    flex: 1, paddingVertical: 5, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#141E14', borderWidth: 1, borderColor: '#1E2E1E',
  },
  seasonBtnOn: { borderColor: '#4CAF50', backgroundColor: '#162416' },
  seasonTxt:   { fontSize: 12, color: '#5A7A5A' },
  seasonTxtOn: { color: '#81C784', fontWeight: '700' },

  cityRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  cityBtn: {
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#141E14', borderWidth: 1, borderColor: '#1E2E1E', minWidth: 58,
  },
  cityBtnOn:    { borderColor: '#4FC3F7', backgroundColor: '#141E24' },
  cityBtnInt:   { backgroundColor: '#141420', borderColor: '#202030' },
  cityBtnIntOn: { borderColor: '#CE93D8', backgroundColor: '#1A1428' },
  cityName:   { fontSize: 12, color: '#8AAA8A', fontWeight: '600' },
  cityNameOn: { color: '#4FC3F7' },
  cityLat:    { fontSize: 9, color: '#2E4A2E', marginTop: 1 },

  analysisCard: {
    backgroundColor: '#101810', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#1E2E1E',
  },
  analysisTitle: { fontSize: 12, color: '#81C784', marginBottom: 10 },
  analysisRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  analysisStat:  { flex: 1, alignItems: 'center' },
  analysisVal:   { fontSize: 16, fontWeight: '800', color: '#E0EEE0' },
  analysisLbl:   { fontSize: 10, color: '#4A6A4A', marginTop: 2 },
  analysisDivider: { width: 1, height: 30, backgroundColor: '#1E2E1E' },
  analysisFormula: { fontSize: 10, color: '#3A5A3A', textAlign: 'center' },
  analysisNight:   { fontSize: 13, color: '#3A5A3A', textAlign: 'center', paddingVertical: 4 },

  // 場景切換
  presetRow: { flexDirection: 'row', gap: 10 },
  presetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#141E14', borderWidth: 1, borderColor: '#1E2E1E',
  },
  presetBtnOn: { backgroundColor: '#1A2E28', borderColor: '#4CAF50' },
  presetIcon:  { fontSize: 16 },
  presetLabel: { fontSize: 13, color: '#5A7A5A', fontWeight: '600' },
  presetLabelOn: { color: '#81C784' },

  // 方位選擇
  orientRow: { flexDirection: 'row', gap: 7 },
  orientBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#141A14', borderWidth: 1, borderColor: '#2A2010',
  },
  orientBtnOn: { backgroundColor: '#2A1E08', borderColor: '#FFA726' },
  orientTxt:   { fontSize: 13, color: '#7A6040', fontWeight: '600' },
  orientTxtOn: { color: '#FFA726' },

  // 羅盤
  compass: {
    position: 'absolute', bottom: 14, right: 14,
  },
  compassInner: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 36,
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  compassN: { fontSize: 12, fontWeight: '800', color: '#FF6B6B', lineHeight: 14 },
  compassS: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', lineHeight: 14 },
  compassCross: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compassE: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  compassW: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  compassDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
});
