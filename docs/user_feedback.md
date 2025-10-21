# feedback from DC 20 oct 2025
## attribution problems
Seeing attribution to INL_0, INL_1 in discord AND forum summaries, which is erroneous.
for example: (from a discord summary)
"API & Shielded Transactions: __INL_0* inquired about an API call to get the "shielded number" for a dashboard, questioning if Binance supports this and if the channel is the right place to ask.
- Mining Hardware: INL_1 asked if BTC miners can switch to Zcash or if different hardware is needed.
- Project Updates & Roadmap: INL_2 advised following "aborist calls" for the latest information and suggested that certain developments would likely occur after "milestone 5" at the earliest. INL_3 sought further input on this."

example from a forum summary:
"-   INL_17 suggested potential collaboration with Zechub, who may already manage INL_18, to integrate additional features.
-   INL_19 supported the idea of collaboration to develop new features for the site."

***I suspect this bug is coming from src/utils/format.ts rather than from the LLM***
Haven't been able to reproduce it in debug mode so it must be occuring while prepping the mrkdown to post to slack
```
// Protect inline code
  const inlines: string[] = [];
  md = md.replace(/`([^`]+)`/g, (_m, p1) => {
    inlines.push(p1);
    return `__INL_${inlines.length - 1}__`;
  });
```

## redundant summarization of forum posts
seeing an issue where forum threads are being re-summarized when they receive replies.  perhaps we need a more sophisticated approach to avoid re-summarizing entire forum threads every time a thread receives a new response.  unclear best way to approach this without keeping some kind of state server side.

