// utils/filters.ts
import { MessageDTO } from "../services/discord";
import { Config } from "../config";

export function isCommand(msg: MessageDTO): boolean {
  return /^(!|\/)/.test(msg.content.trim());
}

export function isLinkOnly(msg: MessageDTO): boolean {
  const content = msg.content.trim();
  // Bare URL
  if (/^https?:\/\/\S+$/.test(content)) return true;
  // Markdown link
  if (/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.test(content)) return true;
  // Angle-bracket URL
  if (/^<https?:\/\/\S+>$/.test(content)) return true;
  return false;
}

export function isDMChatter(msg: MessageDTO): boolean {
  const content = msg.content.toLowerCase();
  // Match common DM-related phrases
  const dmPatterns = [
    /\bcheck\s+(your|my|their|ur)\s+(dm|dms|direct\s*message)\b/i,
    /\bsent\s+(you|u)\s+a\s+(dm|direct\s*message)\b/i,
    /\bin\s+(dm|dms|direct\s*message)\b/i,
    /\bvia\s+(dm|dms|direct\s*message)\b/i,
    /\breply\s+in\s+(dm|dms|direct\s*message)\b/i,
    /\bmessage\s+me\s+directly\b/i,
    /\bdm\s+me\b/i,
    /\bi('ll|ll)\s+dm\s+(you|u)\b/i,
  ];
  return dmPatterns.some(pattern => pattern.test(content));
}

export function applyMessageFilters(messages: MessageDTO[], config: Config): MessageDTO[] {
  return messages.filter((m) => {
    if (m.content.trim().length < config.MIN_MESSAGE_LENGTH) return false;
    if (config.EXCLUDE_COMMANDS && isCommand(m)) return false;
    if (config.EXCLUDE_LINK_ONLY && isLinkOnly(m)) return false;
    if (isDMChatter(m)) return false; // Always filter out DM chatter
    return true;
  });
}
