import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export type TabKey = "import" | "memories" | "chats" | "records";

type TabBarProps = {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  compact?: boolean;
};

const tabs: Array<{ key: TabKey; label: string; badge: string }> = [
  { key: "import", label: "Import", badge: "01" },
  { key: "memories", label: "Memories", badge: "02" },
  { key: "chats", label: "Chats", badge: "03" },
  { key: "records", label: "Records", badge: "04" },
];

export function TabBar({ activeTab, onChangeTab, compact }: TabBarProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChangeTab(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.badge, active && styles.badgeActive]}>{tab.badge}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  wrapCompact: {
    justifyContent: "space-between",
  },
  tab: {
    minWidth: 92,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabPressed: {
    opacity: 0.9,
    transform: [{ translateY: -1 }],
  },
  tabActive: {
    backgroundColor: theme.colors.yellowSoft,
    borderColor: theme.colors.yellow,
  },
  badge: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontFamily: "monospace",
  },
  badgeActive: {
    color: theme.colors.yellow,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: theme.colors.yellow,
  },
});
