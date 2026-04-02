import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TOPICS = [
  {
    icon: '☀️',
    title: '太陽高度角',
    subtitle: '決定陰影長度的關鍵',
    color: '#FFD54F',
    bg: '#1A1600',
    content: [
      {
        heading: '什麼是高度角？',
        body: '太陽高度角是太陽光線與地平面之間的夾角。高度角越大（太陽越高），陰影越短；高度角越小（接近日出日落），陰影越長。',
      },
      {
        heading: '台灣的日照特性',
        body: '台灣位於北緯 22°–25°，夏至正午太陽高度角可達 88°（幾乎垂直），冬至則降至約 42°。這代表夏天建築陰影極短，冬天陰影可延伸至建物高度的 1.1 倍以上。',
      },
      {
        heading: '對建築設計的影響',
        body: '• 南向立面：全年受陽最多，適合大開窗\n• 北向立面：全年幾乎無直射日光，需人工照明\n• 深遮陽板：夏天可阻擋高角度日射，冬天讓低角度陽光進入',
      },
    ],
  },
  {
    icon: '🧭',
    title: '方位角',
    subtitle: '追蹤太陽在天空中的方位',
    color: '#4FC3F7',
    bg: '#001624',
    content: [
      {
        heading: '什麼是方位角？',
        body: '方位角是太陽在水平面上的方向，以北方為 0°，順時針計算。東方 = 90°，南方 = 180°，西方 = 270°。',
      },
      {
        heading: '台灣的太陽軌跡',
        body: '• 冬天：太陽從東南升起，在南方達最高，從西南落下\n• 夏天：太陽從東北升起，幾乎垂直行進，從西北落下\n• 春秋分：太陽正東升起，正西落下',
      },
      {
        heading: '建築朝向策略',
        body: '台灣最佳主立面朝向為南偏東 15°–20°。這樣冬天早晨陽光能照入室內，提供溫暖；夏天日照時間相對短，減少過熱。',
      },
    ],
  },
  {
    icon: '🏙',
    title: '建築間距與日照',
    subtitle: '都市設計中的陰影計算',
    color: '#81C784',
    bg: '#001400',
    content: [
      {
        heading: '日照權與建築法規',
        body: '台灣建築法規規定住宅需保障日照條件。通常以冬至日（一年中陰影最長）為基準，計算相鄰建物的遮蔽影響。',
      },
      {
        heading: '陰影計算公式',
        body: '建物陰影長度 = 建物高度 ÷ tan(太陽高度角)\n\n例：10 層樓（約 30m）在冬至正午（台北高度角 41°）的陰影長度約為 30 ÷ tan(41°) ≈ 34.5m',
      },
      {
        heading: '設計工具的意義',
        body: '本 App 的 3D 場景讓你直觀看見：\n• 建物高度對鄰近陰影的影響\n• 不同季節與時間的差異\n• 台灣各地因緯度不同造成的日照差距',
      },
    ],
  },
  {
    icon: '🌿',
    title: '被動式採光設計',
    subtitle: '利用太陽能量的建築策略',
    color: '#A5D6A7',
    bg: '#001200',
    content: [
      {
        heading: '什麼是被動式設計？',
        body: '被動式設計（Passive Design）是指不依賴機械系統，透過建築形體、開窗位置、遮陽板等手段，自然調節室內光線與熱能。',
      },
      {
        heading: '遮陽板設計原理',
        body: '水平遮陽板：夏至時太陽高度角大，板子可遮擋直射陽光；冬至時太陽低，陽光可從板子下方進入，形成「夏遮冬透」的效果。\n\n深度計算：遮陽板深度 = 開口高度 × tan(夏至高度角) ÷ tan(冬至高度角)',
      },
      {
        heading: '台灣氣候的特殊考量',
        body: '• 夏季防過熱優先（台灣夏季高溫潮濕）\n• 東西向開窗需特別處理（低角度斜射難以遮擋）\n• 騎樓是台灣傳統建築應對亞熱帶日照的智慧解法',
      },
    ],
  },
  {
    icon: '📐',
    title: '緯度對日照的影響',
    subtitle: '台灣南北的差異',
    color: '#FF8A65',
    bg: '#1A0800',
    content: [
      {
        heading: '緯度與高度角的關係',
        body: '正午太陽高度角 = 90° - 緯度 ± 赤緯角\n\n台北（25°N）冬至：90 - 25 - 23.45 = 41.55°\n台南（23°N）冬至：90 - 23 - 23.45 = 43.55°\n\n緯度每差 1°，正午高度角差約 1°，陰影長度差異可達 5–8%。',
      },
      {
        heading: '南北台灣的設計差異',
        body: '• 台北：冬季日照時數較少，日照角度低，需更積極爭取南向採光\n• 台南/高雄：全年日照充足，隔熱防曬更為重要\n• 花蓮：位於東岸，清晨日照豐富，設計可利用東向迎日',
      },
      {
        heading: '如何在本 App 中探索',
        body: '切換底部「城市」選項，觀察同一時間、同一日期下，不同城市的太陽高度角變化。特別在冬至（12月）的差異最為明顯。',
      },
    ],
  },
];

function TopicCard({ topic, onPress }) {
  return (
    <TouchableOpacity style={[styles.topicCard, { backgroundColor: topic.bg, borderColor: topic.color + '40' }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.topicIcon}>{topic.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.topicTitle, { color: topic.color }]}>{topic.title}</Text>
        <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={topic.color + '80'} />
    </TouchableOpacity>
  );
}

function TopicDetail({ topic, onClose }) {
  return (
    <SafeAreaView style={[styles.detailContainer, { backgroundColor: topic.bg }]}>
      <View style={[styles.detailNav, { borderBottomColor: topic.color + '30' }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={topic.color} />
        </TouchableOpacity>
        <Text style={[styles.detailTitle, { color: topic.color }]}>{topic.title}</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.detailIcon}>{topic.icon}</Text>
        <Text style={[styles.detailSubtitle, { color: topic.color + 'CC' }]}>{topic.subtitle}</Text>
        {topic.content.map((section, i) => (
          <View key={i} style={[styles.sectionCard, { borderLeftColor: topic.color }]}>
            <Text style={[styles.sectionHeading, { color: topic.color }]}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function LearnScreen() {
  const [selected, setSelected] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>光影知識庫</Text>
        <Text style={styles.headerSub}>建築日照設計基礎</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {TOPICS.map((t, i) => (
          <TopicCard key={i} topic={t} onPress={() => setSelected(t)} />
        ))}

        <View style={styles.formulaCard}>
          <Text style={styles.formulaTitle}>⚡ 快速公式</Text>
          {[
            { label: '正午高度角', formula: '= 90° − 緯度 ± 赤緯' },
            { label: '陰影長度', formula: '= 建物高度 ÷ tan(高度角)' },
            { label: '夏至赤緯', formula: '= +23.45°' },
            { label: '冬至赤緯', formula: '= −23.45°' },
          ].map(({ label, formula }) => (
            <View key={label} style={styles.formulaRow}>
              <Text style={styles.formulaLabel}>{label}</Text>
              <Text style={styles.formulaValue}>{formula}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selected} animationType="slide">
        {selected && <TopicDetail topic={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#E8F0E8' },
  headerSub: { fontSize: 14, color: '#4A6A4A', marginTop: 2 },

  list: { padding: 16, gap: 10, paddingBottom: 40 },

  topicCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  topicIcon: { fontSize: 28 },
  topicTitle: { fontSize: 16, fontWeight: '700' },
  topicSubtitle: { fontSize: 12, color: '#6A8A6A', marginTop: 2 },

  formulaCard: {
    backgroundColor: '#111811', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1E2E1E', marginTop: 4,
  },
  formulaTitle: { fontSize: 14, fontWeight: '700', color: '#81C784', marginBottom: 12 },
  formulaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  formulaLabel: { fontSize: 13, color: '#6A8A6A' },
  formulaValue: { fontSize: 13, color: '#E8F0E8', fontWeight: '600' },

  // Detail
  detailContainer: { flex: 1 },
  detailNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  closeBtn: { width: 32, alignItems: 'flex-start' },
  detailTitle: { fontSize: 17, fontWeight: '700' },
  detailContent: { padding: 20, paddingBottom: 40 },
  detailIcon: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  detailSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 16, marginBottom: 14, borderLeftWidth: 3,
  },
  sectionHeading: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#A0B8A0', lineHeight: 24 },
});
