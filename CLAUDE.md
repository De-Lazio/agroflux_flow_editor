# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flow Editor is a visual editor for the navigation flow of the AgroFlux Bénin mobile app (helps agricultural product resellers access market info — prices, animation days — in local languages: Fon, Yoruba, Dendi, Adja). The flow is authored here as `flow.json`, which is the contract consumed directly by the backend and the Flutter app — no navigation logic is duplicated on either side.

The flow (single "dynamic" format) has 5 node types, defined as a discriminated union on `type` in `src/types/flow.ts`:
- **root**: main menu, a list of options each with its own `next` target.
- **grid**: presents the values of a variable (`options_source`) as choices, storing the pick under a param name (`set`).
- **pre_filter**: internal filter — narrows a list from a hashmap (`filtre_source`) keyed by another variable (`cle`).
- **result**: displays the final response from an API endpoint (`data_source`: endpoint/method/params), with response examples.
- **calendrier**: date-picker widget (`periode`, `cadran`).

Core workflow: Load `flow.json` → visualize as a graph (React Flow) → edit nodes/properties → validate → save back to JSON.

For the business-logic/requirements narrative behind all of this, read `context.md` first when picking up unfamiliar territory — it's the source of truth the code implements.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — production build (`tsc -b` then `vite build`). CI also runs `npx tsc -b --noEmit` as a separate type-check step.
- `npm run lint` — ESLint (flat config, TypeScript + react-hooks + react-refresh rules).
- `npm run test` — run the full Vitest suite (`src/**/*.test.ts`, node environment, no jsdom).
- `npx vitest run src/utils/validator.test.ts` — run a single test file. `npx vitest run -t "name fragment"` filters by test name.
- `npm run preview` — preview the production build.

CI (`.github/workflows/ci.yml`) runs, in order: lint → type-check → test → build. Node 22.

## Architecture

### State ownership
All app state lives in `src/App.tsx` as plain `useState` (nodes, edges, variables, hashmaps, active-overrides, audio mappings, languages, config, entry node, undo/redo history). No external state library — prop-drilled into panel components. Keep it that way unless the number of cross-cutting states grows significantly.

The canonical `FlowData` JSON is never kept as a single object in state; it's assembled on demand via `getCurrentFlow()` (→ `flowToJson`) whenever something needs a point-in-time read (Validate, Save, Studio). Session state auto-saves to `localStorage` (`agroflux_flow_session`) on every change; explicit persistence is JSON file download/upload — there is no backend for the editor itself.

### Data flow: JSON ⇄ graph
`src/utils/flowManager.ts` converts between `FlowData` (the JSON schema) and the React Flow `nodes`/`edges` graph (`jsonToFlow` / `flowToJson`), and provides Dagre-based auto-layout (`getLayoutedElements`). `src/utils/nodeFactory.ts` builds default node structures per type when creating new nodes.

### Active-state overlay
`active_overrides` (see `src/utils/activeState.ts` and `PLAN_ACTIVE_STATE.md`) is an *additive* overlay listing only inactive variable values / hashmap keys-values — everything not listed is active by default. It never restructures `variables`/`hashmaps` themselves. `ActiveControlledNodeData` (`can_choix_all`, `controle_active`) on `grid`/`pre_filter` nodes is purely declarative in the editor — the mobile app/backend applies it at runtime.

### Validation & backend contract
- `src/utils/validator.ts`: `validateFlow` walks the graph, detects broken links/orphan nodes, and produces a `ValidationReport` listing every resource (audio/image) referenced by nodes plus every resource implied by variables/hashmaps.
- `src/utils/backendContract.ts`: `buildBackendContract` derives, from `result` nodes only, the list of backend routes to implement (endpoint + method + params + response example), grouped by (endpoint, method). Regenerates fully on every call — never manually maintained. See `API_BACKEND_ROUTES.md` for the documented contract of the 6 routes.
- Default HTTP method for a `data_source` without an explicit `method` is `DEFAULT_HTTP_METHOD` ('POST', exported from `src/types/flow.ts`) — import that constant everywhere rather than repeating the literal.

### Resources (Studio)
The "Studio" (`StudioPanel.tsx`, opened from the toolbar) has three tabs backed by the **File System Access API** (Chrome/Edge/Opera only — `src/utils/fsAccess.ts`; no degraded mode elsewhere, `isFileSystemAccessSupported()` gates the whole panel):
- **Resources** (`AssetRepositoryTab.tsx` / `src/utils/assetRepository.ts`): scans a real resources directory into a `Manifest`/`Repository` (recursive walk + hashing).
- **Build** (`BuildTab.tsx` / `src/utils/buildProject.ts` → `runBuild`): validates the flow, scans resources, reconciles the two (`src/utils/resourceReconciliation.ts` — "missing" vs "orphaned" resources), derives the backend contract, and writes 8 output files (flow.json, resource_inventory, manifest, repository, validation_report .json/.md, backend_contract .json/.md) to a chosen output directory. Writes nothing if the flow has blocking errors — never a partial/inconsistent output.
- **Publication** (`PublicationTab.tsx` → `preparePublication`): reuses `runBuild` as-is, then additionally copies into `publishDirHandle/assets/` only the resource files actually referenced by the flow (never orphans, never a blind directory copy) — the "clean" output meant for backend/Flutter to consume.

`src/utils/resourceInventory.ts` holds the audio/image path-generation logic and default formats (`DEFAULT_AUDIO_FORMAT`, `DEFAULT_IMAGE_FORMAT`); only audio is per-language (`src/utils/languages.ts`), images never depend on language.

### Simulator
`src/utils/simulationEngine.ts` is pure logic (no React, no disk/network access) for walking the flow interactively: resolving options per node type, tracking a `SimulationContext` (`values` + `history`), building the simulated API call, detecting the `audio_sequence` response envelope. `SimulatorPanel.tsx` (+ `simulator/SimulatorStepBody.tsx`, `simulator/SimulatorResultPanel.tsx`) is the orchestration/UI layer on top; `src/utils/simulationResources.ts` and `simulatorConfig.ts` handle on-disk resource resolution for playback. See `simulation_plan.md` for the design.

### Remote import
`src/utils/remoteImport.ts` imports Variables/HashMaps (with active state) from a remote API route in two phases: `fetchRemoteData()` fetches/validates shape, then `computeImportDiff()` / `applyImport()` merge with local data (values *and* active_overrides), surfacing conflicts for manual resolution in `ApiImportPanel.tsx`. Exact expected backend format is documented in `API_IMPORT_FORMAT.md`.

### Node editing & rendering
- `src/components/CustomNode.tsx`: node color coding — root indigo, grid cyan, result rose, calendrier violet, pre_filter amber (`#4f46e5`/`#06b6d4`/`#f43f5e`/`#8b5cf6`/`#f59e0b`).
- `src/components/NodeEditor.tsx`: side panel for editing all properties of the selected node (audio sequences, options, API data source, filters).
- `src/types/flow.ts` also exports `FlowNodeProbe`, a deliberately permissive view used only by the validator to probe type-specific fields (`options_source`, `next`, `cle`, ...) on possibly-imperfect imported JSON without writing one type guard per field.

## Conventions

- TypeScript everywhere; functional components with hooks.
- `FlowNodeData` is a discriminated union on `type` — each node type only carries the fields meaningful to it. When adding a field meaningful to only one node type, extend that type's interface, not `BaseNodeData`.
- ESLint rule override: `no-unused-vars` allows unused vars via rest-sibling destructuring (`const { id, ...rest } = obj` to intentionally drop a property).
- Business-logic comments in the codebase (French) tend to explain *why*, referencing the relevant `PLAN_*.md`/`context.md` section — when extending that logic, check the referenced plan doc before diverging from documented conventions (e.g. default HTTP method, active-overrides being additive-only).
