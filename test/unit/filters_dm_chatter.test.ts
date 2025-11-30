// test/unit/filters_dm_chatter.test.ts

import { describe, it, expect } from "vitest";
import { isDMChatter } from "../../src/utils/filters";
import { DiscordMessageDTO } from "../../src/services/discord/types";

describe("isDMChatter", () => {
  const createMessage = (content: string): DiscordMessageDTO => ({
    id: "123",
    content,
    createdAt: new Date().toISOString(),
    author: "testuser",
    channelId: "channel1",
    url: "https://discord.com/channels/123/456/123",
  });

  it("should detect 'check your DM' patterns", () => {
    expect(isDMChatter(createMessage("Hey, check your DM"))).toBe(true);
    expect(isDMChatter(createMessage("Check your dms please"))).toBe(true);
    expect(isDMChatter(createMessage("Check ur dm"))).toBe(true);
    expect(isDMChatter(createMessage("Check my DM"))).toBe(true);
    expect(isDMChatter(createMessage("Check their direct message"))).toBe(true);
  });

  it("should detect 'sent you a DM' patterns", () => {
    expect(isDMChatter(createMessage("I sent you a DM"))).toBe(true);
    expect(isDMChatter(createMessage("Sent u a direct message"))).toBe(true);
    expect(isDMChatter(createMessage("Just sent you a dm about this"))).toBe(true);
  });

  it("should detect 'in DM' patterns", () => {
    expect(isDMChatter(createMessage("Let's discuss this in DM"))).toBe(true);
    expect(isDMChatter(createMessage("I'll explain in dms"))).toBe(true);
    expect(isDMChatter(createMessage("Talk to you in direct message"))).toBe(true);
  });

  it("should detect 'via DM' patterns", () => {
    expect(isDMChatter(createMessage("Send the file via DM"))).toBe(true);
    expect(isDMChatter(createMessage("Contact me via dms"))).toBe(true);
    expect(isDMChatter(createMessage("Share it via direct message"))).toBe(true);
  });

  it("should detect 'reply in DM' patterns", () => {
    expect(isDMChatter(createMessage("Please reply in DM"))).toBe(true);
    expect(isDMChatter(createMessage("Reply in dms if interested"))).toBe(true);
    expect(isDMChatter(createMessage("Reply in direct message"))).toBe(true);
  });

  it("should detect 'message me directly' patterns", () => {
    expect(isDMChatter(createMessage("Message me directly for details"))).toBe(true);
    expect(isDMChatter(createMessage("Just message me directly"))).toBe(true);
  });

  it("should detect 'DM me' patterns", () => {
    expect(isDMChatter(createMessage("DM me if you're interested"))).toBe(true);
    expect(isDMChatter(createMessage("Dm me for more info"))).toBe(true);
    expect(isDMChatter(createMessage("Just dm me"))).toBe(true);
  });

  it("should detect 'I'll DM you' patterns", () => {
    expect(isDMChatter(createMessage("I'll DM you the details"))).toBe(true);
    expect(isDMChatter(createMessage("I'll dm u later"))).toBe(true);
    expect(isDMChatter(createMessage("Ill DM you"))).toBe(true);
  });

  it("should be case insensitive", () => {
    expect(isDMChatter(createMessage("CHECK YOUR DM"))).toBe(true);
    expect(isDMChatter(createMessage("Check Your Dm"))).toBe(true);
    expect(isDMChatter(createMessage("check your dm"))).toBe(true);
  });

  it("should NOT flag messages that mention DM but are not chatter", () => {
    // These contain "dm" but in different contexts
    expect(isDMChatter(createMessage("The admin will handle this"))).toBe(false);
    expect(isDMChatter(createMessage("Our DM framework is great"))).toBe(false);
    expect(isDMChatter(createMessage("Discussing DMZ configuration"))).toBe(false);
  });

  it("should NOT flag messages without DM references", () => {
    expect(isDMChatter(createMessage("This is a normal message"))).toBe(false);
    expect(isDMChatter(createMessage("Let's discuss this here"))).toBe(false);
    expect(isDMChatter(createMessage("Check the documentation"))).toBe(false);
    expect(isDMChatter(createMessage("Send me an email"))).toBe(false);
  });

  it("should handle messages with DM chatter embedded in longer text", () => {
    expect(isDMChatter(createMessage("Thanks for the question! Check your DM for the answer."))).toBe(true);
    expect(isDMChatter(createMessage("I have some thoughts on this. I'll DM you about it."))).toBe(true);
  });

  it("should handle edge cases", () => {
    expect(isDMChatter(createMessage(""))).toBe(false);
    expect(isDMChatter(createMessage("   "))).toBe(false);
    expect(isDMChatter(createMessage("dm"))).toBe(false); // Just "dm" alone without context
  });

  it("should detect variations with punctuation", () => {
    expect(isDMChatter(createMessage("Check your DM!"))).toBe(true);
    expect(isDMChatter(createMessage("DM me."))).toBe(true);
    expect(isDMChatter(createMessage("I'll dm you, ok?"))).toBe(true);
  });

  it("should handle multiple spaces", () => {
    expect(isDMChatter(createMessage("Check  your  DM"))).toBe(true);
    expect(isDMChatter(createMessage("DM  me"))).toBe(true);
  });
});
