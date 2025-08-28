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

export function applyMessageFilters(messages: MessageDTO[], config: Config): MessageDTO[] {
  return messages.filter((m) => {
    if (m.content.trim().length < config.MIN_MESSAGE_LENGTH) return false;
    if (config.EXCLUDE_COMMANDS && isCommand(m)) return false;
    if (config.EXCLUDE_LINK_ONLY && isLinkOnly(m)) return false;
    return true;
  });
}
