// Powered by OnSpace.AI
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';
import { Message } from '@/hooks/useChat';

interface Props {
  message: Message;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function StreamCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.Text style={[styles.cursor, { opacity }]}>▋</Animated.Text>;
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'code-inline'; content: string }
  | { type: 'code-block'; lang: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'bullet'; content: string; depth: number }
  | { type: 'numbered'; content: string; num: string }
  | { type: 'divider' };

function parseMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      segments.push({ type: 'code-block', lang, content: codeLines.join('\n') });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      segments.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      segments.push({ type: 'divider' });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
    if (bulletMatch) {
      const depth = Math.floor(bulletMatch[1].length / 2);
      segments.push({ type: 'bullet', content: bulletMatch[3], depth });
      i++;
      continue;
    }

    const numMatch = line.match(/^(\s*)(\d+[.)]\s+)(.+)/);
    if (numMatch) {
      segments.push({ type: 'numbered', content: numMatch[3], num: numMatch[2].trim() });
      i++;
      continue;
    }

    if (line.trim() === '') {
      segments.push({ type: 'text', content: '' });
      i++;
      continue;
    }

    segments.push({ type: 'text', content: line });
    i++;
  }

  return segments;
}

function InlineText({ content, style }: { content: string; style?: any }) {
  const parts: Array<{ bold?: boolean; code?: boolean; text: string }> = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ text: content.slice(lastIndex, match.index) });
    if (match[1] !== undefined) parts.push({ bold: true, text: match[1] });
    else if (match[2] !== undefined) parts.push({ code: true, text: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push({ text: content.slice(lastIndex) });

  return (
    <Text style={style}>
      {parts.map((p, idx) => {
        if (p.bold) return <Text key={idx} style={styles.bold}>{p.text}</Text>;
        if (p.code) return <Text key={idx} style={styles.inlineCode}>{p.text}</Text>;
        return <Text key={idx}>{p.text}</Text>;
      })}
    </Text>
  );
}

function MarkdownContent({ text, isUser }: { text: string; isUser: boolean }) {
  const segments = parseMarkdown(text);
  const textStyle = isUser ? styles.textUser : styles.textAI;

  return (
    <View>
      {segments.map((seg, idx) => {
        if (seg.type === 'code-block') {
          return (
            <View key={idx} style={styles.codeBlock}>
              {seg.lang ? <Text style={styles.codeLang}>{seg.lang}</Text> : null}
              <Text style={styles.codeBlockText} selectable>{seg.content}</Text>
            </View>
          );
        }
        if (seg.type === 'heading') {
          const headingStyle = seg.level === 1 ? styles.h1 : seg.level === 2 ? styles.h2 : styles.h3;
          return <InlineText key={idx} content={seg.content} style={[headingStyle, isUser && styles.textUser]} />;
        }
        if (seg.type === 'divider') return <View key={idx} style={styles.divider} />;
        if (seg.type === 'bullet') {
          return (
            <View key={idx} style={[styles.listRow, { marginLeft: seg.depth * 12 }]}>
              <Text style={[styles.bullet, textStyle]}>•</Text>
              <InlineText content={seg.content} style={[textStyle, styles.listText]} />
            </View>
          );
        }
        if (seg.type === 'numbered') {
          return (
            <View key={idx} style={styles.listRow}>
              <Text style={[styles.numLabel, textStyle]}>{seg.num}</Text>
              <InlineText content={seg.content} style={[textStyle, styles.listText]} />
            </View>
          );
        }
        if (seg.content === '') return <View key={idx} style={styles.lineBreak} />;
        return <InlineText key={idx} content={seg.content} style={[textStyle, styles.plainText]} />;
      })}
    </View>
  );
}

export const ChatBubble = React.memo(function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      {!isUser && (
        <View style={[styles.avatar, isStreaming && styles.avatarStreaming]}>
          <Text style={styles.avatarText}>DT</Text>
        </View>
      )}
      <View style={styles.bubbleWrap}>
        {/* Attached image preview */}
        {isUser && message.imageUri ? (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.attachedImage}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <MarkdownContent text={message.text} isUser={isUser} />
          {isStreaming && !isUser ? <StreamCursor /> : null}
          {!isStreaming && (
            <View style={styles.bubbleFooter}>
              <Text style={[styles.time, isUser && styles.timeUser]}>
                {formatTime(message.timestamp)}
              </Text>
              {!isUser && message.text.length > 0 && (
                <Pressable onPress={handleCopy} hitSlop={8} style={styles.copyBtn}>
                  <MaterialIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={12}
                    color={copied ? Colors.success : Colors.textMuted}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAI: { justifyContent: 'flex-start' },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarStreaming: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary },

  bubbleWrap: { maxWidth: '82%', gap: 4 },
  attachedImage: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  bubble: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 2,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderBottomLeftRadius: 4,
  },

  textUser: { color: Colors.textInverse },
  textAI: { color: Colors.textPrimary },
  plainText: { fontSize: FontSize.base, lineHeight: 24 },

  bold: { fontWeight: FontWeight.bold },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,215,0,0.12)',
    color: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: FontSize.sm,
  },

  h1: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 8, marginBottom: 4 },
  h2: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 6, marginBottom: 3 },
  h3: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.primary, marginTop: 4, marginBottom: 2 },

  codeBlock: {
    backgroundColor: '#0d1117',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  codeLang: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#e6edf3',
    lineHeight: 20,
  },

  listRow: { flexDirection: 'row', gap: 6, marginBottom: 3, alignItems: 'flex-start' },
  bullet: { fontSize: FontSize.base, lineHeight: 24, width: 14 },
  numLabel: { fontSize: FontSize.base, lineHeight: 24, minWidth: 22, fontWeight: FontWeight.semibold },
  listText: { flex: 1, fontSize: FontSize.base, lineHeight: 24 },

  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: 8 },
  lineBreak: { height: 6 },

  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  time: { fontSize: FontSize.xs, color: Colors.textMuted },
  timeUser: { color: 'rgba(0,0,0,0.45)' },
  copyBtn: { padding: 2 },

  cursor: { fontSize: FontSize.base, color: Colors.primary, lineHeight: 24 },
});
