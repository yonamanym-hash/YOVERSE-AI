// Powered by OnSpace.AI
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { analyzePhotoWithAI } from '@/services/studioService';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

type StudioTab = 'advisor' | 'video' | 'fashion' | 'poses';

interface AIFeedback {
  text: string;
  category: 'editing' | 'style' | 'pose' | 'general';
}

interface WorkspaceItem {
  id: string;
  type: 'video' | 'image' | 'pose' | 'fashion';
  title: string;
  description: string;
  timestamp: Date;
  status: 'completed' | 'processing' | 'queued';
  thumbnail?: string;
  duration?: string;
  resolution?: string;
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

const VIDEO_DURATIONS = [
  { label: '5s', value: 5 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
];

const ASPECT_RATIOS = [
  { label: '16:9', value: '16:9', icon: 'crop-landscape', desc: 'Landscape' },
  { label: '9:16', value: '9:16', icon: 'crop-portrait', desc: 'Portrait' },
  { label: '1:1', value: '1:1', icon: 'crop-square', desc: 'Square' },
  { label: '4:3', value: '4:3', icon: 'crop-din', desc: 'Standard' },
];

const VIDEO_STYLES = [
  { label: 'Cinematic', emoji: '🎬', desc: 'Film-like quality with dramatic lighting' },
  { label: 'Documentary', emoji: '📽️', desc: 'Natural and authentic storytelling' },
  { label: 'Social', emoji: '📱', desc: 'Optimized for TikTok & Reels' },
  { label: 'Commercial', emoji: '💼', desc: 'Professional brand content' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const [activeTab, setActiveTab] = useState<StudioTab>('video');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [expandedFashion, setExpandedFashion] = useState<number | null>(0);
  const [expandedPose, setExpandedPose] = useState<number | null>(null);

  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedAspect, setSelectedAspect] = useState('16:9');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Workspace History (chronological stacking - only add, no delete)
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([
    {
      id: '1',
      type: 'video',
      title: 'Brand Introduction',
      description: 'AI-generated brand intro video with cinematic style',
      timestamp: new Date(Date.now() - 3600000),
      status: 'completed',
      duration: '30s',
      resolution: '16:9',
    },
    {
      id: '2',
      type: 'image',
      title: 'Fashion Pose Analysis',
      description: 'Power Walk pose feedback from AI Advisor',
      timestamp: new Date(Date.now() - 7200000),
      status: 'completed',
    },
  ]);

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
      
      // Add to workspace history (chronological stacking)
      const newItem: WorkspaceItem = {
        id: Date.now().toString(),
        type: 'image',
        title: 'Photo Analysis',
        description: customPrompt.trim() || 'AI style and pose feedback',
        timestamp: new Date(),
        status: 'completed',
      };
      setWorkspaceItems(prev => [newItem, ...prev]);
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

  const generateVideo = useCallback(async () => {
    if (!videoPrompt.trim()) {
      Alert.alert('Enter a prompt', 'Please describe the video you want to generate.');
      return;
    }
    
    setIsGeneratingVideo(true);
    setGenerationProgress(0);
    
    // Simulate video generation progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    // Simulate generation time based on duration
    const genTime = Math.min(selectedDuration / 10, 8) * 1000;
    
    setTimeout(() => {
      clearInterval(interval);
      setGenerationProgress(100);
      
      // Add to workspace history (chronological stacking - only add, no delete)
      const newItem: WorkspaceItem = {
        id: Date.now().toString(),
        type: 'video',
        title: videoPrompt.slice(0, 40) + (videoPrompt.length > 40 ? '...' : ''),
        description: `${selectedStyle} style, ${selectedAspect} aspect ratio`,
        timestamp: new Date(),
        status: 'completed',
        duration: VIDEO_DURATIONS.find(d => d.value === selectedDuration)?.label,
        resolution: selectedAspect,
      };
      setWorkspaceItems(prev => [newItem, ...prev]);
      
      setTimeout(() => {
        setIsGeneratingVideo(false);
        setGenerationProgress(0);
        setVideoPrompt('');
        Alert.alert('Video Generated', 'Your AI video has been added to the workspace.');
      }, 500);
    }, genTime);
  }, [videoPrompt, selectedDuration, selectedAspect, selectedStyle]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Studio</Text>
          <Text style={styles.headerSub}>Video · Style · Poses · AI</Text>
        </View>
        <View style={styles.headerBadge}>
          <View style={styles.headerBadgePulse} />
          <MaterialIcons name="auto-awesome" size={14} color={Colors.primary} />
          <Text style={styles.headerBadgeText}>AI Ecosystem</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { key: 'video', label: 'Video', icon: 'videocam' },
          { key: 'advisor', label: 'Advisor', icon: 'camera-alt' },
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
          {/* ── VIDEO TAB ── */}
          {activeTab === 'video' && (
            <View style={styles.tabContent}>
              {/* Video Hero */}
              <View style={styles.videoHero}>
                <View style={styles.videoHeroGradient}>
                  <View style={styles.videoHeroIcon}>
                    <MaterialIcons name="videocam" size={32} color={Colors.primary} />
                  </View>
                  <Text style={styles.videoHeroTag}>AI VIDEO GENERATOR</Text>
                  <Text style={styles.videoHeroTitle}>Create stunning videos{'\n'}with AI power</Text>
                  <View style={styles.videoHeroStats}>
                    <View style={styles.videoHeroStat}>
                      <Text style={styles.videoHeroStatNum}>{workspaceItems.filter(i => i.type === 'video').length}</Text>
                      <Text style={styles.videoHeroStatLabel}>Videos</Text>
                    </View>
                    <View style={styles.videoHeroStatDivider} />
                    <View style={styles.videoHeroStat}>
                      <Text style={styles.videoHeroStatNum}>10m</Text>
                      <Text style={styles.videoHeroStatLabel}>Max Length</Text>
                    </View>
                    <View style={styles.videoHeroStatDivider} />
                    <View style={styles.videoHeroStat}>
                      <Text style={styles.videoHeroStatNum}>4K</Text>
                      <Text style={styles.videoHeroStatLabel}>Quality</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Video Prompt Input */}
              <View style={styles.videoInputCard}>
                <View style={styles.videoInputHeader}>
                  <MaterialIcons name="edit" size={18} color={Colors.primary} />
                  <Text style={styles.videoInputTitle}>Describe Your Video</Text>
                </View>
                <TextInput
                  style={styles.videoPromptInput}
                  value={videoPrompt}
                  onChangeText={setVideoPrompt}
                  placeholder="A cinematic drone shot over a golden wheat field at sunset, with dramatic lighting and slow motion..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={500}
                />
                <Text style={styles.videoPromptCount}>{videoPrompt.length}/500</Text>
              </View>

              {/* Duration Selection */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsHeader}>
                  <MaterialIcons name="timer" size={18} color={Colors.primary} />
                  <Text style={styles.settingsTitle}>Duration</Text>
                </View>
                <View style={styles.durationRow}>
                  {VIDEO_DURATIONS.map((d) => (
                    <Pressable
                      key={d.value}
                      onPress={() => setSelectedDuration(d.value)}
                      style={[
                        styles.durationChip,
                        selectedDuration === d.value && styles.durationChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.durationChipText,
                        selectedDuration === d.value && styles.durationChipTextActive,
                      ]}>
                        {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Aspect Ratio Selection */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsHeader}>
                  <MaterialIcons name="aspect-ratio" size={18} color={Colors.primary} />
                  <Text style={styles.settingsTitle}>Aspect Ratio</Text>
                </View>
                <View style={styles.aspectRow}>
                  {ASPECT_RATIOS.map((a) => (
                    <Pressable
                      key={a.value}
                      onPress={() => setSelectedAspect(a.value)}
                      style={[
                        styles.aspectCard,
                        selectedAspect === a.value && styles.aspectCardActive,
                      ]}
                    >
                      <MaterialIcons
                        name={a.icon as any}
                        size={24}
                        color={selectedAspect === a.value ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[
                        styles.aspectLabel,
                        selectedAspect === a.value && styles.aspectLabelActive,
                      ]}>
                        {a.label}
                      </Text>
                      <Text style={styles.aspectDesc}>{a.desc}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Video Style Selection */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsHeader}>
                  <MaterialIcons name="palette" size={18} color={Colors.primary} />
                  <Text style={styles.settingsTitle}>Style</Text>
                </View>
                <View style={styles.styleRow}>
                  {VIDEO_STYLES.map((s) => (
                    <Pressable
                      key={s.label}
                      onPress={() => setSelectedStyle(s.label)}
                      style={[
                        styles.styleCard,
                        selectedStyle === s.label && styles.styleCardActive,
                      ]}
                    >
                      <Text style={styles.styleEmoji}>{s.emoji}</Text>
                      <Text style={[
                        styles.styleLabel,
                        selectedStyle === s.label && styles.styleLabelActive,
                      ]}>
                        {s.label}
                      </Text>
                      <Text style={styles.styleDesc}>{s.desc}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Generate Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.generateBtn,
                  isGeneratingVideo && styles.generateBtnDisabled,
                  pressed && !isGeneratingVideo && { transform: [{ scale: 0.98 }] },
                ]}
                onPress={generateVideo}
                disabled={isGeneratingVideo}
              >
                {isGeneratingVideo ? (
                  <View style={styles.generateBtnContent}>
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                    <Text style={styles.generateBtnText}>
                      Generating... {Math.round(generationProgress)}%
                    </Text>
                  </View>
                ) : (
                  <View style={styles.generateBtnContent}>
                    <MaterialIcons name="auto-awesome" size={20} color={Colors.textInverse} />
                    <Text style={styles.generateBtnText}>Generate Video</Text>
                  </View>
                )}
                {isGeneratingVideo && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${generationProgress}%` }]} />
                  </View>
                )}
              </Pressable>

              {/* Processing Timeline */}
              {isGeneratingVideo && (
                <View style={styles.timelineCard}>
                  <Text style={styles.timelineTitle}>Processing Timeline</Text>
                  <View style={styles.timelineSteps}>
                    {[
                      { label: 'Analyzing prompt', done: generationProgress > 10 },
                      { label: 'Generating frames', done: generationProgress > 40 },
                      { label: 'Applying style', done: generationProgress > 70 },
                      { label: 'Rendering video', done: generationProgress > 90 },
                    ].map((step, i) => (
                      <View key={i} style={styles.timelineStep}>
                        <View style={[styles.timelineStepDot, step.done && styles.timelineStepDotDone]}>
                          {step.done && <MaterialIcons name="check" size={12} color={Colors.textInverse} />}
                        </View>
                        <Text style={[styles.timelineStepText, step.done && styles.timelineStepTextDone]}>
                          {step.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Workspace History Section */}
              <View style={styles.workspaceSection}>
                <View style={styles.workspaceHeader}>
                  <MaterialIcons name="history" size={18} color={Colors.primary} />
                  <Text style={styles.workspaceTitle}>Workspace History</Text>
                  <View style={styles.workspaceBadge}>
                    <Text style={styles.workspaceBadgeText}>{workspaceItems.length} items</Text>
                  </View>
                </View>
                <Text style={styles.workspaceSub}>
                  All your generated content stacks here chronologically
                </Text>
                
                {workspaceItems.map((item) => (
                  <View key={item.id} style={styles.workspaceItem}>
                    <View style={[
                      styles.workspaceItemIcon,
                      item.type === 'video' && styles.workspaceItemIconVideo,
                    ]}>
                      <MaterialIcons
                        name={item.type === 'video' ? 'videocam' : item.type === 'image' ? 'image' : 'style'}
                        size={20}
                        color={item.type === 'video' ? Colors.info : Colors.primary}
                      />
                    </View>
                    <View style={styles.workspaceItemContent}>
                      <Text style={styles.workspaceItemTitle}>{item.title}</Text>
                      <Text style={styles.workspaceItemDesc}>{item.description}</Text>
                      <View style={styles.workspaceItemMeta}>
                        <Text style={styles.workspaceItemTime}>{formatTimestamp(item.timestamp)}</Text>
                        {item.duration && (
                          <View style={styles.workspaceItemTag}>
                            <Text style={styles.workspaceItemTagText}>{item.duration}</Text>
                          </View>
                        )}
                        {item.resolution && (
                          <View style={styles.workspaceItemTag}>
                            <Text style={styles.workspaceItemTagText}>{item.resolution}</Text>
                          </View>
                        )}
                        <View style={[
                          styles.workspaceItemStatus,
                          item.status === 'completed' && styles.workspaceItemStatusDone,
                        ]}>
                          <MaterialIcons
                            name={item.status === 'completed' ? 'check-circle' : 'hourglass-empty'}
                            size={12}
                            color={item.status === 'completed' ? Colors.success : Colors.warning}
                          />
                          <Text style={[
                            styles.workspaceItemStatusText,
                            item.status === 'completed' && styles.workspaceItemStatusTextDone,
                          ]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

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
                Yonas&apos;s personal style guide — Modern Luxury Edition. These aren&apos;t just outfits. They&apos;re your brand.
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
                <Text style={styles.paletteTitle}>Your Signature Color Palette</Text>
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
                Six signature poses for every setting. Master these and you&apos;ll never have a bad photo again.
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
                <Text style={styles.lightingTitle}>Lighting Cheat Sheet</Text>
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
    borderColor: 'rgba(255,215,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    position: 'relative',
  },
  headerBadgePulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
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
    gap: 4,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  tabItemActive: { 
    backgroundColor: Colors.primary,
    ...Shadow.gold,
  },
  tabLabel: { fontSize: 11, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  tabLabelActive: { color: Colors.textInverse },

  // ── Video Tab Styles ──
  videoHero: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  videoHeroGradient: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  videoHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.infoDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  videoHeroTag: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.info,
    letterSpacing: 2,
  },
  videoHeroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },
  videoHeroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  videoHeroStat: { alignItems: 'center' },
  videoHeroStatNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  videoHeroStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  videoHeroStatDivider: { width: 1, height: 30, backgroundColor: Colors.surfaceBorder },

  videoInputCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  videoInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  videoInputTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  videoPromptInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  videoPromptCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
  },

  settingsCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  durationChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  durationChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  durationChipTextActive: { color: Colors.primary },

  aspectRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aspectCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    gap: 4,
  },
  aspectCardActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  aspectLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
  aspectLabelActive: { color: Colors.primary },
  aspectDesc: { fontSize: 9, color: Colors.textMuted },

  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  styleCard: {
    width: (width - Spacing.md * 2 - Spacing.md - Spacing.sm) / 2,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    gap: 4,
  },
  styleCardActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  styleEmoji: { fontSize: 24 },
  styleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
  styleLabelActive: { color: Colors.primary },
  styleDesc: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  generateBtn: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    overflow: 'hidden',
    ...Shadow.gold,
  },
  generateBtnDisabled: {
    backgroundColor: Colors.info,
    shadowOpacity: 0,
  },
  generateBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  generateBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textInverse },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
  },

  timelineCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.infoDim,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  timelineTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  timelineSteps: { gap: Spacing.sm },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timelineStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStepDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineStepText: { fontSize: FontSize.sm, color: Colors.textMuted },
  timelineStepTextDone: { color: Colors.textPrimary },

  // ── Workspace History ──
  workspaceSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  workspaceTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  workspaceBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  workspaceBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  workspaceSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  workspaceItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceItemIconVideo: {
    backgroundColor: Colors.infoDim,
  },
  workspaceItemContent: { flex: 1, gap: 4 },
  workspaceItemTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  workspaceItemDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  workspaceItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  workspaceItemTime: { fontSize: 10, color: Colors.textMuted },
  workspaceItemTag: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  workspaceItemTagText: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  workspaceItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workspaceItemStatusDone: {},
  workspaceItemStatusText: { fontSize: 10, color: Colors.warning, textTransform: 'capitalize' },
  workspaceItemStatusTextDone: { color: Colors.success },

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
    ...Shadow.gold,
  },
  uploadBtnSecondary: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowOpacity: 0,
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
