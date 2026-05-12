// Powered by OnSpace.AI
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { ChatBubble } from '@/components/feature/ChatBubble';
import { TypingIndicator } from '@/components/feature/TypingIndicator';
import { useChat, Message } from '@/hooks/useChat';
import { AI_MODELS } from '@/services/aiService';
import {
  startRecording, stopRecording, cancelRecording,
  transcribeAudio, speakText, stopSpeaking,
} from '@/services/voiceService';

// ── Voice Wave Animation ────────────────────────────────────────────────────
function VoiceWave({ isActive }: { isActive: boolean }) {
  const bars = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.6)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.8)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    if (!isActive) { bars.forEach((b) => b.setValue(0.3)); return; }
    const animations = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 0.3 + Math.random() * 0.7, duration: 200 + i * 80, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.2, duration: 200 + i * 60, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [isActive]);

  return (
    <View style={waveStyles.wrap}>
      {bars.map((bar, i) => (
        <Animated.View key={i} style={[waveStyles.bar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 },
  bar: { width: 4, height: 28, borderRadius: 2, backgroundColor: Colors.primary },
});

// ── Main Chat Screen ────────────────────────────────────────────────────────
export default function ChatScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const {
    messages, isLoading, inputText, setInputText,
    sendMessage, language, toggleLanguage, clearHistory, isHistoryLoaded,
    activeModel, setActiveModel,
  } = useChat();
  const flatRef = useRef<FlatList>(null);
  const handledQuery = useRef(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ uri: string; base64: string } | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceSpeakEnabled, setVoiceSpeakEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.query && !handledQuery.current && isHistoryLoaded) {
      handledQuery.current = true;
      sendMessage(params.query);
    }
  }, [params.query, isHistoryLoaded]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isLoading]);

  // Speak AI replies when voice mode is on
  useEffect(() => {
    if (!voiceSpeakEnabled || isLoading) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && !last.isStreaming && last.text.length > 0) {
      setIsSpeaking(true);
      speakText(last.text, language, () => setIsSpeaking(false));
    }
  }, [messages, isLoading, voiceSpeakEnabled]);

  const handleClearConfirm = async () => {
    setShowClearModal(false);
    await clearHistory();
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to attach images.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachedImage({ uri: asset.uri, base64: asset.base64 ?? '' });
      }
    } catch { Alert.alert('Error', 'Could not pick image. Try again.'); }
  };

  const handleSend = () => {
    if (!inputText.trim() && !attachedImage) return;
    const text = inputText.trim() || 'Analyze this image.';
    sendMessage(text, attachedImage?.base64);
    setAttachedImage(null);
  };

  // ── Voice Recording ─────────────────────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (isTranscribing) return;
    if (isRecording) {
      if (recordTimer.current) clearTimeout(recordTimer.current);
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        const audioBase64 = await stopRecording();
        if (!audioBase64) { setIsTranscribing(false); return; }
        const transcript = await transcribeAudio(audioBase64, language);
        if (transcript.trim()) { setInputText(transcript.trim()); }
        else { Alert.alert('Could not hear', 'No speech detected. Try again.'); }
      } catch { Alert.alert('Voice Error', 'Could not transcribe. Check your mic and try again.'); }
      finally { setIsTranscribing(false); }
    } else {
      try {
        await startRecording();
        setIsRecording(true);
        recordTimer.current = setTimeout(async () => { if (isRecording) handleMicPress(); }, 30000);
      } catch { Alert.alert('Microphone Error', 'Could not access microphone. Please grant permission.'); }
    }
  }, [isRecording, isTranscribing, language]);

  const handleCancelRecording = async () => {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    await cancelRecording();
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); }
    else { setVoiceSpeakEnabled((v) => !v); }
  };

  const renderItem = ({ item }: { item: Message }) => <ChatBubble message={item} />;

  const currentModelInfo = AI_MODELS.find((m) => m.id === activeModel) ?? AI_MODELS[0];

  const CAPABILITY_CHIPS = [
    { emoji: '💻', label: 'Write Code' },
    { emoji: '📊', label: 'XAUUSD Analysis' },
    { emoji: '✍️', label: 'Write Essay' },
    { emoji: '🔢', label: 'Solve Math' },
    { emoji: '🌍', label: 'Translate' },
    { emoji: '🏦', label: 'Prop Firm Tips' },
    { emoji: '🎨', label: 'Photo Editing' },
    { emoji: '💼', label: 'Business Plan' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarRing, isSpeaking && styles.avatarRingSpeaking]}>
            <Text style={styles.avatarText}>DT</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>Digital Twin</Text>
            {/* Tappable model badge */}
            <Pressable
              onPress={() => setShowModelPicker(true)}
              hitSlop={6}
              style={({ pressed }) => [styles.modelBadge, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.modelDotSmall, { backgroundColor: currentModelInfo.color }]} />
              <Text style={styles.modelBadgeText}>
                {isSpeaking ? '🔊 Speaking...' : isRecording ? '🎙️ Listening...' : currentModelInfo.label}
              </Text>
              {!isSpeaking && !isRecording && (
                <MaterialIcons name="keyboard-arrow-down" size={12} color={Colors.textMuted} />
              )}
            </Pressable>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleToggleSpeak}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              (voiceSpeakEnabled || isSpeaking) && styles.iconBtnActive,
              pressed && { opacity: 0.6 },
            ]}
          >
            <MaterialIcons
              name={isSpeaking ? 'stop' : voiceSpeakEnabled ? 'volume-up' : 'volume-off'}
              size={20}
              color={voiceSpeakEnabled || isSpeaking ? Colors.primary : Colors.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowClearModal(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="delete-outline" size={20} color={Colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.langBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.langText}>{language === 'en' ? '🇬🇧 EN' : '🇪🇹 AM'}</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {!isHistoryLoaded ? (
          <View style={styles.loadingHistory}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                messages.length > 2 ? (
                  <View style={styles.historyBadge}>
                    <MaterialIcons name="history" size={12} color={Colors.textMuted} />
                    <Text style={styles.historyBadgeText}>
                      {messages.length} messages · {currentModelInfo.label} + Voice
                    </Text>
                  </View>
                ) : null
              }
              ListFooterComponent={isLoading ? <TypingIndicator /> : null}
            />

            {messages.length <= 1 && !isLoading && (
              <View style={styles.capabilityWrap}>
                <Text style={styles.capabilityTitle}>🎙️ Tap mic to speak — or type anything:</Text>
                <View style={styles.quickRow}>
                  {CAPABILITY_CHIPS.map((p, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
                      onPress={() => sendMessage(`Help me with: ${p.label}`)}
                    >
                      <Text style={styles.quickChipText}>{p.emoji} {p.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Recording Overlay */}
        {(isRecording || isTranscribing) && (
          <View style={styles.recordingBar}>
            {isTranscribing ? (
              <>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.recordingText}>Understanding your voice...</Text>
              </>
            ) : (
              <>
                <VoiceWave isActive={isRecording} />
                <Text style={styles.recordingText}>Listening... tap mic to send</Text>
                <Pressable onPress={handleCancelRecording} hitSlop={8} style={styles.cancelRecBtn}>
                  <MaterialIcons name="close" size={16} color={Colors.textMuted} />
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Attached image preview */}
        {attachedImage ? (
          <View style={styles.attachPreview}>
            <Image source={{ uri: attachedImage.uri }} style={styles.attachThumb} contentFit="cover" />
            <Text style={styles.attachLabel}>Image attached</Text>
            <Pressable onPress={() => setAttachedImage(null)} hitSlop={8} style={styles.attachRemove}>
              <MaterialIcons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <Pressable
            onPress={handlePickImage}
            hitSlop={4}
            style={({ pressed }) => [styles.iconCircleBtn, pressed && { opacity: 0.7 }, attachedImage ? styles.attachBtnActive : null]}
          >
            <MaterialIcons name="image" size={22} color={attachedImage ? Colors.primary : Colors.textMuted} />
          </Pressable>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              isRecording ? 'Listening...' :
              isTranscribing ? 'Processing voice...' :
              language === 'en' ? 'Speak or type anything...' : 'ይናገሩ ወይም ይጻፉ...'
            }
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="default"
            editable={isHistoryLoaded && !isRecording && !isTranscribing}
          />

          <Pressable
            onPress={handleMicPress}
            disabled={isTranscribing || isLoading || !isHistoryLoaded}
            style={({ pressed }) => [
              styles.micBtn,
              isRecording && styles.micBtnActive,
              isTranscribing && styles.micBtnTranscribing,
              pressed && { opacity: 0.8 },
            ]}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={22} color={Colors.textInverse} />
            )}
          </Pressable>

          <Pressable
            onPress={handleSend}
            disabled={(!inputText.trim() && !attachedImage) || isLoading || !isHistoryLoaded || isRecording}
            style={({ pressed }) => [
              styles.sendBtn,
              ((!inputText.trim() && !attachedImage) || isLoading || !isHistoryLoaded || isRecording) && styles.sendBtnDisabled,
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
      </KeyboardAvoidingView>

      {/* ── Model Picker Modal ── */}
      <Modal
        visible={showModelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowModelPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Choose AI Model</Text>
            <Text style={styles.pickerSub}>
              Switch between GPT-5.1, Grok-3, Gemini and more — all powered by OnSpace AI
            </Text>
            {AI_MODELS.map((m) => {
              const active = activeModel === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={({ pressed }) => [
                    styles.modelItem,
                    active && styles.modelItemActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => { setActiveModel(m.id); setShowModelPicker(false); }}
                >
                  <View style={[styles.modelItemDot, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modelItemLabel, active && styles.modelItemLabelActive]}>
                      {m.label}
                    </Text>
                    <Text style={styles.modelItemProvider}>{m.badge}</Text>
                  </View>
                  {active && <MaterialIcons name="check-circle" size={20} color={Colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Clear History Modal ── */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowClearModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="delete-forever" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Clear Chat History?</Text>
            <Text style={styles.modalBody}>
              All {messages.length} messages will be permanently deleted. Your Digital Twin will start fresh.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Keep History</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnDelete, pressed && { opacity: 0.8 }]}
                onPress={handleClearConfirm}
              >
                <MaterialIcons name="delete" size={16} color={Colors.textPrimary} />
                <Text style={styles.modalBtnDeleteText}>Clear All</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingSpeaking: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: { fontSize: 13, fontWeight: FontWeight.bold, color: Colors.primary },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  headerName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },

  // Model badge (tappable)
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modelDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  modelBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  langBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  langText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },

  loadingHistory: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },

  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  historyBadgeText: { fontSize: FontSize.xs, color: Colors.textMuted },
  messagesList: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm },

  capabilityWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  capabilityTitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  quickChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },

  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.primaryGlow,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.25)',
  },
  recordingText: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  cancelRecBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  attachThumb: { width: 48, height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary },
  attachLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  attachRemove: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  iconCircleBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  attachBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    maxHeight: 120,
    lineHeight: 22,
  },
  micBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  micBtnTranscribing: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },

  // ── Model Picker Sheet ──
  pickerBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.sm,
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  pickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  pickerSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  modelItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  modelItemDot: {
    width: 12, height: 12, borderRadius: 6, flexShrink: 0,
  },
  modelItemLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  modelItemLabelActive: { color: Colors.primary },
  modelItemProvider: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ── Clear Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.dangerDim,
    borderWidth: 1, borderColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  modalBody: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.sm },
  modalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.lg, gap: 6,
  },
  modalBtnCancel: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  modalBtnCancelText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  modalBtnDelete: { backgroundColor: Colors.danger },
  modalBtnDeleteText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});
