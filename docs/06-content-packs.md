# Content packs

Pack maths-c2-c5-v1 version 1 contains five skills and 90 generated/curated MCQs, 18 per skill, including the exact two video items. Source builder: tools/pack-builder/index.ts. Output: content/packs/maths-c2-c5-v1/{pack.json,items/items.json,hints/hints.json,images/place-value.svg,audio/}. Build emits deterministic content, SHA-256 asset hashes and total asset bytes. Manifest itself is excluded from totalBytes to avoid a self-referential hash; network accounting still includes its transfer.

Every item has three unique choices and exactly one correct answer. Incorrect choices include errorTag from the shared enum. Hints cover every tag and contain Kannada text plus English steps. Illustrations are bundled SVG with no remote references. Do not include video or runtime TTS.

Record at least ten Kannada clips, 16–24 kbps mono MP3/Opus, one for each hint, and list source/consent in audio/README.md. Target phrase for SUB_NO_BORROW: “ಒಂದು ಹತ್ತನ್ನು ಬಿಡಿಸಿ. ಮೊದಲು ಒಂದರ ಸ್ಥಾನವನ್ನು ಕಳೆಯಿರಿ.” Ask a fluent teammate to review pronunciation and mathematical vocabulary before recording. Recordings must be authentic and audible; empty/synthetic files are unacceptable placeholders. Until supplied, leave audioRef absent and display an explicit pending recording message.

Validation gates: Zod shapes; unknown skill refs rejected; option uniqueness and one correct; every error tag has a hint; every referenced asset exists; manifest sizes and hashes match bytes; video questions match exact options. Installation is atomic so interrupted downloads do not destroy a prior ready pack. App public/packs is generated from validated content during build, not manually edited.
