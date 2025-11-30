// src/services/discourse/types.ts

export interface DiscourseTopic {
    id: number;
    title: string;
    fancy_title?: string;
    slug?: string;
    fancy_slug?: string;
    posts_count: number;
    created_at: string;
    last_posted_at?: string;
    pinned?: boolean;
    pinned_globally?: boolean;
    pinned_until?: string;
    category_id?: number;
}

export interface DiscoursePost {
    id: number;
    name: string;
    username: string;
    avatar_template: string;
    created_at: string;
    cooked: string;
    post_number: number;
    post_type: number;
    updated_at: string;
    reply_count: number;
    reply_to_post_number?: number;
    quote_count: number;
    incoming_link_count: number;
    reads: number;
    score: number;
    topic_id: number;
    topic_slug: string;
    topic_title: string;
    category_id: number;
    display_username: string;
    primary_group_name: string;
    flair_name: string;
    flair_url: string;
    flair_bg_color: string;
    flair_color: string;
    version: number;
    can_edit: boolean;
    can_delete: boolean;
    can_recover: boolean;
    can_wiki: boolean;
    user_title: string;
    raw?: string;
    user?: {
        username: string;
    };
}

export interface DiscourseCategory {
    id: number;
    name: string;
    color: string;
    text_color: string;
    slug: string;
    topic_count: number;
    post_count: number;
}
