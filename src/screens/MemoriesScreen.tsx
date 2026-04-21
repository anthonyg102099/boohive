import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Video, ResizeMode } from "expo-av";

import { MemoryItem } from "../domain/archiveTypes";
import { formatCount, formatShortDate } from "../utils/format";
import { theme } from "../theme";

type MemoriesScreenProps = {
  memories: MemoryItem[];
  onOpenMemory: (items: MemoryItem[], index: number) => void;
};

type FilterKey = "all" | "photos" | "videos" | "overlay";

type MemorySection = {
  title: string;
  data: IndexedMemoryItem[];
};

type IndexedMemoryItem = MemoryItem & {
  position: number;
};

export function MemoriesScreen({ memories, onOpenMemory }: MemoriesScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const visibleMemories = useMemo<IndexedMemoryItem[]>(() => {
    let next = memories;

    if (filter === "photos") {
      next = next.filter((item) => !item.isVideo);
    } else if (filter === "videos") {
      next = next.filter((item) => item.isVideo);
    } else if (filter === "overlay") {
      next = next.filter((item) => item.hasOverlay);
    }

    const search = query.trim().toLowerCase();
    if (search) {
      next = next.filter((item) => {
        const haystack = [
          item.id,
          item.date?.toISOString() ?? "",
          String(item.metadata?.Location ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    return next.map((item, position) => ({ ...item, position }));
  }, [filter, memories, query]);

  const plainVisibleMemories = useMemo(
    () => visibleMemories.map(({ position, ...item }) => item),
    [visibleMemories]
  );

  const sections = useMemo<MemorySection[]>(() => {
    const grouped = new Map<string, IndexedMemoryItem[]>();
    const undated: IndexedMemoryItem[] = [];

    for (const item of visibleMemories) {
      if (!item.date) {
        undated.push(item);
        continue;
      }

      const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`;
      const existing = grouped.get(key) ?? [];
      existing.push(item);
      grouped.set(key, existing);
    }

    const result: MemorySection[] = Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => {
        const [year, month] = key.split("-");
        const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
          month: "long",
        });

        return {
          title: `${monthLabel} ${year}`,
          data: items,
        };
      });

    if (undated.length) {
      result.push({
        title: "Undated",
        data: undated,
      });
    }

    return result;
  }, [visibleMemories]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Memories</Text>
          <Text style={styles.title}>{formatCount(visibleMemories.length)} items</Text>
        </View>
        <Text style={styles.subtle}>Tap any card to open the full-screen viewer.</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by date, ID, or location"
        placeholderTextColor={theme.colors.textDim}
        style={styles.search}
      />

      <View style={styles.pills}>
        <FilterPill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
        <FilterPill label="Photos" active={filter === "photos"} onPress={() => setFilter("photos")} />
        <FilterPill label="Videos" active={filter === "videos"} onPress={() => setFilter("videos")} />
        <FilterPill label="Overlay" active={filter === "overlay"} onPress={() => setFilter("overlay")} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => onOpenMemory(plainVisibleMemories, item.position)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.mediaWrap}>
                {item.isVideo ? (
                  <Video
                    source={{ uri: item.baseUri ?? undefined }}
                    style={styles.media}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                    useNativeControls={false}
                  />
                ) : (
                  <LoadedImage uri={item.baseUri} />
                )}

                {item.hasOverlay ? <View style={styles.overlayBadge}><Text style={styles.overlayText}>Overlay</Text></View> : null}
                {item.isVideo ? <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>Video</Text></View> : null}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.isVideo ? "Video" : "Photo"}</Text>
                <Text style={styles.cardMeta}>{formatShortDate(item.date)}</Text>
                <Text style={styles.cardMetaSecondary} numberOfLines={1}>
                  {String(item.metadata?.Location ?? "No location")}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No memories found</Text>
            <Text style={styles.emptyCopy}>Try another filter or search term.</Text>
          </View>
        }
        renderSectionFooter={() => <View style={{ height: 14 }} />}
      />
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, pressed && styles.filterPressed]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LoadedImage({ uri }: { uri?: string | null }) {
  if (!uri) {
    return (
      <View style={[styles.media, styles.mediaMissing]}>
        <Text style={styles.missingText}>Missing media</Text>
      </View>
    );
  }

  return <Image source={{ uri }} resizeMode="cover" style={styles.media} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  header: {
    gap: 8,
  },
  kicker: {
    color: theme.colors.yellow,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  search: {
    backgroundColor: theme.colors.elevated,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPressed: {
    opacity: 0.9,
  },
  filterPillActive: {
    backgroundColor: theme.colors.yellowSoft,
    borderColor: theme.colors.yellow,
  },
  filterText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  filterTextActive: {
    color: theme.colors.yellow,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  sectionCount: {
    color: theme.colors.textDim,
    fontFamily: "monospace",
    fontSize: 11,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.96,
  },
  mediaWrap: {
    aspectRatio: 9 / 16,
    backgroundColor: "#000",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaMissing: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.elevated,
  },
  missingText: {
    color: theme.colors.textMuted,
  },
  overlayBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overlayText: {
    color: theme.colors.yellow,
    fontSize: 11,
    fontWeight: "700",
  },
  typeBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  cardMetaSecondary: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
  emptyState: {
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyCopy: {
    color: theme.colors.textMuted,
  },
});
