// Powered by OnSpace.AI
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { getSupabaseClient, useAuth } from '@/template';
import {
  loadProjects, saveProject, renameProject, deleteProject,
  BuilderProject, BuilderProjectMessage,
} from '@/services/builderService';

// ─── Types ───────────────────────────────────────────────────────────────────

type BuilderMode = 'plan' | 'code' | 'debug' | 'review';

interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  timestamp: Date;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BUILDER_MODES: { key: BuilderMode; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'plan',   label: 'App Plan',   icon: 'architecture',   color: '#FFD700', desc: 'Get a full build plan, features & tech stack' },
  { key: 'code',   label: 'Write Code', icon: 'code',           color: '#22C55E', desc: 'Generate screens, components & logic' },
  { key: 'debug',  label: 'Debug',      icon: 'bug-report',     color: '#EF4444', desc: 'Fix errors, crashes & unexpected behavior' },
  { key: 'review', label: 'Review',     icon: 'rate-review',    color: '#3B82F6', desc: 'Improve your existing code quality' },
];

const QUICK_TEMPLATES = [
  { emoji: '📱', label: 'Social App',    prompt: 'Build me a social media app like Instagram with posts, likes, and a feed. Use React Native + Supabase. Give me the full plan.' },
  { emoji: '💰', label: 'Finance App',   prompt: 'Build a personal finance tracker app with income/expense tracking, charts, and monthly summaries. React Native + Supabase.' },
  { emoji: '🏋️', label: 'Fitness App',  prompt: 'Build a workout tracking app where users can log exercises, track progress, and see weekly stats. React Native + Expo.' },
  { emoji: '🛒', label: 'E-Commerce',   prompt: 'Build an e-commerce app with product listings, cart, and checkout. React Native + Stripe + Supabase.' },
  { emoji: '💬', label: 'Chat App',      prompt: 'Build a real-time chat app with direct messages and group chats. React Native + Supabase real-time.' },
  { emoji: '📚', label: 'Learning App', prompt: 'Build a learning/education app with courses, lessons, quizzes, and progress tracking. React Native + Supabase.' },
  { emoji: '🎵', label: 'Music Player', prompt: 'Build a music player app with playlists, playback controls, and album art. React Native + expo-av.' },
  { emoji: '📍', label: 'Location App', prompt: 'Build a location-based app where users can share and discover nearby places. React Native + react-native-maps.' },
];

const MODE_PROMPTS: Record<BuilderMode, string> = {
  plan:   'Describe your app idea...',
  code:   'What screen or feature should I code?',
  debug:  'Paste your error or describe the bug...',
  review: 'Paste your code for review...',
};

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function streamBuilderResponse(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${backendUrl}/functions/v1/digital-twin-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey ?? '',
      'Authorization': `Bearer ${token ?? anonKey ?? ''}`,
    },
    body: JSON.stringify({ messages, language: 'en', model: 'openai/gpt-5.1', builderMode: true }),
    signal,
  });

  if (!response.ok) throw new Error(await response.text());

  let fullText = '';
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(t.slice(6));
          const chunk = json.choices?.[0]?.delta?.content ?? '';
          if (chunk) { fullText += chunk; onChunk(chunk); }
        } catch {}
      }
    }
  } else {
    const text = await response.text();
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(t.slice(6));
        const chunk = json.choices?.[0]?.delta?.content ?? '';
        if (chunk) { fullText += chunk; onChunk(chunk); }
      } catch {}
    }
  }
  return fullText;
}

// ─── Blinking cursor ─────────────────────────────────────────────────────────

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.Text style={[styles.cursor, { opacity }]}>▋</Animated.Text>;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function BuilderBubble({ msg }: { msg: BuilderMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <MaterialIcons name="code" size={14} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {msg.text}
          {msg.isStreaming ? <BlinkingCursor /> : null}
        </Text>
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function extractDescription(messages: BuilderProjectMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '';
  return first.text.length > 80 ? first.text.slice(0, 80) + '...' : first.text;
}

// ─── Project List Item ────────────────────────────────────────────────────────

function ProjectItem({
  project,
  onOpen,
  onRename,
  onDelete,
}: {
  project: BuilderProject;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const modeInfo = BUILDER_MODES.find((m) => m.key === project.mode) ?? BUILDER_MODES[0];
  const msgCount = project.messages.length;
  const desc = extractDescription(project.messages);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.projectItem, pressed && { opacity: 0.85 }]}
    >
      {/* Mode badge */}
      <View style={[styles.projectModeIcon, { backgroundColor: `${modeInfo.color}18` }]}>
        <MaterialIcons name={modeInfo.icon} size={18} color={modeInfo.color} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
        {desc ? (
          <Text style={styles.projectDesc} numberOfLines={2}>{desc}</Text>
        ) : null}
        <View style={styles.projectMeta}>
          <View style={[styles.projectModePill, { borderColor: `${modeInfo.color}40` }]}>
            <Text style={[styles.projectModeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
          </View>
          <Text style={styles.projectMetaText}>{msgCount} msgs</Text>
          <Text style={styles.projectMetaText}>·</Text>
          <Text style={styles.projectMetaText}>{timeAgo(project.updated_at)}</Text>
        </View>
      </View>

      <View style={styles.projectActions}>
        <Pressable onPress={onRename} hitSlop={8} style={({ pressed }) => [styles.projectActionBtn, pressed && { opacity: 0.6 }]}>
          <MaterialIcons name="edit" size={16} color={Colors.textMuted} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={({ pressed }) => [styles.projectActionBtn, pressed && { opacity: 0.6 }]}>
          <MaterialIcons name="delete-outline" size={16} color={Colors.danger} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BuilderScreen() {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<BuilderMode>('plan');
  const [messages, setMessages] = useState<BuilderMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  // Projects state
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BuilderProject | null>(null);
  const [renameText, setRenameText] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const BUILDER_SYSTEM = `You are an elite mobile app developer assistant inside Yonas's Digital Twin app.

Your role: Help users build real mobile apps using React Native (Expo), TypeScript, Supabase, and OnSpace AI.

## Your Core Capabilities:
- **App Planning**: Turn ideas into detailed feature lists, user flows, database schemas, and tech stack recommendations
- **Code Generation**: Write complete, production-ready React Native screens, components, hooks, services, and edge functions
- **Debugging**: Diagnose errors from stack traces, explain root causes, and provide exact fixes
- **Code Review**: Analyze code quality, identify bugs, performance issues, and security concerns

## Current Mode: ${activeMode.toUpperCase()}
${activeMode === 'plan' ? '→ Focus on architecture, feature breakdown, database schema, and step-by-step build order.' : ''}
${activeMode === 'code' ? '→ Write complete, copy-paste-ready code. Always include imports. Never write partial snippets.' : ''}
${activeMode === 'debug' ? '→ Identify the root cause precisely. Give the exact fix. Explain WHY it happened.' : ''}
${activeMode === 'review' ? '→ Rate code quality, find bugs/performance issues, suggest specific improvements with code examples.' : ''}

## Tech Stack:
- React Native + Expo + TypeScript + Expo Router
- Supabase (auth, database, storage, edge functions)
- OnSpace AI (text, image, voice generation)
- expo-image, expo-av, expo-video, @expo/vector-icons
- react-native-paper, react-native-reanimated, react-native-maps

## Response Format:
- Use **bold headers** to organize sections
- Code blocks with language identifier (typescript, sql, bash)
- Numbered steps for sequences
- Be direct — no filler text
- Always provide COMPLETE, RUNNABLE code`;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Load projects ────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setProjectsLoading(true);
    try {
      const data = await loadProjects(user.id);
      setProjects(data);
    } catch {
      // silent
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  // ── Save / Update project ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?.id || messages.length === 0) return;
    const title = saveTitle.trim() || 'Untitled Project';
    setIsSaving(true);
    try {
      const projectMsgs: BuilderProjectMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        timestamp: m.timestamp.toISOString(),
      }));
      const saved = await saveProject(user.id, title, activeMode, projectMsgs, undefined, currentProjectId ?? undefined);
      setCurrentProjectId(saved.id);
      setCurrentProjectTitle(saved.title);
      setShowSaveModal(false);
      setSaveTitle('');
      // Refresh list if open
      if (showProjects) fetchProjects();
    } catch {
      Alert.alert('Save failed', 'Could not save project. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, messages, saveTitle, activeMode, currentProjectId, showProjects]);

  // Quick auto-save (update existing project without modal)
  const handleAutoSave = useCallback(async () => {
    if (!user?.id || !currentProjectId || messages.length === 0) return;
    try {
      const projectMsgs: BuilderProjectMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        timestamp: m.timestamp.toISOString(),
      }));
      await saveProject(user.id, currentProjectTitle, activeMode, projectMsgs, undefined, currentProjectId);
    } catch {}
  }, [user?.id, currentProjectId, currentProjectTitle, activeMode, messages]);

  // ── Open project ──────────────────────────────────────────────────────────
  const handleOpenProject = useCallback((project: BuilderProject) => {
    abortRef.current?.abort();
    const msgs: BuilderMessage[] = project.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      timestamp: new Date(m.timestamp),
      isStreaming: false,
    }));
    historyRef.current = project.messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages(msgs);
    setActiveMode((project.mode as BuilderMode) ?? 'plan');
    setCurrentProjectId(project.id);
    setCurrentProjectTitle(project.title);
    setShowTemplates(false);
    setIsLoading(false);
    setShowProjects(false);
    scrollToBottom();
  }, [scrollToBottom]);

  // ── Delete project ────────────────────────────────────────────────────────
  const handleDeleteProject = useCallback((project: BuilderProject) => {
    Alert.alert(
      'Delete Project',
      `Delete "${project.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await deleteProject(project.id, user.id);
              setProjects((p) => p.filter((x) => x.id !== project.id));
              if (currentProjectId === project.id) {
                setCurrentProjectId(null);
                setCurrentProjectTitle('');
              }
            } catch {
              Alert.alert('Error', 'Could not delete project.');
            }
          },
        },
      ]
    );
  }, [user?.id, currentProjectId]);

  // ── Rename project ────────────────────────────────────────────────────────
  const handleRenameConfirm = useCallback(async () => {
    if (!user?.id || !renameTarget) return;
    const newTitle = renameText.trim();
    if (!newTitle) return;
    try {
      await renameProject(renameTarget.id, user.id, newTitle);
      setProjects((p) => p.map((x) => x.id === renameTarget.id ? { ...x, title: newTitle } : x));
      if (currentProjectId === renameTarget.id) setCurrentProjectTitle(newTitle);
      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameText('');
    } catch {
      Alert.alert('Error', 'Could not rename project.');
    }
  }, [user?.id, renameTarget, renameText, currentProjectId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setShowTemplates(false);

    const userMsg: BuilderMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };
    const systemMsg = { role: 'system', content: BUILDER_SYSTEM };
    historyRef.current = [...historyRef.current, { role: 'user', content: text.trim() }];
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    const streamId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: streamId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      timestamp: new Date(),
    }]);

    try {
      let acc = '';
      await streamBuilderResponse(
        [systemMsg, ...historyRef.current.slice(-20)],
        (chunk) => {
          acc += chunk;
          setMessages((prev) => prev.map((m) => m.id === streamId ? { ...m, text: acc, isStreaming: true } : m));
          scrollToBottom();
        },
        abortRef.current.signal
      );

      const final = acc || 'No response received. Try again.';
      historyRef.current = [...historyRef.current, { role: 'assistant', content: final }];
      setMessages((prev) => prev.map((m) => m.id === streamId ? { ...m, text: final, isStreaming: false } : m));
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setMessages((prev) => prev.map((m) =>
        m.id === streamId ? { ...m, text: 'Connection issue. Check your internet and try again.', isStreaming: false } : m
      ));
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [isLoading, activeMode]);

  const handleModeSwitch = (mode: BuilderMode) => {
    setActiveMode(mode);
    historyRef.current = [...historyRef.current, { role: 'system', content: `[Mode switched to: ${mode.toUpperCase()}]` }];
  };

  const handleClear = () => {
    abortRef.current?.abort();
    historyRef.current = [];
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setShowTemplates(true);
    setShowClearModal(false);
    setCurrentProjectId(null);
    setCurrentProjectTitle('');
  };

  const openSaveModal = () => {
    // Pre-fill title from first user message
    const firstUser = messages.find((m) => m.role === 'user');
    const auto = firstUser ? firstUser.text.slice(0, 40) : '';
    setSaveTitle(currentProjectTitle || auto);
    setShowSaveModal(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <MaterialIcons name="developer-mode" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {currentProjectTitle ? currentProjectTitle : 'App Builder'}
            </Text>
            <Text style={styles.headerSub}>
              {currentProjectId ? '● Saved Project' : 'GPT-5.1 · React Native Expert'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Save button — visible when there are messages */}
          {messages.length > 0 ? (
            <Pressable
              onPress={currentProjectId ? handleAutoSave : openSaveModal}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, styles.headerBtnGold, pressed && { opacity: 0.7 }]}
            >
              <MaterialIcons name={currentProjectId ? 'cloud-done' : 'save'} size={17} color={Colors.textInverse} />
              <Text style={styles.headerBtnGoldText}>{currentProjectId ? 'Saved' : 'Save'}</Text>
            </Pressable>
          ) : null}

          {/* Projects button */}
          <Pressable
            onPress={() => { fetchProjects(); setShowProjects(true); }}
            hitSlop={8}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="folder-open" size={19} color={Colors.textSecondary} />
          </Pressable>

          {/* Clear button */}
          <Pressable
            onPress={() => messages.length > 0 && setShowClearModal(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons
              name="refresh"
              size={19}
              color={messages.length > 0 ? Colors.textSecondary : Colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
          {BUILDER_MODES.map((m) => {
            const active = activeMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => handleModeSwitch(m.key)}
                style={({ pressed }) => [
                  styles.modeChip,
                  active && [styles.modeChipActive, { borderColor: m.color }],
                  pressed && { opacity: 0.75 },
                ]}
              >
                <MaterialIcons name={m.icon} size={15} color={active ? m.color : Colors.textMuted} />
                <Text style={[styles.modeLabel, active && { color: m.color }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty State / Templates */}
          {showTemplates && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.heroCard}>
                <View style={styles.heroIconWrap}>
                  <MaterialIcons name="developer-mode" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.heroTitle}>Build Any App{'\n'}with AI</Text>
                <Text style={styles.heroSub}>
                  Describe your idea — get a full plan, code, and launch strategy. Powered by GPT-5.1.
                </Text>
                {/* Projects shortcut in empty state */}
                <Pressable
                  onPress={() => { fetchProjects(); setShowProjects(true); }}
                  style={({ pressed }) => [styles.openProjectsBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="folder-open" size={16} color={Colors.primary} />
                  <Text style={styles.openProjectsBtnText}>Open a saved project</Text>
                </Pressable>
              </View>

              <View style={styles.modeInfoCard}>
                {(() => {
                  const m = BUILDER_MODES.find((x) => x.key === activeMode)!;
                  return (
                    <>
                      <View style={styles.modeInfoRow}>
                        <MaterialIcons name={m.icon} size={18} color={m.color} />
                        <Text style={[styles.modeInfoLabel, { color: m.color }]}>{m.label} Mode</Text>
                      </View>
                      <Text style={styles.modeInfoDesc}>{m.desc}</Text>
                    </>
                  );
                })()}
              </View>

              <Text style={styles.templateLabel}>📦 Quick Start Templates</Text>
              <View style={styles.templateGrid}>
                {QUICK_TEMPLATES.map((t, i) => (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [styles.templateChip, pressed && { opacity: 0.75 }]}
                    onPress={() => sendMessage(t.prompt)}
                  >
                    <Text style={styles.templateEmoji}>{t.emoji}</Text>
                    <Text style={styles.templateChipLabel}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.customIdeaCard}>
                <MaterialIcons name="lightbulb-outline" size={18} color={Colors.warning} />
                <Text style={styles.customIdeaText}>
                  Have your own idea? Type it below and I'll build the full plan.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Messages */}
          {messages.map((msg) => (
            <BuilderBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' ? (
            <View style={styles.bubbleWrap}>
              <View style={styles.bubbleAvatar}>
                <MaterialIcons name="code" size={14} color={Colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Building response...</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.activeModeBadge}>
            {(() => {
              const m = BUILDER_MODES.find((x) => x.key === activeMode)!;
              return (
                <>
                  <MaterialIcons name={m.icon} size={12} color={m.color} />
                  <Text style={[styles.activeModeText, { color: m.color }]}>{m.label}</Text>
                </>
              );
            })()}
            {currentProjectTitle ? (
              <>
                <Text style={styles.activeModeText}>·</Text>
                <MaterialIcons name="folder" size={11} color={Colors.textMuted} />
                <Text style={[styles.activeModeText, { color: Colors.textMuted }]} numberOfLines={1}>
                  {currentProjectTitle}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={MODE_PROMPTS[activeMode]}
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={3000}
              returnKeyType="default"
              editable={!isLoading}
            />
            <Pressable
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <MaterialIcons name="send" size={20} color={Colors.textInverse} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── PROJECTS MODAL ── */}
      <Modal
        visible={showProjects}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjects(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowProjects(false)}>
          <Pressable style={styles.projectsSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.projectsHeader}>
              <View>
                <Text style={styles.sheetTitle}>My Projects</Text>
                <Text style={styles.sheetSub}>Saved app build sessions</Text>
              </View>
              {messages.length > 0 ? (
                <Pressable
                  onPress={() => { setShowProjects(false); openSaveModal(); }}
                  style={({ pressed }) => [styles.newProjectBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="add" size={16} color={Colors.textInverse} />
                  <Text style={styles.newProjectBtnText}>Save Current</Text>
                </Pressable>
              ) : null}
            </View>

            {projectsLoading ? (
              <View style={styles.projectsLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.projectsLoadingText}>Loading projects...</Text>
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.projectsEmpty}>
                <MaterialIcons name="folder-open" size={48} color={Colors.textMuted} />
                <Text style={styles.projectsEmptyTitle}>No saved projects yet</Text>
                <Text style={styles.projectsEmptyDesc}>
                  Start a conversation and hit Save to create your first project.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 32 }}>
                {projects.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    onOpen={() => handleOpenProject(p)}
                    onRename={() => {
                      setRenameTarget(p);
                      setRenameText(p.title);
                      setShowRenameModal(true);
                    }}
                    onDelete={() => handleDeleteProject(p)}
                  />
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── SAVE MODAL ── */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !isSaving && setShowSaveModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="save" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Save Project</Text>
            <Text style={styles.modalBody}>Give this build session a name so you can find it later.</Text>

            <TextInput
              style={styles.saveInput}
              value={saveTitle}
              onChangeText={setSaveTitle}
              placeholder="e.g. Fitness Tracker App"
              placeholderTextColor={Colors.textMuted}
              maxLength={60}
              autoFocus
            />

            <View style={styles.modalBtns}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowSaveModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && { opacity: 0.8 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <MaterialIcons name="save" size={15} color={Colors.textInverse} />
                    <Text style={styles.modalBtnConfirmText}>Save Project</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── RENAME MODAL ── */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRenameModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.infoDim }]}>
              <MaterialIcons name="edit" size={26} color={Colors.info} />
            </View>
            <Text style={styles.modalTitle}>Rename Project</Text>

            <TextInput
              style={styles.saveInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Project name"
              placeholderTextColor={Colors.textMuted}
              maxLength={60}
              autoFocus
            />

            <View style={styles.modalBtns}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.7 }]}
                onPress={() => { setShowRenameModal(false); setRenameTarget(null); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: Colors.info }, pressed && { opacity: 0.8 }]}
                onPress={handleRenameConfirm}
              >
                <MaterialIcons name="check" size={15} color={Colors.textPrimary} />
                <Text style={[styles.modalBtnConfirmText, { color: Colors.textPrimary }]}>Rename</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── CLEAR MODAL ── */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowClearModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.warningDim }]}>
              <MaterialIcons name="refresh" size={26} color={Colors.warning} />
            </View>
            <Text style={styles.modalTitle}>Start New Session?</Text>
            <Text style={styles.modalBody}>
              {currentProjectId
                ? 'Your project is saved. Starting fresh clears the current conversation.'
                : 'Your current conversation will be cleared. Save it first if you want to keep it.'}
            </Text>
            {!currentProjectId && messages.length > 0 ? (
              <Pressable
                onPress={() => { setShowClearModal(false); openSaveModal(); }}
                style={({ pressed }) => [styles.saveFirstBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="save" size={14} color={Colors.primary} />
                <Text style={styles.saveFirstBtnText}>Save first</Text>
              </Pressable>
            ) : null}
            <View style={styles.modalBtns}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Keep Session</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && { opacity: 0.8 }]}
                onPress={handleClear}
              >
                <MaterialIcons name="refresh" size={15} color={Colors.textInverse} />
                <Text style={styles.modalBtnConfirmText}>New Session</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnGold: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    width: 'auto', paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  headerBtnGoldText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  // Mode bar
  modeBar: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  modeScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  modeChipActive: { backgroundColor: 'rgba(255,215,0,0.07)' },
  modeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted },

  // Messages
  messagesContent: { paddingBottom: 16 },

  // Empty state
  emptyState: { padding: Spacing.md, gap: Spacing.md },
  heroCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.gold,
  },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2, borderColor: 'rgba(255,215,0,0.35)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, textAlign: 'center', lineHeight: 30,
  },
  heroSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  openProjectsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: Radius.full,
  },
  openProjectsBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },

  modeInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.md, gap: 6,
  },
  modeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeInfoLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  modeInfoDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  templateLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: -4 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  templateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 10,
  },
  templateEmoji: { fontSize: 16 },
  templateChipLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },

  customIdeaCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.warningDim,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    padding: Spacing.md,
  },
  customIdeaText: { flex: 1, fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20 },

  // Bubbles
  bubbleWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  bubbleWrapUser: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1 },
  bubbleUser: { backgroundColor: Colors.primary, borderColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.surfaceBorder, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTextUser: { color: Colors.textInverse, fontWeight: FontWeight.medium },
  cursor: { color: Colors.primary, fontSize: FontSize.sm },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Input
  inputArea: {
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.background, gap: 8,
  },
  activeModeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    maxWidth: '90%',
  },
  activeModeText: { fontSize: 11, fontWeight: FontWeight.semibold },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: Colors.inputBg,
    borderWidth: 1, borderColor: Colors.inputBorder,
    borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.sm, color: Colors.textPrimary, maxHeight: 140, lineHeight: 20,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },

  // Projects sheet
  sheetBackdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  projectsSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.lg, paddingBottom: 40,
    maxHeight: '85%',
    gap: Spacing.md,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: 4,
  },
  projectsHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sheetSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  newProjectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  newProjectBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  projectsLoading: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  projectsLoadingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  projectsEmpty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  projectsEmptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  projectsEmptyDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Project item
  projectItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  projectModeIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  projectTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  projectDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  projectModePill: {
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  projectModeText: { fontSize: 10, fontWeight: FontWeight.bold },
  projectMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  projectActions: { flexDirection: 'row', gap: 6 },
  projectActionBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Modals
  modalBackdrop: {
    flex: 1, backgroundColor: Colors.overlay,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%', backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.md, ...Shadow.card,
  },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  modalBody: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  saveInput: {
    width: '100%', backgroundColor: Colors.inputBg,
    borderWidth: 1, borderColor: Colors.inputBorder,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: FontSize.base, color: Colors.textPrimary,
  },
  saveFirstBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
  },
  saveFirstBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.sm },
  modalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.lg, gap: 6,
  },
  modalBtnCancel: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  modalBtnCancelText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  modalBtnConfirm: { backgroundColor: Colors.warning },
  modalBtnConfirmText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
});
