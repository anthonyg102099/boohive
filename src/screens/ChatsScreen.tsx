import React, { useMemo, useState } from "react";
import {
  Image,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";

import { Conversation } from "../domain/archiveTypes";
import { initials, formatLongDate } from "../utils/format";
import { theme } from "../theme";

type ChatsScreenProps = {
  conversations: Conversation[];
};

export function ChatsScreen({ conversations }: ChatsScreenProps) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return conversations;
    }

    return conversations.filter((conversation) => conversation.name.toLowerCase().includes(search));
  }, [conversations, query]);

  const selectedConversation = filtered[selectedIndex] ?? filtered[0];
  const wideLayout = width >= 900;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Chats</Text>
          <Text style={styles.title}>{filtered.length.toLocaleString()} conversations</Text>
        </View>
        <Text style={styles.subtle}>The thread list and detail view adapt to smaller screens.</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search conversations"
        placeholderTextColor={theme.colors.textDim}
        style={styles.search}
      />

      <View style={[styles.shell, wideLayout ? styles.shellWide : styles.shellStacked]}>
        <View style={[styles.listPanel, !wideLayout && styles.listPanelFull]}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.name}
            renderItem={({ item, index }) => {
              const active = item.name === selectedConversation?.name;
              return (
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  style={({ pressed }) => [
                    styles.conversationItem,
                    active && styles.conversationItemActive,
                    pressed && styles.conversationItemPressed,
                  ]}
                >
                  <View style={[styles.avatar, active && styles.avatarActive]}>
                    <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                      {initials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.conversationText}>
                    <Text style={[styles.conversationName, active && styles.conversationNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.conversationMeta}>
                      {item.messages.length.toLocaleString()} messages
                      {item.isGroup ? " · group" : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={[styles.threadPanel, !wideLayout && styles.threadPanelFull]}>
          {selectedConversation ? (
            <>
              <View style={styles.threadHeader}>
                <View style={[styles.avatar, styles.threadAvatar]}>
                  <Text style={styles.avatarText}>{initials(selectedConversation.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.threadName}>{selectedConversation.name}</Text>
                  <Text style={styles.threadMeta}>
                    {selectedConversation.messages.length.toLocaleString()} messages
                  </Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.threadScroll}>
                {selectedConversation.messages.map((message, index) => {
                  const created = message.created ? new Date(message.created.replace(" UTC", "Z")) : null;
                  const sender = message.sender || "Unknown sender";
                  const isSent = message.isSender;
                  const newDate =
                    index === 0 ||
                    (selectedConversation.messages[index - 1]?.created ?? "") !== message.created;

                  return (
                    <View key={`${message.created}-${index}`}>
                      {newDate && created ? (
                        <View style={styles.dateDivider}>
                          <Text style={styles.dateDividerText}>{formatLongDate(created)}</Text>
                        </View>
                      ) : null}

                      <View style={[styles.messageGroup, isSent ? styles.messageGroupSent : styles.messageGroupReceived]}>
                        {!isSent && sender ? <Text style={styles.senderLabel}>{sender}</Text> : null}

                        <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
                          <Text style={[styles.messageText, isSent && styles.messageTextSent]}>
                            {message.content || message.mediaType || "Snap (no preview)"}
                          </Text>

                          {message.attachments.length ? (
                            <View style={styles.attachments}>
                              {message.attachments.slice(0, 3).map((attachment) => (
                                <View key={attachment.id} style={styles.attachment}>
                                  {attachment.isVideo ? (
                                    <Video
                                      source={{ uri: attachment.uri }}
                                      style={styles.attachmentMedia}
                                      resizeMode={ResizeMode.COVER}
                                      shouldPlay={false}
                                      isMuted
                                      useNativeControls={false}
                                    />
                                  ) : (
                                    <LoadedImage uri={attachment.uri} />
                                  )}
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.metaLine}>
                          {message.created ? String(message.created).slice(11, 16) : ""}
                          {message.mediaType && message.mediaType !== "TEXT" ? ` · ${message.mediaType}` : ""}
                          {message.isSaved ? " · SAVED" : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyThread}>
              <Text style={styles.emptyTitle}>No conversation selected</Text>
              <Text style={styles.emptyCopy}>Pick a thread from the list on the left.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function LoadedImage({ uri }: { uri: string }) {
  return <Image source={{ uri }} resizeMode="cover" style={styles.attachmentMedia} />;
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
  shell: {
    flex: 1,
    gap: 12,
  },
  shellWide: {
    flexDirection: "row",
  },
  shellStacked: {
    flexDirection: "column",
  },
  listPanel: {
    width: 300,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  listPanelFull: {
    width: "100%",
    maxHeight: 260,
  },
  threadPanel: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  threadPanelFull: {
    minHeight: 360,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  conversationItemPressed: {
    opacity: 0.92,
  },
  conversationItemActive: {
    backgroundColor: theme.colors.yellowSoft,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    backgroundColor: "rgba(255,252,0,0.2)",
    borderColor: "rgba(255,252,0,0.35)",
  },
  avatarText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  avatarTextActive: {
    color: theme.colors.yellow,
  },
  conversationText: {
    flex: 1,
  },
  conversationName: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  conversationNameActive: {
    color: theme.colors.yellow,
  },
  conversationMeta: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  threadAvatar: {
    width: 36,
    height: 36,
  },
  threadName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  threadMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  threadScroll: {
    padding: 16,
    gap: 8,
  },
  dateDivider: {
    alignItems: "center",
    marginVertical: 8,
  },
  dateDividerText: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 0.4,
  },
  messageGroup: {
    gap: 4,
  },
  messageGroupSent: {
    alignItems: "flex-end",
  },
  messageGroupReceived: {
    alignItems: "flex-start",
  },
  senderLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubbleSent: {
    backgroundColor: theme.colors.yellow,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  messageTextSent: {
    color: theme.colors.black,
  },
  attachments: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  attachment: {
    width: 70,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  attachmentMedia: {
    width: "100%",
    height: "100%",
  },
  metaLine: {
    color: theme.colors.textDim,
    fontSize: 11,
    paddingHorizontal: 6,
  },
  emptyThread: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: 20,
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
