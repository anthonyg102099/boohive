export type ArchiveFileKind =
  | "json"
  | "text"
  | "image"
  | "video"
  | "other";

export type ArchiveSourceFile = {
  path: string;
  name: string;
  ext: string;
  kind: ArchiveFileKind;
  text?: string;
  uri?: string;
};

export type MemoryItem = {
  id: string;
  isVideo: boolean;
  date: Date | null;
  baseUri: string | null;
  overlayUri: string | null;
  hasOverlay: boolean;
  metadata: Record<string, unknown> | null;
};

export type ChatMessage = {
  sender: string;
  content: string;
  created: string;
  mediaType: string;
  mediaIds: string;
  isSaved: boolean;
  isSender: boolean;
  attachments: Array<{
    id: string;
    uri: string;
    isVideo: boolean;
    hasOverlay: boolean;
    overlayUri: string | null;
  }>;
};

export type Conversation = {
  name: string;
  isGroup: boolean;
  messages: ChatMessage[];
};

export type FriendRecord = {
  name: string;
  since: string;
  raw: Record<string, unknown>;
};

export type SnapRecord = {
  direction: "sent" | "received";
  sender: string;
  mediaType: string;
  timestamp: string;
};

export type SearchRecord = {
  term: string;
  timestamp: string;
};

export type LoginRecord = {
  date: string;
  ip: string;
  country: string;
  device: string;
};

export type ProfileRecord = Record<string, unknown>;

export type ArchiveSummary = {
  memories: number;
  photos: number;
  videos: number;
  conversations: number;
  friends: number;
  snaps: number;
  search: number;
  login: number;
};

export type ArchiveData = {
  memories: MemoryItem[];
  conversations: Conversation[];
  friends: FriendRecord[];
  snaps: SnapRecord[];
  searchHistory: SearchRecord[];
  profile: ProfileRecord | null;
  loginHistory: LoginRecord[];
  summary: ArchiveSummary;
};
