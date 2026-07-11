# Flow Editor - AgroFlux Bénin

A visual editor for navigation flows used in the AgroFlux Bénin mobile application. The application helps agricultural product resellers in Benin access market information (prices, animation days) in their local languages (Fon, Yoruba, Dendi, Adja).

## Project Overview

- **Purpose**: Create a tool to design, visualize, and modify navigation flows (represented in JSON) for the mobile app. This JSON is the contract consumed directly by the backend and by the Flutter app — no navigation logic is duplicated on either side.
- **Context**: The mobile app uses a navigation flow based on local languages and audio instructions. This editor allows developers and product managers to refine the flow before implementation.
- **Data Structure**: The flow is defined in `flow.json` (single "dynamic" format) and consists of 5 node types:
    - **root**: Main menu, presents a list of options (each with its own `next` target).
    - **grid**: Presents the values of a variable (`options_source`) as choices, optionally storing the pick in another variable (`set`).
    - **pre_filter**: Internal filter — narrows a list using a hashmap (`filtre_source`) keyed by another variable (`cle`).
    - **result**: Displays the final response from an API endpoint (`data_source`), with a JSON response contract and example responses.
    - **calendrier**: Date-picker widget (`periode`, `cadran`).
- **Core Workflow**: Load `flow.json` -> Visualize as a graph -> Edit nodes and properties -> Validate -> Save back to JSON.

## Resource Model

Beyond the graph itself, the editor manages the audio/image assets the flow depends on:

- **Variables**: reusable named lists of values (e.g. `produits: ["mais", "soja"]`).
- **HashMaps**: nested key → values structures (e.g. `marche_par_departement`), used by `pre_filter` nodes.
- **Mapping Audio & Image**: for each variable/hashmap, a resource folder (auto-generated, read-only, regenerate on demand) plus a global audio/image output format. From this, the editor generates the full expected resource inventory — one audio entry per active language declared on the flow (e.g. `audio/fon/produits/riz.mp3`), and a single, language-independent image entry (e.g. `images/marche_par_departement/oueme/ouando.jpeg`).
- **Validation report**: lists every resource referenced by nodes plus every resource generated from variables/hashmaps (broken down by origin), flags broken links, orphan nodes, and mapping issues.
- **Vérification des ressources sur disque**: generates a `tree` command for the user to run locally, imports the resulting `.txt`, and compares it against the inventory to flag missing assets.

## Technical Stack

- **Framework**: React 19 (TypeScript)
- **Build Tool**: Vite 8
- **Graph**: React Flow + Dagre (auto-layout)
- **Styling**: Tailwind CSS v4
- **Linting**: ESLint 9 (TypeScript)

## Getting Started

### Prerequisites

- Node.js (latest stable version recommended)
- npm or yarn

### Key Commands

- `npm run dev`: Start the development server.
- `npm run build`: Build the project for production (runs `tsc -b` then `vite build`).
- `npm run lint`: Run ESLint to check for code quality.
- `npm run test`: Run the test suite (Vitest).
- `npm run preview`: Preview the production build locally.

## Development Conventions

- **Language**: TypeScript for all source files.
- **Components**: Functional components with React hooks (`useState`, `useEffect`).
- **State Management**: Centralized in `src/App.tsx` (plain `useState`, prop drilling) — no external state library; keep it that way unless the number of cross-cutting states grows significantly.
- **Graph Logic**: Nodes are color-coded by type in `CustomNode.tsx` (root: indigo, grid: cyan, result: rose, calendrier: violet, pre_filter: amber).
- **Persistence**: Session auto-saved to `localStorage`; explicit save/load via JSON file download/upload (no backend).

## Important Files

- `flow.json`: The default/example flow, loaded on first run.
- `context.md`: Business logic and requirements for the editor.
- `src/App.tsx`: Main application shell and state.
- `src/utils/flowManager.ts`: JSON ⇄ ReactFlow graph conversion.
- `src/utils/validator.ts`: Flow validation + inventory report generation.
- `src/utils/resourceInventory.ts`: Resource mapping sync + generated-resource-path logic.
- `src/utils/nodeFactory.ts`: Default node structures per type.
- `vite.config.ts`: Vite configuration, including React Compiler setup.
