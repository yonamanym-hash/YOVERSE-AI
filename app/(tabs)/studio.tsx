// Powered by OnSpace.AI
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { analyzePhotoWithAI } from '@/services/studioService';

// ─── Types ──────────────────────────────────────────────────────────────────

type StudioTab = 'advisor' | 'fashion' | 'poses';

interface AIFeedback {
  text: string;
  category: 'editing' | 'style' | 'pose' | 'general';
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FASHION_STYLES = [
  {
    title: 'Modern Luxury Casual',
    emoji: '👑',
    description: 'The everyday Yonas signature — elevated basics with premium feel.',
    items: ['Slim-fit monochrome tees (black, white, cream)', 'Tailored joggers or slim chinos', 'Clean leather sneakers (white or black)', 'Minimalist watch — gold accents', 'Subtle layering: light jacket or overshirt'],
    vibe: 'Think: rich student, not flashy.',
  },
  {
    title: 'Sharp Business Edge',
    emoji: '🧥',
    description: 'For meetings, pitch decks, and when you want the room to feel you before you speak.',
    items: ['Dark slim-fit blazer (navy, charcoal, black)', 'Fitted dress shirt — no tie for Gen-Z energy', 'Tailored trousers — break at the ankle', 'Derby or loafer shoes — leather, clean', 'One statement piece: gold chain or ring'],
    vibe: 'Think: funded trader walks in the room.',
  },
  {
    title: 'Brand Builder Streetwear',
    emoji: '🔥',
    description: 'When shooting content for your brand or social presence.',
    items: ['Premium graphic tee or logo hoodie (minimal)', 'Cargo pants — not baggy, fitted at hips', 'High-top sneakers — Air Force 1 or similar', 'Cap or beanie — clean, no clutter', 'Layered chains — keep it to 1-2 max'],
    vibe: 'Think: young entrepreneur who made it.',
  },
  {
    title: 'Photo-Ready Fit',
    emoji: '📸',
    description: 'Outfits that pop in photos and work across all lighting.',
    items: ['Solid neutral tones — black, white, beige, camel', 'Avoid heavy patterns (distracts from the face)', 'High-contrast outfit if shooting at night', 'Structured shoulders — makes silhouette stronger', 'Fit over brand — tailored basics beat logo overkill'],
    vibe: 'Think: editorial, not overcrowded.',
  },
];

const POSE_LIBRARY = [
  {
    name: 'The Confident Lean',
    emoji: '🧱',
    type: 'Wall / Architecture',
    instructions: [
      'Find a textured wall or architectural feature',
      'Stand sideways — lean your shoulder into it lightly',
      'Cross one ankle in front of the other',
      'One hand in pocket, chin slightly down',
      'Eyes slightly off-camera for depth',
    ],
    tip: 'Works best: urban settings, dark backgrounds, editorial shots.',
  },
  {
    name: 'The Power Walk',
    emoji: '🚶',
    type: 'Motion Shot',
    instructions: [
      'Walk naturally toward or past the camera',
      'Keep your chin level — don\'t look at the ground',
      'Let your arms swing naturally, not stiff',
      'Shoot in burst mode — pick the mid-stride frame',
      'Slight jaw tension for the "focused" look',
    ],
    tip: 'Use golden hour or backlit street for dramatic effect.',
  },
  {
    name: 'The Thinking Pose',
    emoji: '🤔',
    type: 'Portrait / Headshot',
    instructions: [
      'Rest your chin lightly on your knuckles (don\'t push it up)',
      'Slight side angle — never full front-face for this pose',
      'Eyes can look at camera or slightly past it',
      'Relax your shoulders — don\'t square them',
      'Soft expression — between focused and calm',
    ],
    tip: 'Great for LinkedIn, brand profiles, and personal site shots.',
  },
  {
    name: 'The Arms-Crossed Authority',
    emoji: '💪',
    type: 'Full Body / Upper Body',
    instructions: [
      'Cross arms at chest height — not too high',
      'Stand at a 3/4 angle to the camera',
      'Feet shoulder-width apart, weight on back foot',
      'Chin slightly forward and down (eliminates double chin)',
      'Expression: serious but approachable — slight lip press',
    ],
    tip: 'Elevate with a blazer or structured jacket for maximum impact.',
  },
  {
    name: 'The Seated Casual',
    emoji: '🪑',
    type: 'Lifestyle / Relaxed',
    instructions: [
      'Sit on stairs, ledge, or bench — lean slightly forward',
      'Elbows on knees, hands relaxed or lightly clasped',
      'Turn body 45° from the camera',
      'Can look at camera or at something in the scene',
      'Feet flat or one leg extended for length',
    ],
    tip: 'Add a coffee cup, phone, or notebook for a "day in the life" feel.',
  },
  {
    name: 'The Look Back',
    emoji: '👀',
    type: 'Fashion / Street',
    instructions: [
      'Walk away from the camera 3-4 steps',
      'Turn head back over your shoulder at the camera',
      'Body continues slightly forward — creates tension',
      'Keep your chin parallel to the ground',
      'Can be caught mid-stride for more energy',
    ],
    tip: 'Best for full outfit shots — shows back details and creates movement.',
  },
];

const EDITING_QUICK_TIPS = [
  { icon: '☀️', title: 'Exposure First', tip: 'Bring shadows up slightly before touching highlights. Under-exposed faces lose detail.' },
  { icon: '🎨', title: 'Color Grade', tip: 'For Modern Luxury: pull warmth slightly down, lift blues in shadows, add subtle orange in mids.' },
  { icon: '🖤', title: 'Blacks & Whites', tip: 'Push blacks down for depth. Don\'t crush them — keep shadow detail visible.' },
  { icon: '✨', title: 'Clarity vs Texture', tip: 'Texture on clothes/background. Lower clarity on skin slightly for a cinematic look.' },
  { icon: '📐', title: 'Crop & Composition', tip: 'Use rule of thirds. Eyes on the upper third line. Never center unless intentional.' },
  { icon: '🌟', title: 'Dehaze', tip: 'For dark, dramatic edits — lift dehaze slightly. It adds a rich, contrasty matte feel.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const [activeTab, setActiveTab] = useState<StudioTab>('advisor');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [expandedFashion, setExpandedFashion] = useState<number | null>(0);
  const [expandedPose, setExpandedPose] = useState<number | null>(null);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to use the AI advisor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      setFeedback(null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      setFeedback(null);
    }
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setFeedback(null);
    try {
      const prompt = customPrompt.trim() || 'Analyze this photo and give me feedback on the style, pose, editing, and overall look. Be specific and actionable.';
      const result = await analyzePhotoWithAI(imageBase64, prompt);
      setFeedback({ text: result, category: 'general' });
    } catch {
      setFeedback({ text: 'Could not analyze the photo. Check your connection and try again.', category: 'general' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageBase64, customPrompt]);

  const clearPhoto = () => {
    setSelectedImage(null);
    setImageBase64(null);
    setFeedback(null);
    setCustomPrompt('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Studio</Text>
          <Text style={styles.headerSub}>Style · Poses · AI Advisor</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="auto-awesome" size={14} color={Colors.primary} />
          <Text style={styles.headerBadgeText}>AI Powered</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { key: 'advisor', label: 'AI Advisor', icon: 'camera-alt' },
          { key: 'fashion', label: 'Fashion', icon: 'style' },
          { key: 'poses', label: 'Poses', icon: 'accessibility-new' },
        ] as { key: StudioTab; label: string; icon: any }[]).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
          >
            <MaterialIcons
              name={t.icon}
              size={16}
              color={activeTab === t.key ? Colors.textInverse : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AI ADVISOR TAB ── */}
          {activeTab === 'advisor' && (
            <View style={styles.tabContent}>
              {/* Studio hero */}
              <View style={styles.studioHero}>
                <Image
                  source={require('@/assets/images/studio-bg.png')}
                  style={styles.studioBg}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.studioOverlay}>
                  <Text style={styles.studioHeroTag}>AI PHOTO ADVISOR</Text>
                  <Text style={styles.studioHeroTitle}>Drop a photo.{'\n'}Get real feedback.</Text>
                </View>
              </View>

              {/* Photo Upload Area */}
              {!selectedImage ? (
                <View style={styles.uploadArea}>
                  <MaterialIcons name="add-photo-alternate" size={40} color={Colors.primary} />
                  <Text style={styles.uploadTitle}>Upload a Photo</Text>
                  <Text style={styles.uploadSub}>
                    Get AI feedback on your editing, style, pose, and overall look
                  </Text>
                  <View style={styles.uploadBtns}>
                    <Pressable
                      style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}
                      onPress={pickImage}
                    >
                      <MaterialIcons name="photo-library" size={18} color={Colors.textInverse} />
                      <Text style={styles.uploadBtnText}>Gallery</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.uploadBtn, styles.uploadBtnSecondary, pressed && { opacity: 0.8 }]}
                      onPress={takePhoto}
                    >
                      <MaterialIcons name="camera-alt" size={18} color={Colors.primary} />
                      <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>Camera</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPreviewSection}>
                  {/* Preview */}
                  <View style={styles.photoPreviewWrap}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.photoPreview}
                      contentFit="cover"
                      transition={200}
                    />
                    <Pressable
                      style={styles.removePhoto}
                      onPress={clearPhoto}
                      hitSlop={8}
                    >
                      <MaterialIcons name="close" size={16} color={Colors.textPrimary} />
                    </Pressable>
                  </View>

                  {/* Focus Prompt */}
                  <View style={styles.promptSection}>
                    <Text style={styles.promptLabel}>What should I focus on? (optional)</Text>
                    <TextInput
                      style={styles.promptInput}
                      value={customPrompt}
                      onChangeText={setCustomPrompt}
                      placeholder="e.g. How can I improve the pose? Is the edit too dark?"
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      maxLength={200}
                    />
                  </View>

                  {/* Quick Focus Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.focusChips}>
                    {[
                      { label: 'Edit Tips', val: 'Give me specific photo editing tips for this image — exposure, color grade, contrast.' },
                      { label: 'Pose Feedback', val: 'How is my pose? What would make it stronger and more confident?' },
                      { label: 'Style Rating', val: 'Rate my outfit and style in this photo. What would level it up?' },
                      { label: 'Overall Look', val: 'Give me a full breakdown: editing, pose, style, and composition. Be honest and specific.' },
                    ].map((chip) => (
                      <Pressable
                        key={chip.label}
                        style={({ pressed }) => [styles.focusChip, pressed && { opacity: 0.7 }]}
                        onPress={() => setCustomPrompt(chip.val)}
                      >
                        <Text style={styles.focusChipText}>{chip.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* Analyze Button */}
                  <Pressable
                    style={({ pressed }) => [styles.analyzeBtn, isAnalyzing && styles.analyzeBtnDisabled, pressed && { opacity: 0.85 }]}
                    onPress={analyzePhoto}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                        <Text style={styles.analyzeBtnText}>Analyzing...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="auto-awesome" size={18} color={Colors.textInverse} />
                        <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
                      </>
                    )}
                  </Pressable>

                  {/* AI Feedback */}
                  {feedback && (
                    <View style={styles.feedbackCard}>
                      <View style={styles.feedbackHeader}>
                        <View style={styles.dtAvatar}>
                          <Text style={styles.dtAvatarText}>DT</Text>
                        </View>
                        <View>
                          <Text style={styles.feedbackFrom}>Digital Twin</Text>
                          <Text style={styles.feedbackRole}>Style Advisor</Text>
                        </View>
                      </View>
                      <Text style={styles.feedbackText}>{feedback.text}</Text>
                      <Pressable
                        style={({ pressed }) => [styles.newPhotoBtn, pressed && { opacity: 0.7 }]}
                        onPress={clearPhoto}
                      >
                        <MaterialIcons name="refresh" size={15} color={Colors.primary} />
                        <Text style={styles.newPhotoBtnText}>Analyze Another Photo</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Quick Editing Tips */}
              <View style={styles.tipsSection}>
                <Text style={styles.sectionTitle}>Quick Editing Tips</Text>
                <View style={styles.tipsGrid}>
                  {EDITING_QUICK_TIPS.map((tip, i) => (
                    <View key={i} style={styles.tipCard}>
                      <Text style={styles.tipIcon}>{tip.icon}</Text>
                      <Text style={styles.tipTitle}>{tip.title}</Text>
                      <Text style={styles.tipText}>{tip.tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── FASHION TAB ── */}
          {activeTab === 'fashion' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionIntro}>
                Yonas's personal style guide — Modern Luxury Edition. These aren't just outfits. They're your brand.
              </Text>
              {FASHION_STYLES.map((style, i) => {
                const expanded = expandedFashion === i;
                return (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [styles.fashionCard, expanded && styles.fashionCardExpanded, pressed && { opacity: 0.95 }]}
                    onPress={() => setExpandedFashion(expanded ? null : i)}
                  >
                    <View style={styles.fashionCardHeader}>
                      <Text style={styles.fashionEmoji}>{style.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fashionTitle}>{style.title}</Text>
                        <Text style={styles.fashionDesc}>{style.description}</Text>
                      </View>
                      <MaterialIcons
                        name={expanded ? 'expand-less' : 'expand-more'}
                        size={22}
                        color={Colors.textMuted}
                      />
                    </View>
                    {expanded && (
                      <View style={styles.fashionBody}>
                        <View style={styles.fashionDivider} />
                        {style.items.map((item, j) => (
                          <View key={j} style={styles.fashionItem}>
                            <View style={styles.fashionDot} />
                            <Text style={styles.fashionItemText}>{item}</Text>
                          </View>
                        ))}
                        <View style={styles.fashionVibeBadge}>
                          <MaterialIcons name="lightbulb" size={14} color={Colors.primary} />
                          <Text style={styles.fashionVibeText}>{style.vibe}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {/* Color Palette */}
              <View style={styles.paletteCard}>
                <Text style={styles.paletteTitle}>🎨 Your Signature Color Palette</Text>
                <Text style={styles.paletteSub}>Build your wardrobe around these — they photograph well and scream "Modern Luxury".</Text>
                <View style={styles.paletteRow}>
                  {[
                    { color: '#080808', label: 'Jet Black' },
                    { color: '#F5F5F5', label: 'Chalk White' },
                    { color: '#D4B896', label: 'Camel' },
                    { color: '#FFD700', label: 'Gold' },
                    { color: '#2D2D2D', label: 'Charcoal' },
                    { color: '#8B7355', label: 'Cognac' },
                  ].map((p) => (
                    <View key={p.label} style={styles.paletteChip}>
                      <View style={[styles.paletteCircle, { backgroundColor: p.color, borderWidth: p.color === '#F5F5F5' ? 1 : 0, borderColor: Colors.surfaceBorder }]} />
                      <Text style={styles.paletteLabel}>{p.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── POSES TAB ── */}
          {activeTab === 'poses' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionIntro}>
                Six signature poses for every setting. Master these and you'll never have a bad photo again.
              </Text>
              {POSE_LIBRARY.map((pose, i) => {
                const expanded = expandedPose === i;
                return (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [styles.poseCard, expanded && styles.poseCardExpanded, pressed && { opacity: 0.95 }]}
                    onPress={() => setExpandedPose(expanded ? null : i)}
                  >
                    <View style={styles.poseCardHeader}>
                      <Text style={styles.poseEmoji}>{pose.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.poseName}>{pose.name}</Text>
                        <View style={styles.poseTypeBadge}>
                          <Text style={styles.poseTypeText}>{pose.type}</Text>
                        </View>
                      </View>
                      <MaterialIcons
                        name={expanded ? 'expand-less' : 'expand-more'}
                        size={22}
                        color={Colors.textMuted}
                      />
                    </View>
                    {expanded && (
                      <View style={styles.poseBody}>
                        <View style={styles.fashionDivider} />
                        <Text style={styles.poseStepsLabel}>Step by Step</Text>
                        {pose.instructions.map((step, j) => (
                          <View key={j} style={styles.poseStep}>
                            <View style={styles.poseStepNum}>
                              <Text style={styles.poseStepNumText}>{j + 1}</Text>
                            </View>
                            <Text style={styles.poseStepText}>{step}</Text>
                          </View>
                        ))}
                        <View style={styles.poseTipBadge}>
                          <MaterialIcons name="tips-and-updates" size={14} color={Colors.warning} />
                          <Text style={styles.poseTipText}>{pose.tip}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {/* Lighting Tips */}
              <View style={styles.lightingCard}>
                <Text style={styles.lightingTitle}>💡 Lighting Cheat Sheet</Text>
                <View style={styles.lightingItems}>
                  {[
                    { icon: '🌅', title: 'Golden Hour', body: '30 min after sunrise / before sunset. Warm, cinematic, flattering.' },
                    { icon: '🌫️', title: 'Cloudy Day', body: 'Natural softbox — even, no harsh shadows. Perfect for portraits.' },
                    { icon: '🌃', title: 'Night / Neon', body: 'Use city lights as your source. Stand close to the light. High contrast drama.' },
                    { icon: '🪟', title: 'Window Light', body: 'Stand sideways to window. Soft fill from one direction. Studio-quality indoors.' },
                  ].map((l, i) => (
                    <View key={i} style={styles.lightingItem}>
                      <Text style={styles.lightingItemIcon}>{l.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lightingItemTitle}>{l.title}</Text>
                        <Text style={styles.lightingItemBody}>{l.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },
  tabContent: { gap: 0 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerBadge: {
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
  headerBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  tabItemActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: 12, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  tabLabelActive: { color: Colors.textInverse },

  // Studio Hero
  studioHero: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 130,
    ...Shadow.card,
  },
  studioBg: { ...StyleSheet.absoluteFillObject },
  studioOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    padding: Spacing.md,
    justifyContent: 'center',
  },
  studioHeroTag: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  studioHeroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 28,
  },

  // Upload
  uploadArea: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  uploadTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  uploadSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  uploadBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  uploadBtnSecondary: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  uploadBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  // Photo Preview
  photoPreviewSection: { paddingHorizontal: Spacing.md, gap: Spacing.md, marginBottom: Spacing.md },
  photoPreviewWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 260,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.card,
  },
  photoPreview: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptSection: { gap: 8 },
  promptLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  promptInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 20,
  },

  focusChips: { gap: Spacing.sm, paddingVertical: 4 },
  focusChip: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  focusChipText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },

  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    ...Shadow.gold,
  },
  analyzeBtnDisabled: { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  analyzeBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textInverse },

  feedbackCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dtAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dtAvatarText: { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.primary },
  feedbackFrom: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  feedbackRole: { fontSize: FontSize.xs, color: Colors.primary },
  feedbackText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  newPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  newPhotoBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  // Quick Tips Grid
  tipsSection: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  tipsGrid: { gap: Spacing.sm },
  tipCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 5,
  },
  tipIcon: { fontSize: 20 },
  tipTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tipText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Intro
  sectionIntro: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Fashion Cards
  fashionCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  fashionCardExpanded: { borderColor: 'rgba(255,215,0,0.25)' },
  fashionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fashionEmoji: { fontSize: 28 },
  fashionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  fashionDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  fashionBody: { marginTop: Spacing.md, gap: Spacing.sm },
  fashionDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginBottom: 4 },
  fashionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  fashionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  fashionItemText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, flex: 1 },
  fashionVibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: 4,
  },
  fashionVibeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium, flex: 1 },

  // Palette
  paletteCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  paletteTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  paletteSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: 4 },
  paletteChip: { alignItems: 'center', gap: 6 },
  paletteCircle: { width: 40, height: 40, borderRadius: 20 },
  paletteLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  // Pose Cards
  poseCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  poseCardExpanded: { borderColor: 'rgba(255,215,0,0.25)' },
  poseCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  poseEmoji: { fontSize: 28 },
  poseName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  poseTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.infoDim,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  poseTypeText: { fontSize: 10, color: Colors.info, fontWeight: FontWeight.semibold },
  poseBody: { marginTop: Spacing.md, gap: Spacing.sm },
  poseStepsLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 4 },
  poseStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  poseStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  poseStepNumText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary },
  poseStepText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, flex: 1 },
  poseTipBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warningDim,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: 4,
  },
  poseTipText: { fontSize: FontSize.xs, color: Colors.warning, flex: 1, lineHeight: 18 },

  // Lighting
  lightingCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  lightingTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  lightingItems: { gap: Spacing.sm },
  lightingItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  lightingItemIcon: { fontSize: 24, marginTop: 2 },
  lightingItemTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 2 },
  lightingItemBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
