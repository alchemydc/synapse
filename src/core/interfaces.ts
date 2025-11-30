// src/core/interfaces.ts
import { NormalizedMessage, DigestBlock, DigestContext } from "./types";
import { DigestItem } from "./schemas";

export interface Source {
    name: string;
    isEnabled(): boolean;
    fetchMessages(windowHours: number): Promise<NormalizedMessage[]>;
}

export interface Destination {
    name: string;
    isEnabled(): boolean;
    sendDigest(blocks: DigestBlock[], summary: string, context: DigestContext): Promise<void>;
}

export interface Processor {
    name: string;
    process(messages: NormalizedMessage[]): Promise<string | DigestItem>;
}
