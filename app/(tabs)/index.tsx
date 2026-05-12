// Powered by OnSpace.AI
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { SessionCard } from '@/components/feature/SessionCard';
import { useMarketSession } from '@/hooks/useMarketSession';
import { QUICK_PROMPTS, YONAS_NAME } from '@/constants/config';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { sessions, currentTime, advice, quote } = useMarketSession();

  const handleQuickPrompt = (query: string) => {
    router.push({ pathname: '/(tabs)/chat', params: { query } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selam, {YONAS_NAME} 👋</Text>
            <Text style={styles.subGreeting}>Your Digital Twin is ready.</Text>
          </View>
          <View style={styles.clockBadge}>
            <MaterialIcons name="access-time" size={13} color={Colors.primary} />
            <Text style={styles.clockText}>{currentTime}</Text>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/images/hero-onboarding.png')}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTag}>DIGITAL TWIN</Text>
            <Text style={styles.heroTitle}>Think. Trade.{'\n'}Win.</Text>
            <Pressable
              style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Text style={styles.heroBtnText}>Open Chat</Text>
              <MaterialIcons name="arrow-forward" size={16} color={Colors.textInverse} />
            </Pressable>
          </View>
        </View>

        {/* Market Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Sessions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionsRow}>
            {sessions.map((s) => (
              <SessionCard key={s.name} session={s} />
            ))}
          </ScrollView>
        </View>

        {/* AI Advice */}
        <View style={styles.adviceCard}>
          <View style={styles.adviceHeader}>
            <MaterialIcons name="psychology" size={18} color={Colors.primary} />
            <Text style={styles.adviceLabel}>Live Advice</Text>
          </View>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>

        {/* Quick Prompts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Ask</Text>
          <View style={styles.promptGrid}>
            {QUICK_PROMPTS.map((p, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.promptCard, pressed && { opacity: 0.7 }]}
                onPress={() => handleQuickPrompt(p.query)}
              >
                <Text style={styles.promptEmoji}>{p.emoji}</Text>
                <Text style={styles.promptLabel}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <MaterialIcons name="format-quote" size={22} color={Colors.primary} style={{ opacity: 0.7 }} />
          <Text style={styles.quoteEn}>{quote.en}</Text>
          <Text style={styles.quoteAm}>{quote.am}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subGreeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  clockText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  heroCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 220,
    ...Shadow.card,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  heroTag: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 36,
    marginBottom: Spacing.md,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },

  section: { marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionsRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },

  adviceCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    gap: Spacing.sm,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adviceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  adviceText: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  promptCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  promptEmoji: { fontSize: 22 },
  promptLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },

  quoteCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  quoteEn: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAm: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
