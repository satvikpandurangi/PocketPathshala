# UI design before implementation refinement

User direction: design the complete UI/UX as an image first, then implement it; professional, premium, Apple-like care, no generic AI template. This supersedes ad hoc screen styling. The original brand palette remains the product constraint. Apple-like means clarity, hierarchy, interaction restraint and accessibility, not copying Apple branding or requiring Apple hardware.

## Visual plan

Paper #F6F0E4, ink #1C1C1C, navy #1E2B6E, orange #E07B2E, green #2E8B57, red #C8452F. Near-white surfaces are for controls and elevated content, not a grid of decorative widgets. Locally bundled Archivo Black is used selectively for headings, DM Sans for interface text. No gradients, glass panels, fake analytics, autoplay or remote imagery. Use an 8px spacing rhythm; 360px mobile baseline; 56px targets; generous horizontal margins on desktop.

Memorable student element: a confident navy arithmetic board and three substantial answer tiles. The rest is quiet. Teacher hierarchy: classroom identity → actionable learning groups → child detail → secondary transport information. Mobile teacher navigation stays reachable; no tiny desktop sidebar shrunk onto a phone. Status is compact, text-based and truthful.

Replace emoji-dependent avatar art with a cohesive local icon/avatar family. Use a clear book mark for brand. Illustrations communicate counting, place value or shared learning; avoid random stars and decorative blobs. Prioritize durable geometry that can be implemented locally as SVG/CSS rather than runtime image downloads. The generated board is a design reference, not a screenshot of finished features.

## Screen inventory and states

1. Connect: hub address, save progress, validation failure, offline-ready confirmation.
2. Profiles: twelve separate children, grade beneath names, selected state.
3. Practice: visible question, offline status, 3 choices, answer lock, positive confirmation.
4. Targeted hint: borrowing visualization, Kannada/English text, recording pending/real play state, scaffold action.
5. Progress: skill stars, no numeric child rankings.
6. Sync: last sync, pending attempts, retry; storage failures must preserve visible question.
7. Teacher groups: Needs you first, then cross-grade frontier groups and all-mastered; meaningful empty/loading/error states.
8. Learner detail: five mastery bars with 75% marker, recent answers, error patterns, review date.
9. Setup: QR/manual addresses, roster, devices, saved pack.
10. Data: LAN/cloud separation, modeled monthly usage, simulated cloud receiver, failed-flush queue retention.
11. Demo controls: explicitly labeled, server-gated clock advance; no destructive reset.
12. Coordinator: local simulated school-by-skill gap table, no claimed field data.

## Image-first artifacts

Create a complete system board before further UI layout changes. Save selected image and exact prompt in docs/design/. Review against hierarchy, usability, consistency and accessibility, then implement the reference as functioning code. Generated text/graphs are illustrative: real UI values always come from data. Preserve tested engine and sync contracts during the visual refinement.

## Critique of current UI

The navy question board and grade chips already communicate the task. Improve the inconsistent emoji/symbol vocabulary, reduce decorative sparks, give teacher content a stronger reading order, and increase small supporting text on mobile. Use a real focus-managed learner detail dialog. Maintain ≥56px controls and visible text feedback. No “premium” change may weaken offline behavior or inflate the runtime bundle with heavy UI dependencies.
