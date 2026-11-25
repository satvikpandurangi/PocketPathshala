# UI screens and design

Tokens: paper #F6F0E4, ink #1C1C1C, navy #1E2B6E, orange #E07B2E, green #2E8B57, red #C8452F. Archivo Black headings, DM Sans body, locally bundled. Navigation left-aligned on desktop, wrapped on mobile. A chalkboard-like navy question area is the memorable element; surrounding chrome stays quiet. Group lists are actionable classroom lists, not decorative analytics.

```text
Student: brand + hub status | teacher link
         Who's learning? → avatar grid
         [navy question board]
         [answer] [answer] [answer]
         feedback → hint → Continue
Teacher: sidebar | title + refresh status
                | skill group cards with grade chips
                | LAN/cloud counts + classroom setup
```

Student Connect: heading “A little practice. A big step.”, “Connect to teacher” address input, Connect & save pack, download progress, “Pack saved offline”. A bundled pack supports first practice without claiming a hub download happened. Offline status is based on health requests; navigator.onLine alone cannot establish internet availability.

Profile picker: “Who's learning today?” Avatar buttons show name and Class N. Selected profile controls practice and progress. Practice: large three-option MCQ, text feedback with icons, explicit Continue prevents unseen rapid transitions. Wrong answer transitions to “Let's try it together”, error-specific steps, audio Play only when an actual local recording exists, then scaffold. Exact borrowing hint includes “Borrow 1 ten. 12 − 7 = 5. Then 4 − 2 = 2.” Progress shows mastered/learning stars without percentages for children. Sync panel shows last acknowledgement and pending attempts, manual Sync now and actionable error text.

Teacher /teacher: “Every child, at their own pace.” Skill groups sorted Needs you first; each learner button opens details. Grade chips make cross-grade grouping visible. Details: five bars, 75% line, recent answer chips, error tags, next review dates. Setup: QR image, address links, roster and devices; no fabricated connectivity. Stats: LAN payload, cloud gzip payload, attempt count and a labeled modeled monthly estimate with its assumptions. Cloud explicitly says “simulated local receiver”. Demo controls appear only with ?demo=1, provide clock advance and simulation; destructive reset is omitted.

Accessibility: semantic buttons and labels; focus-visible outline; feedback aria-live; no color-only correctness; 56px targets; reduced-motion support; no autoplay audio; keyboard navigation; responsive 360×640. Error state text must explain recovery. Internet status is “not measured” unless actual external reachability is measured; hub reachability is separate.
