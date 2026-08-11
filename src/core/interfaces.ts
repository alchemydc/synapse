// src/core/interfaces.ts
import { NormalizedMessage, DigestBlock, DigestContext } from "./types";
import { DigestItem } from "./schemas";

export interface Source {
    name: string;
    isEnabled(): boolean;
    // `extraHours` is the weekend catch-up added on Mondays. It is kept separate
    // from `windowHours` so a source with its own lookback override (Discourse)
    // can apply the extension on top of that override rather than lose it.
    fetchMessages(windowHours: number, extraHours?: number): Promise<NormalizedMessage[]>;
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
