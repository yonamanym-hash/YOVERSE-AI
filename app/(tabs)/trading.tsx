// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { useMarketSession } from '@/hooks/useMarketSession';

type Tab = 'crt' | 'tbs' | 'checklist';

const CRT_STEPS = [
  { step: '1', title: 'Identify the Candle Range', body: 'Mark the High and Low of the reference candle (usually from the previous session or a swing candle on 15m/1H).' },
  { step: '2', title: 'Wait for the Sweep', body: 'Price must sweep (close beyond) the High or Low of the CRT range. This is the liquidity grab — institutions trapping retail traders.' },
  { step: '3', title: 'Displacement Candle', body: 'After the sweep, look for a strong impulsive candle (displacement) that moves away from the swept level. This signals institutional entry.' },
  { step: '4', title: 'Mark the FVG / OB', body: 'Inside the displacement move, mark the Fair Value Gap (FVG) or Order Block (OB). This is your entry zone.' },
  { step: '5', title: 'Enter on Retest', body: 'Wait for price to retrace into the FVG/OB. Enter with a SL beyond the wick of the sweep candle.' },
  { step: '6', title: 'Target the Draw', body: 'Your TP is the opposing liquidity pool (opposing session High/Low, HTF level). Minimum 1:2 RR.' },
];

const TBS_STEPS = [
  { step: '1', title: 'Find a Swing High / Low', body: 'Identify a clear swing high or swing low on the 15m or 1H chart. It must be a notable level with obvious wicks.' },
  { step: '2', title: 'Count the Tests', body: 'Price should test this level 2-3 times. Each test builds retail confidence that it will hold.' },
  { step: '3', title: 'The False Break', body: 'On the 3rd test (or after 2 rejections), price breaks through the level — taking out retail SLs and grabbing buy/sell-stop liquidity.' },
  { step: '4', title: 'Reversal Candle', body: 'Watch for an immediate rejection after the false break — a strong reversal candle closing back inside the range.' },
  { step: '5', title: 'Entry & SL', body: 'Enter on the close of the reversal candle (5m confirmation). SL goes just beyond the false break wick.' },
  { step: '6', title: 'Target', body: 'Target the opposite liquidity pool (opposing highs/lows). 1:3 minimum — the false break gives you a tight SL and wide TP.' },
];

const CHECKLIST = [
  { id: '1', text: 'Check HTF (4H/1H) for premium/discount zones and draw on liquidity' },
  { id: '2', text: 'Identify previous session High & Low — mark them on chart' },
  { id: '3', text: 'Is London or NY session active? (No session = No trade)' },
  { id: '4', text: 'Wait for liquidity sweep on CRT range or TBS false break' },
  { id: '5', text: 'Displacement candle confirms institutional entry direction' },
  { id: '6', text: 'FVG or OB marked inside displacement move' },
  { id: '7', text: 'SL placed beyond the sweep wick (not the candle body)' },
  { id: '8', text: 'TP at opposing liquidity — minimum 1:2 RR confirmed' },
  { id: '9', text: 'Risk ≤ 1% of account per trade' },
  { id: '10', text: 'Journaled the trade plan BEFORE entering' },
];

export default function TradingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('crt');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const { sessions, currentTime } = useMarketSession();

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetChecklist = () => setCheckedItems(new Set());

  const steps = activeTab === 'crt' ? CRT_STEPS : TBS_STEPS;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trading Desk</Text>
          <View style={styles.clockBadge}>
            <Text style={styles.clockText}>{currentTime}</Text>
          </View>
        </View>

        {/* Session Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionsScroll} contentContainerStyle={styles.sessionsPills}>
          {sessions.map((s) => (
            <View key={s.name} style={[styles.sessionPill, s.isActive && { borderColor: Colors.success, backgroundColor: Colors.successDim }]}>
              <Text style={styles.pillEmoji}>{s.emoji}</Text>
              <Text style={styles.pillName}>{s.label}</Text>
              <Text style={[styles.pillStatus, { color: s.isActive ? Colors.success : s.statusColor }]}>
                {s.isActive ? 'LIVE' : s.timeUntil}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* XAUUSD Hero */}
        <View style={styles.xauCard}>
          <Image
            source={require('@/assets/images/trading-bg.png')}
            style={styles.xauBg}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.xauOverlay}>
            <Text style={styles.xauPair}>XAU / USD</Text>
            <Text style={styles.xauLabel}>Primary Focus — Gold</Text>
            <View style={styles.xauTags}>
              <View style={styles.tag}><Text style={styles.tagText}>5m Battlefield</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>CRT + TBS</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>Liquidity-Based</Text></View>
            </View>
          </View>
        </View>

        {/* Strategy Tabs */}
        <View style={styles.tabBar}>
          {(['crt', 'tbs', 'checklist'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.tabItem, activeTab === t && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>
                {t === 'crt' ? 'CRT' : t === 'tbs' ? 'TBS' : 'Checklist'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        {activeTab !== 'checklist' ? (
          <View style={styles.stepsContainer}>
            <Text style={styles.strategyTitle}>
              {activeTab === 'crt' ? 'Candle Range Theory (CRT)' : 'Turtle Body Soup (TBS)'}
            </Text>
            <Text style={styles.strategySubtitle}>
              {activeTab === 'crt'
                ? 'Trade institutional liquidity sweeps with precision entries.'
                : 'Fade the false breakout — where retail gets trapped.'}
            </Text>
            {steps.map((s) => (
              <View key={s.step} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumText}>{s.step}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepText}>{s.body}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.checklistContainer}>
            <View style={styles.checklistHeader}>
              <Text style={styles.strategyTitle}>Trade Checklist</Text>
              <Pressable onPress={resetChecklist} style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>
            <Text style={styles.checkProgress}>{checkedItems.size}/{CHECKLIST.length} Complete</Text>
            {CHECKLIST.map((item) => {
              const checked = checkedItems.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleCheck(item.id)}
                  style={({ pressed }) => [styles.checkItem, checked && styles.checkItemDone, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.checkBox, checked && styles.checkBoxDone]}>
                    {checked && <MaterialIcons name="check" size={14} color={Colors.textInverse} />}
                  </View>
                  <Text style={[styles.checkText, checked && styles.checkTextDone]}>{item.text}</Text>
                </Pressable>
              );
            })}
            {checkedItems.size === CHECKLIST.length && (
              <View style={styles.readyBanner}>
                <MaterialIcons name="verified" size={20} color={Colors.success} />
                <Text style={styles.readyText}>Setup Confirmed — You may enter the trade.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  clockBadge: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  clockText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },

  sessionsScroll: { marginTop: Spacing.sm },
  sessionsPills: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillEmoji: { fontSize: 14 },
  pillName: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  pillStatus: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  xauCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 140,
    ...Shadow.card,
  },
  xauBg: { ...StyleSheet.absoluteFillObject },
  xauOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.md,
    justifyContent: 'center',
  },
  xauPair: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
  xauLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  xauTags: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm },
  tag: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tagText: { fontSize: 10, fontWeight: FontWeight.semibold, color: Colors.primary },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabItemActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  tabLabelActive: { color: Colors.textInverse },

  stepsContainer: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  strategyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  strategySubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md, lineHeight: 20 },

  stepCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  stepBody: { flex: 1, gap: 4 },
  stepTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  stepText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  checklistContainer: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  checkProgress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },

  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  checkItemDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.successDim,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkBoxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  checkTextDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },

  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successDim,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  readyText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.success, flex: 1 },
});
