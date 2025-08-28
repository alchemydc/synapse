"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommand = isCommand;
exports.isLinkOnly = isLinkOnly;
exports.applyMessageFilters = applyMessageFilters;
function isCommand(msg) {
    return /^(!|\/)/.test(msg.content.trim());
}
function isLinkOnly(msg) {
    const content = msg.content.trim();
    // Bare URL
    if (/^https?:\/\/\S+$/.test(content))
        return true;
    // Markdown link
    if (/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.test(content))
        return true;
    // Angle-bracket URL
    if (/^<https?:\/\/\S+>$/.test(content))
        return true;
    return false;
}
function applyMessageFilters(messages, config) {
    return messages.filter((m) => {
        if (m.content.trim().length < config.MIN_MESSAGE_LENGTH)
            return false;
        if (config.EXCLUDE_COMMANDS && isCommand(m))
            return false;
        if (config.EXCLUDE_LINK_ONLY && isLinkOnly(m))
            return false;
        return true;
    });
}
