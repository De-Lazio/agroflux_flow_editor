# Flow Editor - AgroFlux Bénin

A visual editor for navigation flows used in the AgroFlux Bénin mobile application. The application helps female agricultural product resellers in Benin access market information (prices, animation days) in their local languages (Fon, Yoruba, Dendi, etc.).

## Project Overview

- **Purpose**: Create a tool to design, visualize, and modify navigation flows (represented in JSON) for the mobile app.
- **Context**: The mobile app uses a navigation flow based on local languages and audio instructions. This editor allows developers and product managers to refine the flow before implementation.
- **Data Structure**: The flow is defined in `flow.json` and consists of several node types:
    - **MENU**: Presents choices to the user.
    - **FILTER**: Progressive filtering (location, time, product) often via API.
    - **RESULTS**: Displays the final search results.
    - **WIDGET**: Specialized UI components like calendars.
- **Core Workflow**: Load `flow.json` -> Visualize as a graph -> Edit nodes and properties -> Save back to JSON.

## Technical Stack

- **Framework**: React 19 (TypeScript)
- **Build Tool**: Vite 8
- **Styling**: Vanilla CSS (based on `App.css` and `index.css`)
- **Linting**: ESLint 9 (TypeScript)
- **Recommended Library**: React Flow (for the visual graph interface)

## Getting Started

### Prerequisites

- Node.js (latest stable version recommended)
- npm or yarn

### Key Commands

- `npm run dev`: Start the development server.
- `npm run build`: Build the project for production.
- `npm run lint`: Run ESLint to check for code quality.
- `npm run preview`: Preview the production build locally.

## Development Conventions

- **Language**: Use TypeScript for all source files.
- **Components**: Functional components with React 19 features (e.g., React Compiler).
- **State Management**: Use React hooks (`useState`, `useReducer`, `useContext`) for local and global state.
- **Graph Logic**: Aim for a visual representation where nodes are color-coded by type:
    - 🟦 Blue: MENU
    - 🟩 Vert: FILTER
    - 🟨 Jaune: RESULTS
    - 🟪 Violet: WIDGET
- **Persistence**: Ensure the editor can import and export the `flow.json` format accurately.

## Important Files

- `flow.json`: The core data structure for the navigation flow.
- `context.md`: Detailed business logic and requirements for the editor.
- `src/App.tsx`: The main entry point for the application.
- `vite.config.ts`: Vite configuration, including React Compiler setup.
