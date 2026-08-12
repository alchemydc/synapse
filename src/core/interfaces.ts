// src/core/interfaces.ts
import { NormalizedMessage, DigestBlock, DigestContext } from "./types";
import { DigestItem } from "./schemas";

export interface Source {
    name: string;
    isEnabled(): boolean;
    // Every source uses the same lookback, so the window advertised in the
    // digest header is exactly the window fetched. Includes the Monday weekend
    // catch-up when applicable.
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
