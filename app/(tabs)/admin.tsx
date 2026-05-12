// Powered by OnSpace.AI
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/template';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { fetchUserJoins, fetchUserMessageCounts, UserJoin } from '@/services/chatService';
import { YONAS_EMAIL } from '@/constants/config';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitials(email: string, username?: string | null): string {
  if (username) return username.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function getAvatarColor(email: string): string {
  const colors = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#009688', '#FF5722', '#795548'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const [joins, setJoins] = useState<UserJoin[]>([]);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isYonas = user?.email === YONAS_EMAIL;

  const loadData = useCallback(async () => {
    try {
      const [j, c] = await Promise.all([fetchUserJoins(), fetchUserMessageCounts()]);
      setJoins(j);
      setMsgCounts(c);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const newToday = joins.filter((j) => {
    const diff = Date.now() - new Date(j.joined_at).getTime();
    return diff < 86400000;
  }).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{isYonas ? 'Admin Panel' : 'My Account'}</Text>
            <Text style={styles.subtitle}>{user?.email}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
            onPress={() => logout()}
          >
            <MaterialIcons name="logout" size={16} color={Colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: getAvatarColor(user?.email ?? '') }]}>
            <Text style={styles.profileAvatarText}>{getInitials(user?.email ?? '', user?.username)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.username ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {isYonas && (
              <View style={styles.adminBadge}>
                <MaterialIcons name="admin-panel-settings" size={12} color={Colors.primary} />
                <Text style={styles.adminBadgeText}>YONAS — ADMIN</Text>
              </View>
            )}
          </View>
        </View>

        {/* Admin Stats (Yonas only) */}
        {isYonas && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <MaterialIcons name="people" size={22} color={Colors.primary} />
                <Text style={styles.statNum}>{joins.length}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="person-add" size={22} color={Colors.success} />
                <Text style={[styles.statNum, { color: Colors.success }]}>{newToday}</Text>
                <Text style={styles.statLabel}>Joined Today</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="chat" size={22} color={Colors.info} />
                <Text style={[styles.statNum, { color: Colors.info }]}>
                  {Object.values(msgCounts).reduce((a, b) => a + b, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Messages</Text>
              </View>
            </View>

            {/* New Users Alert */}
            {newToday > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertIcon}>
                  <MaterialIcons name="notifications-active" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {newToday} new user{newToday > 1 ? 's' : ''} joined today!
                  </Text>
                  <Text style={styles.alertSub}>
                    Digital Twin is being used — check who joined below.
                  </Text>
                </View>
              </View>
            )}

            {/* User List */}
            <Text style={styles.sectionTitle}>All Users</Text>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : joins.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="group-off" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No users yet. Share the app!</Text>
              </View>
            ) : (
              joins.map((j, i) => {
                const isNew = Date.now() - new Date(j.joined_at).getTime() < 86400000;
                const msgCount = msgCounts[j.user_id] ?? 0;
                return (
                  <View key={j.id} style={[styles.userCard, isNew && styles.userCardNew]}>
                    <View style={[styles.userAvatar, { backgroundColor: getAvatarColor(j.email) }]}>
                      <Text style={styles.userAvatarText}>{getInitials(j.email, j.username)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.userCardTop}>
                        <Text style={styles.userName}>{j.username ?? j.email.split('@')[0]}</Text>
                        {isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userEmail}>{j.email}</Text>
                      <View style={styles.userMeta}>
                        <MaterialIcons name="schedule" size={12} color={Colors.textMuted} />
                        <Text style={styles.userMetaText}>Joined {timeAgo(j.joined_at)}</Text>
                        <View style={styles.userMetaDot} />
                        <MaterialIcons name="chat-bubble" size={12} color={Colors.textMuted} />
                        <Text style={styles.userMetaText}>{msgCount} message{msgCount !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <Text style={styles.userIndex}>#{i + 1}</Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* Non-admin: account info */}
        {!isYonas && (
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.infoText}>
              You are chatting with Yonas's Digital Twin AI. Your conversations are private and
              stored securely.
            </Text>
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
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.dangerDim,
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  logoutText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.danger },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    ...Shadow.card,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  profileName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  adminBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 5,
  },
  statNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  alertSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },

  loadingWrap: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyWrap: { paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  userCardNew: { borderColor: 'rgba(255,215,0,0.3)', backgroundColor: 'rgba(255,215,0,0.04)' },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  userCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  newBadge: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.primary },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  userMetaText: { fontSize: 10, color: Colors.textMuted },
  userMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted },
  userIndex: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    margin: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
