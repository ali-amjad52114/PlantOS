# TripPoint Forensic Audit

**Audit date:** July 21, 2026  
**Scope:** Product decisions, source ingestion, architecture growth, multi-agent execution, Git/worktree state, tests, browser behavior, reference-screen fidelity, packaging, and release claims.  
**Purpose:** Explain what was built, what genuinely worked, what failed, why it failed, and how the same failure pattern should be prevented.

## Executive verdict

TripPoint became a technically substantial prototype without first proving the single learner journey that mattered most. The central failure was sequencing:

> Architecture, agents, contracts, routes, tests, and documentation expanded before one real PDF passage could move cleanly through selection, GPT generation, quiz branching, ThoughtLab, and persistence in the browser.

The application contained real capabilities, including live GPT-5.6 generation and Dialogue. It nevertheless failed the MVP completion standard because its learner-facing source content was corrupted, retrieval boundaries were unreliable, the visual presentation diverged from supplied references, the current browser flow lacked proper end-to-end coverage, and the release package depended on a local source file outside the integrated checkout.

## Controlling MVP

The controlling product flow was:

> PDF Motors content → select material → one GPT-5.6 request → explanation + 2D + 3D + Formula + Compare + quiz/answer → display → correct continues → wrong opens ThoughtLab with the same visual and live Dialogue → save locally.

The product lock also required:

- No product behavior could be added, removed, substituted, or reinterpreted without owner approval.
- Conflicts with historical plans had to be shown to the owner.
- Tests alone could not establish completion.
- The complete flow had to work twice from reset in a real browser.
- An independent verifier had to reproduce it on the same commit.

Those completion gates were not satisfied.

## What genuinely worked

The integrated rescue application demonstrated these real behaviors:

- Landing page and local onboarding.
- Texas topic selection with Motors enabled.
- Local PDF-derived source retrieval.
- One live GPT-5.6 request producing a lesson package.
- Generated explanation, HTML, four labeled modes, quiz, answer, and feedback.
- Correct-answer feedback and return to reading.
- Wrong-answer transition into ThoughtLab.
- Reuse of the same generated visual package in ThoughtLab.
- Live Builder and Challenger responses.
- Local browser persistence across refresh.
- TypeScript compilation, linting, unit tests, content tests, and production builds at several integration checkpoints.

These capabilities made the application more than a static mockup. They did not make it a completed MVP.

## What was broken or incomplete

### 1. The reader displayed corrupted source text

The supplied PDF was visually readable. The corruption came from the PDF's embedded ClearScan text mappings and the extraction pipeline's failure to reject poor output.

Observed problems included:

- Replacement characters.
- Incorrect character mappings.
- Split and fused words.
- Column-order contamination.
- Headers and footers mixed into teaching content.
- Long raw text dumps unsuitable for learning.

The backend used extracted source text directly as the learner-facing summary and body. “PDF-derived” was interpreted too literally as “display the raw text layer.”

### 2. Retrieval included unrelated NEC material

The corpus builder assigned Motors topic membership when the active heading indicated Article 430 or Section 240.6. Heading state could leak when corrupted headings were not recognized. This produced internally inconsistent locators, such as an Article 430 context paired with a Section 695.4 locator.

Lexical retrieval then ranked results globally across everything tagged as Motors. It did not require a contiguous selected section or reject impossible article/section combinations.

The result was unrelated Fire Pump and compressor content appearing inside the Motors reader.

### 3. Highlighted selection was not exact

The reader inspected highlighted text only to determine which block contained it. It then submitted the entire block.

The interface therefore appeared to support “select any passage or concept,” but the GPT request received a larger prebuilt chunk.

### 4. The generated UI did not follow the supplied references

The supplied reference screens showed:

- Clean, edited study prose.
- Contextual learning actions.
- Host-level visualization modes.
- A large visualization workspace.
- A clear three-column ThoughtLab.

The implementation instead used:

- Raw extracted PDF blocks.
- A complete generated page inside a nested iframe.
- Four views stacked inside the iframe.
- Generic panel composition.
- A ThoughtLab right column centered on quiz/source controls rather than the earlier mental-model direction.

The multi-agent prompts did not point the UI agents to the supplied screenshot directory. The reference folder was untracked and therefore unavailable inside the agents' separate worktrees. Screenshot capture was requested, but screenshot-to-reference comparison was not.

### 5. “3D” was accepted too loosely

The live generation prompt permitted CSS-based 3D. The observed result used rotating blocks rather than a meaningful electrical equipment or circuit model.

This was a product-affecting quality decision that should have been shown to the owner. It was accepted as a technical shortcut.

### 6. The active rescue bypassed the hardened runtime

The repository already contained a generated-lesson runtime with:

- Content Security Policy.
- Network prohibition.
- Bridge validation.
- Runtime violations.
- Fail-closed behavior.
- Reload isolation.

The rescue UI instead rendered GPT HTML directly through an iframe using `sandbox="allow-scripts"` and `srcDoc`.

That did not use the required existing runtime and did not independently prohibit outbound network requests. The lead merged it despite the rescue contract explicitly requiring the existing isolated runtime.

### 7. The package checks were structural, not behavioral

The server verified:

- Schema validity.
- Required fields.
- Supporting-quote presence.
- Four mode-label strings.
- Valid correct-choice identifier.

It did not load the generated lesson, execute its JavaScript, operate each control, verify meaningful changes, or confirm visual quality before display.

The presence of a label was treated as evidence of a functioning mode.

### 8. The tests did not represent the locked MVP

The integrated automated checks produced many passes, but the browser configuration targeted an older workflow involving prediction, transfer, and mental-model features.

The real-PDF integration suite was conditional on a source-path environment variable and was skipped in the ordinary test run. Its assertions verified hashes, page counts, and some truth cases, but not learner-facing readability, column ordering, corrupted-character ratios, or locator consistency.

Green tests therefore proved internal contracts and historical regression behavior, not the current learner journey.

### 9. Two different applications were running

During the audit:

- Port 3000 served an older primary checkout.
- Port 3101 served the integrated rescue checkout.

This made it easy to inspect one version while testing another. The active checkout, branch, commit, URL, and process were not consistently presented as one source of truth.

### 10. The release package was not reproducible

The integrated rescue checkout did not contain the 2023 NEC PDF used by the running server. The server received an absolute path pointing to a source in another local checkout.

A clean judge checkout could therefore fail even though the developer machine worked.

This conflicted with the product owner's instruction that judges receive everything needed to run the project.

### 11. Historical architecture obscured the rescue

The repository retained multiple product eras:

1. California seal-in circuit.
2. Texas ThoughtLab.
3. Motors learning-depth workflow.
4. Real PDF, truth templates, deterministic evaluators, artifact verification, and transfer.
5. Simplified one-request rescue.

The integrated application contained 17 API routes and extensive historical runtime, transfer, mental-model, fixture, and verification code even though the active rescue required only a small subset.

Historical documents remained visible beside the controlling MVP and made the current direction harder to identify.

## Git and repository growth

At the audited integration point:

- The integrated repository contained approximately 325 tracked files.
- `src` contained roughly 11,486 lines.
- Tests contained roughly 1,664 lines.
- There were approximately 72 test/spec files.
- There were 17 API routes.
- There were 33 Git worktrees.
- There were 36 local branches.

From the earlier baseline to the integrated rescue, approximately 155 files changed, with more than 11,000 added lines.

The growth came from:

- PDF ingestion and caching.
- Source manifests and claim packets.
- Deterministic truth templates.
- Evaluators and transfer grading.
- Generated artifact contracts.
- Sandbox and browser verification.
- Three.js infrastructure.
- Mental-model state.
- Multiple API surfaces.
- Fixture and live modes.
- Multi-agent plans, reports, and governance documents.

Much of this code was individually reasonable. The mistake was building it before proving the smallest visible product path.

## Multi-agent execution analysis

### Claude Code assignment

Claude owned the reader, topic UI, selection experience, citation display, and reader styling.

Claude produced the reader integration and later extraction-spacing/OCR work. It could not fix the original backend data because its file ownership excluded the retrieval service. It was also not given the reference-screen directory as an explicit acceptance input.

### Cursor assignment

Cursor owned generated-lesson display, quiz interaction, wrong-answer ThoughtLab, and same-package reuse.

Cursor successfully implemented package reuse and ThoughtLab branching. It also created a direct `srcDoc` iframe, duplicated a shared package type, and produced a generic layout that did not match the supplied reference screens.

### Lead responsibility

The lead owned:

- Product/spec interpretation.
- Agent prompts.
- Contracts.
- Backend generation.
- Source retrieval.
- Integration.
- Browser acceptance.
- Release claims.

The lead was responsible for the final failure because it:

- Did not attach reference screenshots to agent acceptance criteria.
- Allowed raw corrupted text through the source gate.
- Did not validate locator consistency.
- Allowed full-block substitution for exact passage selection.
- Accepted CSS blocks as sufficient 3D.
- Merged a runtime bypass.
- Counted historical tests toward current confidence.
- Did not create a browser test for the locked flow.
- Did not complete the required twice-through browser run.
- Did not obtain independent reproduction.
- Did not provide one branch/commit/port as the authoritative runtime.
- Did not resolve clean-checkout source packaging.

Agents completed bounded assignments. The lead failed to prove that the assignments formed the intended product.

## Why the user could not see the problem developing

Git's green and red lines showed code additions and deletions, not product coherence.

The workflow did not give the owner a simple continuous view of:

- What visible behavior was being changed.
- Which files each agent owned.
- Which branch and commit were active.
- What the current browser looked like.
- What was actually tested.
- Which decisions were made without approval.
- Which failures were being hidden behind generic messages.
- Whether the integrated product still matched the screenshots.

Progress reports emphasized implementation and test activity instead of visible learner outcomes.

## Root causes

### Root cause 1: Wrong sequencing

The build should have begun with source proof and one browser vertical slice. Instead, architecture and parallel work began first.

### Root cause 2: No real-data quality gate

Nonempty extracted text was accepted even when visibly corrupted.

### Root cause 3: Component completion replaced product completion

Individual agents could satisfy local definitions of done while the integrated journey remained poor.

### Root cause 4: Tests were mistaken for user evidence

Compilation and unit-test success created confidence without browser proof of the active flow.

### Root cause 5: Product-affecting technical decisions were not escalated

Raw text, CSS 3D, whole-chunk selection, nested iframe composition, and simplified runtime verification changed the learner experience without explicit owner approval.

### Root cause 6: Too many active histories

Contradictory plans, routes, branches, worktrees, and servers obscured the active product.

### Root cause 7: Reference assets were not operationalized

Screenshots and reference code existed, but were not tracked, routed into agent prompts, or used for visual acceptance.

## Lessons and prevention gates

### Gate 1: One controlling product specification

Maintain one active product file. Archive superseded plans under an explicitly historical directory.

### Gate 2: Real-source proof

Before downstream implementation:

- Render representative source pages.
- Extract them.
- Compare visible and extracted text.
- Validate locator consistency.
- Reject corrupted character ratios and mixed columns.

### Gate 3: One complete vertical slice

Before parallel work, prove:

```text
one clean passage
→ exact selection
→ one real GPT request
→ generated lesson
→ correct branch
→ wrong branch
→ live Dialogue
→ persistence
```

### Gate 4: Product-owner visual approval

Track reference screenshots and define exact desktop/mobile comparison requirements. Do not proceed from reader to lesson or lesson to ThoughtLab until the owner approves the visible checkpoint.

### Gate 5: Frozen integration boundaries

Every agent receives:

- Owned files.
- Prohibited files.
- Exact input/output type.
- Reference screenshots.
- Tests.
- Browser evidence.
- Stop conditions.
- Definition of done.

### Gate 6: Lead-only merges

An agent submits a commit and evidence. The lead inspects the diff, runs integration checks with real data, compares the browser with the reference, and either accepts or rejects it.

### Gate 7: Current-flow tests

Every locked MVP step has an active browser assertion. Historical regression tests are reported separately.

### Gate 8: Behavioral GPT verification

Generated lessons must be loaded and operated. Each mode must visibly demonstrate its intended relationship. Label presence is not enough.

### Gate 9: Single runtime identity

Always report:

```text
Active checkout
Active branch
Active commit
Active URL
Active server process
Last verified checkpoint
```

### Gate 10: Twice-through and independent verification

No completion claim until:

- Two reset-to-finish browser runs pass.
- An independent verifier repeats the run.
- All evidence uses the same commit.

### Gate 11: Clean-clone proof

Clone into a new directory and follow only the README. Hidden local files, caches, paths, or worktrees invalidate release readiness.

### Gate 12: Public-release security and licensing

Before public visibility:

- Scan current files and Git history for credentials.
- Verify ignored local secrets.
- Inventory tracked PDFs.
- Record dataset/source redistribution status.
- Test anonymous repository access.

## Required owner-visible status report

At every checkpoint, the lead should provide:

```text
Current goal:
Visible behavior changed:
Active branch and commit:
Files touched:
What works now:
What remains broken:
Tests actually run:
Browser evidence:
Product decisions made:
Owner decision required:
Next checkpoint:
```

The owner should not need to interpret raw diffs to understand progress.

## Five rules that would have prevented most failures

1. No downstream implementation until real PDF text is readable.
2. No parallel implementation until one complete browser path works.
3. No product-affecting substitution without owner approval.
4. No completion claim without browser evidence on the integrated commit.
5. One active branch, one server, one controlling specification, and one status file.

## Final audited status

At the time of the audit, TripPoint was a partially real technical prototype, not a completed MVP.

It had real GPT-5.6 integration, source retrieval, generated lesson output, quiz branching, live Dialogue, and local persistence. It did not yet have a trustworthy readable source experience, reliable topic retrieval, reference-matched UI, verified active sandbox path, current end-to-end browser coverage, independent reproduction, or a self-contained clean-checkout package.

No passing build or unit-test count should be used to override that conclusion.
