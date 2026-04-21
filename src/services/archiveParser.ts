import {
  ArchiveData,
  ArchiveSourceFile,
  Conversation,
  FriendRecord,
  LoginRecord,
  MemoryItem,
  ProfileRecord,
  SearchRecord,
  SnapRecord,
} from "../domain/archiveTypes";

function lower(path: string): string {
  return path.toLowerCase();
}

function normalizeKey(value: string): string {
  return value.replace(" UTC", "").replace(/:/g, "-").trim();
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function findMeta(base: string, metaMap: Record<string, Record<string, unknown>>): Record<string, unknown> | null {
  if (metaMap[base]) {
    return metaMap[base];
  }

  const normalized = base.replace(" UTC", "").trim();
  for (const key of Object.keys(metaMap)) {
    if (key === normalized || key.startsWith(normalized) || normalized.startsWith(key)) {
      return metaMap[key];
    }
  }

  return null;
}

function parseDate(base: string, meta: Record<string, unknown> | null): Date | null {
  const metaDate = meta?.Date;
  if (typeof metaDate === "string") {
    const parsed = new Date(metaDate.replace(" UTC", " GMT"));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fullMatch = base.match(/(\d{4})-(\d{2})-(\d{2})[\s_T](\d{2})[-:](\d{2})[-:](\d{2})/);
  if (fullMatch) {
    return new Date(
      `${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}T${fullMatch[4]}:${fullMatch[5]}:${fullMatch[6]}Z`
    );
  }

  const dateOnly = base.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`);
  }

  return null;
}

function resolveMediaById(
  mediaId: string,
  mediaIndex: Record<string, { uri: string; isVideo: boolean; overlayUri: string | null; hasOverlay: boolean }>
): { uri: string; isVideo: boolean; overlayUri: string | null; hasOverlay: boolean } | null {
  if (mediaIndex[mediaId]) {
    return mediaIndex[mediaId];
  }

  const idPart = mediaId.includes("b~") ? mediaId.split("b~")[1] : mediaId.split("|")[0];
  if (!idPart) {
    return null;
  }

  const prefix = idPart.substring(0, 20);
  for (const key of Object.keys(mediaIndex)) {
    if (key.includes(prefix)) {
      return mediaIndex[key];
    }
  }

  return null;
}

function buildProfileRecord(value: unknown): ProfileRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ProfileRecord;
}

export function parseArchiveFiles(files: ArchiveSourceFile[]): ArchiveData {
  // This function is intentionally pure so it can be unit-tested independently
  // from file-picker behavior and platform-specific ZIP extraction.
  const jsonFiles = files.filter((file) => file.kind === "json");
  const mediaFiles = files.filter((file) => file.kind === "image" || file.kind === "video");

  const memoryMeta = new Map<string, Record<string, unknown>>();
  const chatMediaIndex: Record<
    string,
    { uri: string; isVideo: boolean; overlayUri: string | null; hasOverlay: boolean }
  > = {};

  const memories: MemoryItem[] = [];
  const conversations: Conversation[] = [];
  const friends: FriendRecord[] = [];
  const snaps: SnapRecord[] = [];
  const searchHistory: SearchRecord[] = [];
  const loginHistory: LoginRecord[] = [];
  let profile: ProfileRecord | null = null;

  // Build the chat-media index up front so the message parser can attach
  // thumbnails and video previews without having to re-scan the full archive.
  for (const file of files) {
    const path = lower(file.path);
    if (!path.includes("/chat_media/") || !file.uri) {
      continue;
    }

    const base = file.name.replace(/\.[^.]+$/, "");
    const existing = chatMediaIndex[base] ?? {
      uri: "",
      isVideo: false,
      overlayUri: null,
      hasOverlay: false,
    };

    if (file.kind === "video") {
      existing.uri = file.uri;
      existing.isVideo = true;
    } else if (file.kind === "image") {
      if (lower(file.name).includes("overlay")) {
        existing.overlayUri = file.uri;
        existing.hasOverlay = true;
      } else if (!existing.uri) {
        existing.uri = file.uri;
      }
    }

    chatMediaIndex[base] = existing;
  }

  for (const file of jsonFiles) {
    const json = file.text ? safeJsonParse(file.text) : null;
    if (!json) {
      continue;
    }

    if (lower(file.name) === "chat_history.json") {
      const convoKeys = Object.keys(json as Record<string, unknown>).filter((key) => {
        const value = (json as Record<string, unknown>)[key];
        return Array.isArray(value) && value.length > 0;
      });

      for (const convoName of convoKeys) {
        const rawMessages = asArray<Record<string, unknown>>((json as Record<string, unknown>)[convoName]);
        conversations.push({
          name: convoName,
          isGroup: convoName.length > 20 || convoName.includes("-") || convoName.includes("_"),
          messages: rawMessages.map((message) => {
            const mediaIds = String(
              message["Media IDs"] ?? message["media ids"] ?? ""
            );
            const attachments = mediaIds
              .split("|")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((mediaId) => {
                const resolved = resolveMediaById(mediaId, chatMediaIndex);
                if (!resolved) {
                  return null;
                }

                return {
                  id: mediaId,
                  uri: resolved.uri,
                  isVideo: resolved.isVideo,
                  hasOverlay: resolved.hasOverlay,
                  overlayUri: resolved.overlayUri,
                };
              })
              .filter(Boolean) as Array<{
              id: string;
              uri: string;
              isVideo: boolean;
              hasOverlay: boolean;
              overlayUri: string | null;
            }>;

            return {
              sender: String(message["From"] ?? message.sender ?? ""),
              content: String(message["Content"] ?? message.content ?? message.text ?? message.message ?? ""),
              created: String(message["Created"] ?? message.created ?? message["Created(microseconds)"] ?? ""),
              mediaType: String(message["Media Type"] ?? message["media type"] ?? message.type ?? ""),
              mediaIds,
              isSaved: Boolean(message["IsSaved"] ?? message.isSaved ?? false),
              isSender: Boolean(message["IsSender"] ?? message.IsSender ?? false),
              attachments,
            };
          }),
        });
      }

      continue;
    }

    if (lower(file.name) === "memories_history.json") {
      const arr = Array.isArray(json)
        ? json
        : (json as Record<string, unknown>)["Saved Media"] ??
          (json as Record<string, unknown>)["memories"] ??
          json;

      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && typeof item === "object") {
            const date = String((item as Record<string, unknown>).Date ?? (item as Record<string, unknown>).date ?? "");
            if (date) {
              memoryMeta.set(normalizeKey(date), item as Record<string, unknown>);
              memoryMeta.set(date, item as Record<string, unknown>);
            }
          }
        }
      }

      continue;
    }

    if (lower(file.name) === "snap_history.json") {
      if (Array.isArray(json)) {
        snaps.push(
          ...(json as Array<Record<string, unknown>>).map((entry) => ({
            direction:
              entry.IsSender === true || entry["IsSender"] === true ? "sent" : "received",
            sender: String(entry.From ?? entry.Sender ?? entry._user ?? ""),
            mediaType: String(entry["Media Type"] ?? entry.type ?? "-"),
            timestamp: String(entry.Created ?? entry.Timestamp ?? entry.Date ?? "-"),
          }))
        );
      } else {
        for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
          if (Array.isArray(value)) {
            snaps.push(
              ...value.map((entry) => ({
                direction:
                  (entry as Record<string, unknown>).IsSender === true ? "sent" : "received",
                sender: key,
                mediaType: String((entry as Record<string, unknown>)["Media Type"] ?? (entry as Record<string, unknown>).type ?? "-"),
                timestamp: String((entry as Record<string, unknown>).Created ?? (entry as Record<string, unknown>).Timestamp ?? (entry as Record<string, unknown>).Date ?? "-"),
              }))
            );
          }
        }
      }
      continue;
    }

    if (lower(file.name) === "friends.json") {
      const arr = Array.isArray(json)
        ? json
        : (json as Record<string, unknown>)["Friends"] ?? (json as Record<string, unknown>)["friends"] ?? [];

      friends.push(
        ...asArray<Record<string, unknown>>(arr).map((friend) => ({
          name: String(friend.Username ?? friend.username ?? friend["Display Name"] ?? friend.name ?? "Unknown friend"),
          since: String(friend["Friend Since"] ?? friend["Added Date"] ?? friend.since ?? ""),
          raw: friend,
        }))
      );
      continue;
    }

    if (lower(file.name) === "user_profile.json") {
      profile = buildProfileRecord((json as Record<string, unknown>)["User Information"] ?? json);
      continue;
    }

    if (lower(file.name) === "account.json" || lower(file.name) === "account_history.json") {
      if (!profile || Object.keys(profile).length === 0) {
        profile = buildProfileRecord(
          (json as Record<string, unknown>)["Account Information"] ??
            (json as Record<string, unknown>)["Basic Information"] ??
            json
        );
      }

      const loginFromAccount = (json as Record<string, unknown>)["Login History"];
      if (Array.isArray(loginFromAccount)) {
        loginHistory.splice(0, loginHistory.length, ...loginFromAccount.map((row) => ({
          date: String((row as Record<string, unknown>).Date ?? (row as Record<string, unknown>)["Created At"] ?? (row as Record<string, unknown>).Timestamp ?? "-"),
          ip: String((row as Record<string, unknown>).IP ?? (row as Record<string, unknown>)["IP Address"] ?? (row as Record<string, unknown>)["Device IP"] ?? "-"),
          country: String((row as Record<string, unknown>).Country ?? (row as Record<string, unknown>).Location ?? "-"),
          device: String((row as Record<string, unknown>)["Device Type"] ?? (row as Record<string, unknown>).Device ?? (row as Record<string, unknown>)["Device Model"] ?? (row as Record<string, unknown>)["User Agent"] ?? ""),
        })));
      }

      const deviceHistory = (json as Record<string, unknown>)["Device"];
      if (Array.isArray(deviceHistory)) {
        loginHistory.splice(0, loginHistory.length, ...deviceHistory.map((row) => ({
          date: String((row as Record<string, unknown>).Date ?? (row as Record<string, unknown>)["Created At"] ?? (row as Record<string, unknown>).Timestamp ?? "-"),
          ip: String((row as Record<string, unknown>).IP ?? (row as Record<string, unknown>)["IP Address"] ?? (row as Record<string, unknown>)["Device IP"] ?? "-"),
          country: String((row as Record<string, unknown>).Country ?? (row as Record<string, unknown>).Location ?? "-"),
          device: String((row as Record<string, unknown>)["Device Type"] ?? (row as Record<string, unknown>).Device ?? (row as Record<string, unknown>)["Device Model"] ?? (row as Record<string, unknown>)["User Agent"] ?? ""),
        })));
      }
      continue;
    }

    if (lower(file.name) === "login_history.json") {
      const arr = Array.isArray(json)
        ? json
        : (json as Record<string, unknown>)["Login History"] ??
          (json as Record<string, unknown>)["Account Activity"] ??
          json;

      if (Array.isArray(arr)) {
        loginHistory.push(
          ...arr.map((row) => ({
            date: String((row as Record<string, unknown>).Date ?? (row as Record<string, unknown>)["Created At"] ?? (row as Record<string, unknown>).Timestamp ?? "-"),
            ip: String((row as Record<string, unknown>).IP ?? (row as Record<string, unknown>)["IP Address"] ?? (row as Record<string, unknown>)["Device IP"] ?? "-"),
            country: String((row as Record<string, unknown>).Country ?? (row as Record<string, unknown>).Location ?? "-"),
            device: String((row as Record<string, unknown>)["Device Type"] ?? (row as Record<string, unknown>).Device ?? (row as Record<string, unknown>)["Device Model"] ?? (row as Record<string, unknown>)["User Agent"] ?? ""),
          }))
        );
      }
      continue;
    }

    if (lower(file.name) === "search_history.json") {
      if (Array.isArray(json)) {
        searchHistory.push(
          ...json.map((row) => ({
            term: String((row as Record<string, unknown>)["Search Term"] ?? (row as Record<string, unknown>).term ?? (row as Record<string, unknown>).Query ?? ""),
            timestamp: String((row as Record<string, unknown>)["Date and time (hourly)"] ?? (row as Record<string, unknown>).Timestamp ?? (row as Record<string, unknown>).Date ?? ""),
          }))
        );
      } else {
        const source = json as Record<string, unknown>;
        if (Array.isArray(source[""])) {
          searchHistory.push(
            ...(source[""] as Array<Record<string, unknown>>).map((row) => ({
              term: String(row["Search Term"] ?? row.term ?? row.Query ?? ""),
              timestamp: String(row["Date and time (hourly)"] ?? row.Timestamp ?? row.Date ?? ""),
            }))
          );
        } else {
          for (const key of Object.keys(source)) {
            if (Array.isArray(source[key])) {
              searchHistory.push(
                ...(source[key] as Array<Record<string, unknown>>).map((row) => ({
                  term: String(row["Search Term"] ?? row.term ?? row.Query ?? ""),
                  timestamp: String(row["Date and time (hourly)"] ?? row.Timestamp ?? row.Date ?? ""),
                }))
              );
              break;
            }
          }
        }
      }
    }
  }

  for (const file of mediaFiles) {
    const path = lower(file.path);
    const parts = file.path.split("/");
    const folderNames = parts.map((part) => lower(part));
    const isMemoryAsset =
      folderNames.includes("memories") ||
      folderNames.includes("memories_media") ||
      folderNames.includes("memories_export");

    if (!isMemoryAsset || !file.uri) {
      continue;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const overlayMatch = lower(file.name).includes("-overlay");
    const mainBase = baseName
      .replace(/-main$/i, "")
      .replace(/-overlay$/i, "")
      .toLowerCase();

    const current = memories.find((item) => item.id === mainBase);
    const meta = findMeta(baseName, Object.fromEntries(memoryMeta));
    const date = parseDate(baseName, meta);

    if (current) {
      if (overlayMatch) {
        current.overlayUri = file.uri;
        current.hasOverlay = true;
      } else {
        current.baseUri = file.uri;
        current.isVideo = file.kind === "video";
        current.date = current.date ?? date;
        current.metadata = current.metadata ?? meta;
      }
      continue;
    }

    memories.push({
      id: mainBase,
      isVideo: file.kind === "video",
      date,
      baseUri: overlayMatch ? null : file.uri,
      overlayUri: overlayMatch ? file.uri : null,
      hasOverlay: overlayMatch,
      metadata: meta,
    });
  }

  memories.sort((a, b) => {
    if (!a.date && !b.date) {
      return 0;
    }

    if (!a.date) {
      return 1;
    }

    if (!b.date) {
      return -1;
    }

    return b.date.getTime() - a.date.getTime();
  });

  conversations.sort((a, b) => {
    const aTime = a.messages[0]?.created ?? "";
    const bTime = b.messages[0]?.created ?? "";
    if (aTime > bTime) {
      return -1;
    }
    if (aTime < bTime) {
      return 1;
    }
    return 0;
  });

  const photoCount = memories.filter((item) => !item.isVideo).length;
  const videoCount = memories.filter((item) => item.isVideo).length;

  return {
    memories,
    conversations,
    friends,
    snaps,
    searchHistory,
    profile,
    loginHistory,
    summary: {
      memories: memories.length,
      photos: photoCount,
      videos: videoCount,
      conversations: conversations.length,
      friends: friends.length,
      snaps: snaps.length,
      search: searchHistory.length,
      login: loginHistory.length,
    },
  };
}
