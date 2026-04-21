import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type StatPillProps = {
  label: string;
  value: string;
};

export function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  value: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
