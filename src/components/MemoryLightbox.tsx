import React, { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";

import { MemoryItem } from "../domain/archiveTypes";
import { formatLongDate, formatLongTime, formatShortDate } from "../utils/format";
import { theme } from "../theme";

type MemoryLightboxProps = {
  visible: boolean;
  items: MemoryItem[];
  initialIndex: number;
  overlayEnabled: boolean;
  onToggleOverlay: () => void;
  onClose: () => void;
};

export function MemoryLightbox({
  visible,
  items,
  initialIndex,
  overlayEnabled,
  onToggleOverlay,
  onClose,
}: MemoryLightboxProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const slideWidth = isWideLayout(width) ? Math.min(Math.max(width * 0.6, 420), 760) : width;

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible || items.length === 0) {
    return null;
  }

  const current = items[index] ?? items[0];
  const isWide = width >= 900;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.shell, isWide && styles.shellWide]}>
          <View style={styles.viewer}>
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1} / {items.length}
              </Text>
            </View>

            <FlatList
              horizontal
              pagingEnabled
              data={items}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, itemIndex) => ({
                length: slideWidth,
                offset: slideWidth * itemIndex,
                index: itemIndex,
              })}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
                setIndex(nextIndex);
              }}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width: slideWidth }]}>
                  <MemorySlide item={item} overlayEnabled={overlayEnabled} />
                </View>
              )}
            />

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>{formatLongDate(current.date)}</Text>
            <Text style={styles.infoSub}>{formatLongTime(current.date)}</Text>
            <Text style={styles.infoChip}>{current.isVideo ? "Video" : "Image"}</Text>

            {current.metadata && typeof current.metadata.Location === "string" ? (
              <View style={styles.locationCard}>
                <Text style={styles.locationLabel}>Location</Text>
                <Text style={styles.locationValue}>
                  {String(current.metadata.Location).replace("Latitude, Longitude: ", "")}
                </Text>
                <Pressable
                  onPress={() => {
                    const location = String(current.metadata?.Location ?? "").replace(
                      "Latitude, Longitude: ",
                      ""
                    );
                    if (location) {
                      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(location)}`);
                    }
                  }}
                >
                  <Text style={styles.mapLink}>Open in Maps</Text>
                </Pressable>
              </View>
            ) : null}

            {current.hasOverlay ? (
              <Pressable onPress={onToggleOverlay} style={styles.overlayToggle}>
                <View style={[styles.switch, overlayEnabled && styles.switchOn]}>
                  <View style={[styles.knob, overlayEnabled && styles.knobOn]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Text & drawing overlay</Text>
                  <Text style={styles.toggleHint}>
                    Show or hide the Snapchat annotations baked into this memory.
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <View style={styles.shortcuts}>
              <Text style={styles.shortcutText}>Swipe to browse</Text>
              <Text style={styles.shortcutText}>Tap the overlay switch to toggle artwork</Text>
              <Text style={styles.shortcutText}>Use the background close button to exit</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MemorySlide({
  item,
  overlayEnabled,
}: {
  item: MemoryItem;
  overlayEnabled: boolean;
}) {
  const showOverlay = item.hasOverlay && overlayEnabled && item.overlayUri;

  return (
    <View style={styles.mediaWrap}>
      {item.isVideo ? (
        <Video
          style={styles.media}
          source={{ uri: item.baseUri ?? undefined }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay={Platform.OS !== "web"}
        />
      ) : (
        <Pressable style={styles.pressableMedia}>
          {/* Image backgrounds are intentionally plain here so the archive content stays readable. */}
          <View
            style={[
              styles.imageFrame,
              { backgroundColor: item.baseUri ? "transparent" : theme.colors.elevated },
            ]}
          >
            <Text style={styles.placeholder}>{item.baseUri ? "" : "Missing media"}</Text>
          </View>
        </Pressable>
      )}

      {item.baseUri && !item.isVideo ? (
        <View style={styles.absoluteImageHolder}>
          {/* The image is rendered absolutely so overlay artwork can sit directly on top. */}
          <Image source={{ uri: item.baseUri }} resizeMode="contain" style={styles.image} />
          {showOverlay ? (
            <Image source={{ uri: item.overlayUri ?? undefined }} resizeMode="contain" style={styles.overlayImage} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.caption}>
        <Text style={styles.captionTitle}>{item.isVideo ? "Video" : "Photo"}</Text>
        <Text style={styles.captionText}>{formatShortDate(item.date)}</Text>
      </View>
    </View>
  );
}

function isWideLayout(width: number): boolean {
  return width >= 900;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    padding: 12,
  },
  shell: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0b0b0c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  shellWide: {
    flexDirection: "row",
  },
  viewer: {
    flex: 1.4,
    minHeight: 360,
    justifyContent: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  mediaWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  media: {
    width: "100%",
    height: "80%",
    borderRadius: 20,
    backgroundColor: "#000",
  },
  pressableMedia: {
    width: "100%",
    height: "100%",
  },
  imageFrame: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  mediaImageLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mediaPressable: {
    flex: 1,
  },
  mediaHint: {
    color: theme.colors.yellow,
    alignSelf: "flex-start",
    padding: 10,
    fontWeight: "600",
  },
  absoluteImageHolder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlayImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  caption: {
    position: "absolute",
    left: 24,
    bottom: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  captionTitle: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  captionText: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  closeButton: {
    position: "absolute",
    right: 18,
    top: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  closeText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  counter: {
    position: "absolute",
    top: 18,
    left: 18,
    zIndex: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  counterText: {
    color: theme.colors.textMuted,
    fontFamily: "monospace",
    fontSize: 12,
  },
  infoPanel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    padding: 20,
    gap: 14,
  },
  infoTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  infoSub: {
    color: theme.colors.textMuted,
    fontFamily: "monospace",
    fontSize: 12,
  },
  infoChip: {
    alignSelf: "flex-start",
    color: theme.colors.yellow,
    backgroundColor: theme.colors.yellowSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  locationCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  locationLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  locationValue: {
    color: theme.colors.teal,
    fontFamily: "monospace",
  },
  mapLink: {
    color: theme.colors.yellow,
    fontWeight: "700",
  },
  overlayToggle: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  switchOn: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellow,
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.black,
  },
  toggleLabel: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  toggleHint: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  shortcuts: {
    marginTop: "auto",
    gap: 6,
  },
  shortcutText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  placeholder: {
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: "50%",
  },
});
