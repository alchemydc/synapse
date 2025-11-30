// src/core/types.ts

export interface NormalizedMessage {
    id: string;
    source: "discord" | "discourse";
    channelId?: string;
    channelName?: string;
    topicId?: number;
    topicTitle?: string;
    postId?: number;
    categoryId?: number;
    categoryName?: string;
    forum?: string;
    author: string;
    content: string;
    createdAt: string;
    url: string;
}

export interface DigestBlock {
    type: "section" | "header" | "divider" | "context";
    text?: {
        type: "mrkdwn" | "plain_text";
        text: string;
    };
    fields?: Array<{
        type: "mrkdwn" | "plain_text";
        text: string;
    }>;
}

export interface DigestContext {
    start: Date;
    end: Date;
    dateTitle: string;
}
