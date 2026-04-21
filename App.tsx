import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { TabBar, TabKey } from "./src/components/TabBar";
import { StatPill } from "./src/components/StatPill";
import { MemoryLightbox } from "./src/components/MemoryLightbox";
import { ArchiveData, MemoryItem } from "./src/domain/archiveTypes";
import { importArchiveZip } from "./src/services/archiveImportService";
import { parseArchiveFiles } from "./src/services/archiveParser";
import { ChatsScreen } from "./src/screens/ChatsScreen";
import { ImportScreen } from "./src/screens/ImportScreen";
import { MemoriesScreen } from "./src/screens/MemoriesScreen";
import { RecordsScreen } from "./src/screens/RecordsScreen";
import { theme } from "./src/theme";

type RecordsTab = "friends" | "snaps" | "search" | "profile" | "login";

export default function App() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>("import");
  const [recordsTab, setRecordsTab] = useState<RecordsTab>("friends");
  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("Waiting for archive");
  const [progressValue, setProgressValue] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<MemoryItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  const isWide = width >= 1024;

  const handleImport = useCallback(async () => {
    try {
      setLoading(true);
      setProgressValue(1);
      setProgressText("Preparing archive picker");

      const files = await importArchiveZip((step, progress) => {
        setProgressText(step);
        setProgressValue(progress);
      });

      if (!files.length) {
        setLoading(false);
        setProgressText("Waiting for archive");
        setProgressValue(0);
        return;
      }

      setProgressText("Normalizing Snapchat data");
      setProgressValue(92);

      // Parsing is intentionally isolated from file extraction so it can be tested
      // and extended without touching the UI layer.
      const parsed = parseArchiveFiles(files);
      setArchive(parsed);
      setActiveTab("memories");
      setProgressText("Archive loaded");
      setProgressValue(100);
    } catch (error) {
      console.error(error);
      setProgressText(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const shellSummary = useMemo(() => archive?.summary ?? null, [archive]);

  const openViewer = useCallback((items: MemoryItem[], index: number) => {
    setLightboxItems(items);
    setLightboxIndex(Math.max(index, 0));
    setOverlayEnabled(true);
    setLightboxOpen(true);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* The background layers keep the app visually rich without relying on a single flat fill. */}
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.bgOrbThree} />

      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
          <View style={styles.brandBlock}>
            <View style={styles.brandDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>Snap Archive Viewer</Text>
              <Text style={styles.brandSub}>Crossplatform React Native archive browser</Text>
            </View>
          </View>

          {shellSummary ? (
            <View style={styles.statsRow}>
              <StatPill label="Memories" value={String(shellSummary.memories)} />
              <StatPill label="Chats" value={String(shellSummary.conversations)} />
              <StatPill label="Friends" value={String(shellSummary.friends)} />
              <StatPill label="Snaps" value={String(shellSummary.snaps)} />
            </View>
          ) : (
            <View style={styles.emptyStats}>
              <ActivityIndicator color={theme.colors.yellow} />
              <Text style={styles.emptyStatsText}>Import a ZIP to begin</Text>
            </View>
          )}

          <TabBar activeTab={activeTab} onChangeTab={setActiveTab} compact={!isWide} />

          <View style={styles.sidebarFooter}>
            <Pressable
              onPress={() => {
                setArchive(null);
                setActiveTab("import");
                setRecordsTab("friends");
                setLightboxOpen(false);
                setProgressText("Waiting for archive");
                setProgressValue(0);
              }}
              style={styles.footerAction}
            >
              <Text style={styles.footerActionText}>Open another archive</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {!archive || activeTab === "import" ? (
            <ImportScreen
              summary={archive?.summary ?? null}
              loading={loading}
              progressText={progressText}
              progressValue={progressValue}
              onImport={handleImport}
            />
          ) : null}

          {archive && activeTab === "memories" ? (
            <MemoriesScreen memories={archive.memories} onOpenMemory={openViewer} />
          ) : null}

          {archive && activeTab === "chats" ? (
            <ChatsScreen conversations={archive.conversations} />
          ) : null}

          {archive && activeTab === "records" ? (
            <RecordsScreen
              active={recordsTab}
              friends={archive.friends}
              snaps={archive.snaps}
              searchHistory={archive.searchHistory}
              profile={archive.profile}
              loginHistory={archive.loginHistory}
              onChangeActive={setRecordsTab}
            />
          ) : null}
        </View>
      </View>

      <MemoryLightbox
        visible={lightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        overlayEnabled={overlayEnabled}
        onToggleOverlay={() => setOverlayEnabled((value) => !value)}
        onClose={() => setLightboxOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bgOrbOne: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(255,252,0,0.08)",
  },
  bgOrbTwo: {
    position: "absolute",
    right: -100,
    top: 140,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(91,141,238,0.08)",
  },
  bgOrbThree: {
    position: "absolute",
    left: "35%",
    bottom: -90,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(78,205,196,0.06)",
  },
  shell: {
    flex: 1,
  },
  shellWide: {
    flexDirection: "row",
  },
  sidebar: {
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sidebarWide: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    borderBottomWidth: 0,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.yellow,
    shadowColor: theme.colors.yellow,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  brandSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyStats: {
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyStatsText: {
    color: theme.colors.textMuted,
  },
  sidebarFooter: {
    marginTop: "auto",
  },
  footerAction: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footerActionText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
