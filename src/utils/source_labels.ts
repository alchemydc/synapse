export function formatSourceLabel(msg: {
  source: "discord" | "discourse" | string;
  channelId?: string;
  forum?: string;
  categoryId?: number | undefined;
}): string {
  // Discord: prefer channelId (might be like "111:channel-name" or raw id). Keep it simple: use channelId as-is.
  if (msg.source === "discord") {
    const ch = msg.channelId ? msg.channelId.replace(/^#?/, "") : "unknown-channel";
    return `[Discord ${ch.startsWith("disc-topic-") ? `#${ch.replace("disc-topic-", "")}` : `#${ch}`}]`;
  }

  // Discourse/forum: prefer category name if present in channel-like field, else use categoryId or forum hostname.
  if (msg.source === "discourse") {
    if (typeof msg.categoryId !== "undefined" && msg.categoryId !== null) {
      return `[Forum category:${msg.categoryId}]`;
    }
    if (msg.forum) {
      return `[Forum ${msg.forum}]`;
    }
    return `[Forum]`;
  }

  return `[Source ${msg.source}]`;
}
