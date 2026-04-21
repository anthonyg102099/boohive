export function formatShortDate(value: Date | null): string {
  if (!value) {
    return "?";
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLongDate(value: Date | null): string {
  if (!value) {
    return "Unknown date";
  }

  return value.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLongTime(value: Date | null): string {
  if (!value) {
    return "";
  }

  return `${value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })} UTC`;
}

export function initials(name: string): string {
  const parts = name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2);

  const value = parts.map((part) => part[0] ?? "").join("").toUpperCase();
  return value || "?";
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function normalizeDateLabel(value: Date | null): string {
  return value
    ? value.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";
}
