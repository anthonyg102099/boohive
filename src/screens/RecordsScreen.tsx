import React from "react";
import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";

import {
  FriendRecord,
  LoginRecord,
  ProfileRecord,
  SearchRecord,
  SnapRecord,
} from "../domain/archiveTypes";
import { formatCount, initials } from "../utils/format";
import { theme } from "../theme";

type RecordsScreenProps = {
  active: "friends" | "snaps" | "search" | "profile" | "login";
  friends: FriendRecord[];
  snaps: SnapRecord[];
  searchHistory: SearchRecord[];
  profile: ProfileRecord | null;
  loginHistory: LoginRecord[];
  onChangeActive: (value: RecordsScreenProps["active"]) => void;
};

const tabs: Array<{
  key: RecordsScreenProps["active"];
  label: string;
}> = [
  { key: "friends", label: "Friends" },
  { key: "snaps", label: "Snap history" },
  { key: "search", label: "Search history" },
  { key: "profile", label: "Profile" },
  { key: "login", label: "Login history" },
];

export function RecordsScreen({
  active,
  friends,
  snaps,
  searchHistory,
  profile,
  loginHistory,
  onChangeActive,
}: RecordsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Records</Text>
        <Text style={styles.title}>Account history and supporting data</Text>
        <Text style={styles.subtle}>
          These views keep the same reading rules as the original HTML app, but each
          section is isolated so the UI stays easier to maintain.
        </Text>
      </View>

      <View style={styles.segmentRow}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChangeActive(tab.key)}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {active === "friends" ? <FriendsView friends={friends} /> : null}
      {active === "snaps" ? <SnapsView snaps={snaps} /> : null}
      {active === "search" ? <SearchView searchHistory={searchHistory} /> : null}
      {active === "profile" ? <ProfileView profile={profile} /> : null}
      {active === "login" ? <LoginView loginHistory={loginHistory} /> : null}
    </ScrollView>
  );
}

function FriendsView({ friends }: { friends: FriendRecord[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Friends</Text>
        <Text style={styles.panelMeta}>{formatCount(friends.length)}</Text>
      </View>

      {friends.length ? (
        <View style={styles.grid}>
          {friends.slice(0, 200).map((friend) => (
            <View key={`${friend.name}-${friend.since}`} style={styles.friendCard}>
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>{initials(friend.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.name}
                </Text>
                {friend.since ? <Text style={styles.friendSince}>{friend.since}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyText text="No friends found in the archive." />
      )}
    </View>
  );
}

function SnapsView({ snaps }: { snaps: SnapRecord[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Snap history</Text>
        <Text style={styles.panelMeta}>{formatCount(snaps.length)}</Text>
      </View>

      {snaps.length ? (
        <View style={styles.table}>
          {snaps.slice(0, 500).map((snap, index) => (
            <View key={`${snap.timestamp}-${index}`} style={styles.tableRow}>
              <Text style={[styles.typeBadge, snap.direction === "sent" ? styles.sent : styles.received]}>
                {snap.direction === "sent" ? "▲" : "▼"}
              </Text>
              <Text style={styles.tableCellWide}>{snap.sender}</Text>
              <Text style={styles.tableCell}>{snap.mediaType}</Text>
              <Text style={styles.tableCellMono}>{snap.timestamp}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyText text="No snap history found in the archive." />
      )}
    </View>
  );
}

function SearchView({ searchHistory }: { searchHistory: SearchRecord[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Search history</Text>
        <Text style={styles.panelMeta}>{formatCount(searchHistory.length)}</Text>
      </View>

      {searchHistory.length ? (
        <View style={styles.searchList}>
          {searchHistory.slice(0, 100).map((item, index) => (
            <View key={`${item.term}-${index}`} style={styles.searchRow}>
              <Text style={styles.searchTerm}>{item.term}</Text>
              <Text style={styles.searchDate}>{item.timestamp}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyText text="No search history found." />
      )}
    </View>
  );
}

function ProfileView({ profile }: { profile: ProfileRecord | null }) {
  if (!profile || !Object.keys(profile).length) {
    return (
      <View style={styles.panel}>
        <EmptyText text="No profile data found in the archive." />
      </View>
    );
  }

  const hasGroupedData = Object.values(profile).some((value) => Array.isArray(value));

  if (!hasGroupedData) {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Profile</Text>
        </View>
        {Object.entries(profile).map(([key, value]) => (
          <View key={key} style={styles.kvRow}>
            <Text style={styles.kvKey}>{key}</Text>
            <Text style={styles.kvValue}>{typeof value === "object" ? JSON.stringify(value) : String(value)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Profile</Text>
      </View>

      <View style={styles.kvRow}>
        <Text style={styles.kvKey}>Username</Text>
        <Text style={styles.kvValue}>{String(profile.Username ?? profile.username ?? "")}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvKey}>Display name</Text>
        <Text style={styles.kvValue}>{String(profile["Display Name"] ?? "")}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvKey}>Email</Text>
        <Text style={styles.kvValue}>{String(profile.Email ?? profile.SnapchatEmail ?? "")}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvKey}>Phone</Text>
        <Text style={styles.kvValue}>{String(profile["Mobile Number"] ?? profile.SnapchatPhone ?? "")}</Text>
      </View>
    </View>
  );
}

function LoginView({ loginHistory }: { loginHistory: LoginRecord[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Login history</Text>
        <Text style={styles.panelMeta}>{formatCount(loginHistory.length)}</Text>
      </View>

      {loginHistory.length ? (
        <View style={styles.table}>
          {loginHistory.slice(0, 500).map((item, index) => (
            <View key={`${item.date}-${index}`} style={styles.loginRow}>
              <Text style={styles.loginCellMono}>{item.date}</Text>
              <Text style={styles.loginCellMono}>{item.ip}</Text>
              <Text style={styles.loginCell}>{item.country}</Text>
              <Text style={styles.loginCellMuted}>{item.device}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyText text="No login history found." />
      )}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: {
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
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentActive: {
    backgroundColor: theme.colors.yellowSoft,
    borderColor: theme.colors.yellow,
  },
  segmentText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: theme.colors.yellow,
  },
  panel: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  panelMeta: {
    color: theme.colors.textDim,
    fontFamily: "monospace",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  friendCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  friendAvatarText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  friendName: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  friendSince: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 12,
    fontFamily: "monospace",
  },
  table: {
    gap: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  typeBadge: {
    width: 22,
    textAlign: "center",
    borderRadius: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  sent: {
    color: theme.colors.blue,
    backgroundColor: "rgba(91,141,238,0.12)",
  },
  received: {
    color: theme.colors.teal,
    backgroundColor: "rgba(78,205,196,0.12)",
  },
  tableCellWide: {
    color: theme.colors.text,
    flex: 1,
  },
  tableCell: {
    color: theme.colors.text,
    width: 90,
  },
  tableCellMono: {
    color: theme.colors.textMuted,
    fontFamily: "monospace",
    fontSize: 12,
    width: 180,
  },
  searchList: {
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  searchTerm: {
    color: theme.colors.text,
    flex: 1,
  },
  searchDate: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: "monospace",
  },
  kvRow: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  kvKey: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kvValue: {
    color: theme.colors.text,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  loginCellMono: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: "monospace",
    width: 150,
  },
  loginCell: {
    color: theme.colors.text,
    width: 120,
  },
  loginCellMuted: {
    color: theme.colors.textMuted,
    flex: 1,
    fontSize: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    paddingVertical: 12,
  },
});
