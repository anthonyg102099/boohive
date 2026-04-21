import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import JSZip from "jszip";

import { ArchiveSourceFile } from "../domain/archiveTypes";
import { hashString } from "../utils/hash";

type ProgressReporter = (step: string, progress: number) => void;

const mediaExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov"]);

function getExt(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function getKind(ext: string): ArchiveSourceFile["kind"] {
  if (ext === "json") {
    return "json";
  }

  if (ext === "txt" || ext === "html") {
    return "text";
  }

  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return "image";
  }

  if (["mp4", "mov"].includes(ext)) {
    return "video";
  }

  return "other";
}

async function ensureCacheDir(): Promise<string> {
  const dir = `${FileSystem.cacheDirectory ?? ""}boohive-cache/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  return dir;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = index + 1 < bytes.length ? bytes[index + 1] : undefined;
    const byte3 = index + 2 < bytes.length ? bytes[index + 2] : undefined;

    const triplet = (byte1 << 16) | ((byte2 ?? 0) << 8) | (byte3 ?? 0);

    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += byte2 === undefined ? "=" : alphabet[(triplet >> 6) & 63];
    output += byte3 === undefined ? "=" : alphabet[triplet & 63];
  }

  // The browser and native runtimes both understand base64 payloads, so we
  // convert the ZIP entry into a stable transport format before writing it.
  return output;
}

async function materializeBinaryAsset(
  zip: JSZip,
  path: string,
  onProgress?: ProgressReporter
): Promise<string> {
  if (Platform.OS === "web") {
    const blob = await zip.file(path)?.async("blob");
    if (!blob) {
      throw new Error(`Missing binary asset: ${path}`);
    }

    return URL.createObjectURL(blob);
  }

  const cacheDir = await ensureCacheDir();
  const fileName = `${hashString(path)}-${path.split("/").pop() ?? "asset"}`;
  const filePath = `${cacheDir}${fileName}`;

  const data = await zip.file(path)?.async("uint8array");
  if (!data) {
    throw new Error(`Missing binary asset: ${path}`);
  }

  // We persist extracted media to the cache directory so RN can render it
  // without keeping the full archive alive in memory.
  await FileSystem.writeAsStringAsync(filePath, uint8ToBase64(data), {
    encoding: FileSystem.EncodingType.Base64,
  });

  onProgress?.(`Extracted ${path.split("/").pop() ?? "media"}`, 0);
  return filePath;
}

async function readTextAsset(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`Missing text asset: ${path}`);
  }

  return file.async("string");
}

export async function importArchiveZip(onProgress?: ProgressReporter): Promise<ArchiveSourceFile[]> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/zip", "application/x-zip-compressed", ".zip"],
    copyToCacheDirectory: true,
    multiple: false,
    base64: true,
  } as any);

  if (picked.canceled) {
    return [];
  }

  const asset = picked.assets[0];
  if (!asset) {
    return [];
  }

  onProgress?.("Reading archive", 2);

  const zipData =
    asset.base64 ??
    (asset.uri ? await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }) : null);

  if (!zipData) {
    throw new Error("The selected file could not be read.");
  }

  const zip = await JSZip.loadAsync(zipData, { base64: true });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const files: ArchiveSourceFile[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const progress = 5 + Math.round((index / Math.max(entries.length, 1)) * 90);
    const ext = getExt(entry.name);
    const kind = getKind(ext);

    onProgress?.(`Loading ${entry.name.split("/").pop() ?? entry.name}`, progress);

    if (kind === "json" || kind === "text") {
      files.push({
        path: entry.name,
        name: entry.name.split("/").pop() ?? entry.name,
        ext,
        kind,
        text: await readTextAsset(zip, entry.name),
      });
      continue;
    }

    if (mediaExtensions.has(ext)) {
      const uri = await materializeBinaryAsset(zip, entry.name, onProgress);
      files.push({
        path: entry.name,
        name: entry.name.split("/").pop() ?? entry.name,
        ext,
        kind,
        uri,
      });
      continue;
    }

    // We still keep unknown files around so future parser improvements can
    // inspect them without changing the import layer.
    files.push({
      path: entry.name,
      name: entry.name.split("/").pop() ?? entry.name,
      ext,
      kind,
    });
  }

  onProgress?.("Archive ready", 100);
  return files;
}
