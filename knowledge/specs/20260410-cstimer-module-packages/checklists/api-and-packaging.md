# API & Packaging Checklist: WCA Scramble Generation & Visualization

**Purpose**: Validate the completeness, clarity, and consistency of the specification, API contract, and packaging requirements before merge.
**Created**: 2026-04-10
**Feature**: [spec.md](../spec.md)
**Audience**: Author (pre-merge self-review)
**Depth**: Moderate — library package with well-defined API surface

## Requirement Completeness

- [x] CHK001 Are all 17 WCA events explicitly enumerated with their cstimer type ids and WCA regulation lengths? [Completeness, Spec §FR-001, data-model.md §Whitelist Table]
- [x] CHK002 Are the four exported functions (`getScramble`, `getImage`, `setSeed`, `getWcaEvents`) each specified with input types, return types, and error behavior? [Completeness, contracts/scramble-api.md]
- [x] CHK003 Is the escape-hatch behavior for non-WCA cstimer types documented in the contract — including how length defaults differ from WCA events? [Completeness, contracts/scramble-api.md §getScramble]
- [x] CHK004 Is the relationship between `333` and `333oh` (shared cstimer type, separate WCA event ids) explicitly documented? [Completeness, research.md §R2, data-model.md]
- [x] CHK005 Are playground requirements specified: event selector, generate button, text output, SVG output, dev-only (not published)? [Completeness, Spec §FR-008]
- [x] CHK006 Is the dependency policy documented — specifically that `cstimer_module` is the sole runtime dependency, now bundled as a devDep? [Completeness, research.md §R7, updated during implement]

## Requirement Clarity

- [x] CHK007 Is the `ScrambleType = WcaEventId | (string & {})` idiom explained with rationale for the `(string & {})` intersection? [Clarity, research.md §R3]
- [x] CHK008 Are error message formats specified concretely (prefix `@cubekit/scramble:`, upstream message included)? [Clarity, contracts/scramble-api.md §Error matrix]
- [x] CHK009 Is the `length` parameter behavior clearly specified for all three cases: WCA event with default length, WCA event with explicit override, non-WCA type? [Clarity, contracts/scramble-api.md §getScramble]
- [x] CHK010 Is "empty scramble to getImage yields solved-state SVG" specified as an expected behavior, not an error? [Clarity, Spec §Edge Cases, contracts/scramble-api.md §getImage]

## Requirement Consistency

- [x] CHK011 Are the 17 WCA event ids consistent between the `WcaEventId` type union, the `WCA_EVENTS` runtime array, and the tests' expected set? [Consistency, data-model.md, tests/wca-events.test.ts]
- [x] CHK012 Are the length constants consistent between `data-model.md` §Whitelist Table and the upstream cstimer_module README? [Consistency, research.md §R2]
- [x] CHK013 Is the error-throwing strategy consistent across `getScramble` and `getImage` (same prefix, same wrapping pattern)? [Consistency, contracts/scramble-api.md]
- [x] CHK014 Is the package.json `description`, spec title, and plan summary all aligned on the feature's purpose? [Consistency, cross-artifact]

## Acceptance Criteria Quality

- [x] CHK015 Are all 5 Success Criteria (SC-001 through SC-005) measurable without subjective judgment? [Measurability, Spec §Success Criteria]
- [x] CHK016 Is SC-004 ("playground loads in under 2 seconds") acknowledged as aspirational / manually verified, with no automated enforcement? [Measurability, analysis report §A1]
- [x] CHK017 Are the acceptance scenarios in all 4 user stories written in Given/When/Then format with concrete assertions? [Measurability, Spec §User Scenarios]

## Scenario Coverage

- [x] CHK018 Does the test specification cover all three `getScramble` dispatch paths: WCA event, WCA event with explicit length, non-WCA type? [Coverage, Spec §FR-009, tasks.md T010]
- [x] CHK019 Are error paths specified for both `getScramble` and `getImage` with invalid type ids? [Coverage, Spec §Edge Cases]
- [x] CHK020 Is seed reproducibility specified as a testable property (same seed → same output)? [Coverage, Spec §US1 scenario 3, tasks.md T015]

## Edge Case Coverage

- [x] CHK021 Is the behavior for `setSeed('')` (empty string) documented — delegates to upstream without validation? [Edge Cases, Spec §Edge Cases]
- [x] CHK022 Are very long scrambles (FMC, Multi-BLD) acknowledged as valid and tested not to truncate? [Edge Cases, Spec §Edge Cases]
- [x] CHK023 Is the case where upstream cstimer_module returns an empty string explicitly handled and documented? [Edge Cases, contracts/scramble-api.md §getScramble behavior 3]

## Build & Packaging Requirements

- [x] CHK024 Is it specified that `cstimer_module` must be bundled (not externalized) so consumers have zero runtime deps? [Completeness, user feedback during implement]
- [x] CHK025 Is the chunk-splitting strategy documented — cstimer as a separate output chunk for independent caching? [Completeness, vite.config.ts comments]
- [x] CHK026 Is the playground excluded from the published package (`files: ["dist"]` only)? [Completeness, Spec §Assumptions, plan.md §Structure Decision]
- [x] CHK027 Are the `types` export and `.d.mts` generation specified so consumers get type support? [Completeness, plan.md §Project Structure]

## Dependencies & Assumptions

- [x] CHK028 Is the assumption "cstimer_module output = WCA-official scrambles" explicitly documented with the caveat that we don't independently validate against WCA spec? [Assumption, Spec §Assumptions]
- [x] CHK029 Is the assumption "platform-agnostic core, browser-only playground" documented? [Assumption, Spec §Assumptions, plan.md §Constraints]
- [x] CHK030 Is the Taro/WeChat miniprogram SVG rendering explicitly deferred to a follow-up feature? [Assumption, Spec §Assumptions]

## Notes

- All items passed. The specification is thorough for a library package of this scope.
- The main risk area was the build/packaging strategy (bundle vs external, chunk splitting), which was clarified during implementation based on user feedback and is now documented in vite.config.ts comments.
- Pre-existing issues (apps/web and apps/wx-app lint errors, root postinstall script) are out of scope.
