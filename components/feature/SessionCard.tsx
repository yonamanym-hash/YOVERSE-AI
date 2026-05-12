// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';
import { SessionInfo } from '@/services/marketService';

interface Props {
  session: SessionInfo;
}

export const SessionCard = React.memo(function SessionCard({ session }: Props) {
  return (
    <View style={[styles.card, session.isActive && styles.cardActive]}>
      <View style={[styles.dot, { backgroundColor: session.statusColor }]} />
      <Text style={styles.emoji}>{session.emoji}</Text>
      <Text style={styles.label}>{session.label}</Text>
      <View style={[styles.badge, { backgroundColor: session.isActive ? Colors.successDim : Colors.primaryGlow }]}>
        <Text style={[styles.badgeText, { color: session.isActive ? Colors.success : session.statusColor }]}>
          {session.isActive ? '● LIVE' : session.timeUntil}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: 6,
  },
  cardActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.successDim,
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});
