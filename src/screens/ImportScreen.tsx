import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StatPill } from "../components/StatPill";
import { ArchiveSummary } from "../domain/archiveTypes";
import { theme } from "../theme";

type ImportScreenProps = {
  summary?: ArchiveSummary | null;
  loading: boolean;
  progressText: string;
  progressValue: number;
  onImport: () => void;
};

export function ImportScreen({
  summary,
  loading,
  progressText,
  progressValue,
  onImport,
}: ImportScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Offline Snapchat archive reader</Text>
        <Text style={styles.title}>Snap Archive Viewer</Text>
        <Text style={styles.copy}>
          Import your Snapchat export ZIP, parse it locally, and browse memories, chats,
          history, profile changes, and friends without sending data anywhere.
        </Text>

        <Pressable onPress={onImport} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>{loading ? "Importing..." : "Choose ZIP export"}</Text>
        </Pressable>

        <Text style={styles.note}>
          The React Native version uses a ZIP-based import flow so it works on web, Android,
          and iOS without browser-only folder picking.
        </Text>
      </View>

      {loading ? (
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>{progressText}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progressValue, 100)}%` }]} />
          </View>
          <Text style={styles.progressMeta}>{Math.round(progressValue)}%</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What the app reads</Text>
        <View style={styles.grid}>
          <StatPill label="Memories" value="Photos + videos" />
          <StatPill label="Chats" value="Conversation threads" />
          <StatPill label="Records" value="Friends / profile / login" />
          <StatPill label="Privacy" value="Local only" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setup reminder</Text>
        <Text style={styles.bullet}>1. Export Snapchat data from Settings &gt; My Data.</Text>
        <Text style={styles.bullet}>2. Include memories, chats, snaps, search, profile, and friends.</Text>
        <Text style={styles.bullet}>3. Download the ZIP and import it here.</Text>
      </View>

      {summary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current archive</Text>
          <View style={styles.summaryRow}>
            <StatPill label="Memories" value={String(summary.memories)} />
            <StatPill label="Conversations" value={String(summary.conversations)} />
            <StatPill label="Friends" value={String(summary.friends)} />
            <StatPill label="Snaps" value={String(summary.snaps)} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 20,
    gap: 18,
  },
  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  kicker: {
    color: theme.colors.yellow,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.yellow,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  ctaPressed: {
    transform: [{ translateY: -1 }],
    opacity: 0.95,
  },
  ctaText: {
    color: theme.colors.black,
    fontWeight: "800",
    fontSize: 15,
  },
  note: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
  progressCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  progressLabel: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#26262c",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.yellow,
  },
  progressMeta: {
    color: theme.colors.textMuted,
    fontFamily: "monospace",
    fontSize: 12,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bullet: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
