# React Virtual Engine

High-performance, zero-allocation rendering engine monorepo.

## Project Structure

```
├── packages/
│   ├── core/                 # Core virtual engine library
│   └── react/                # React bindings for the virtual engine
├── examples/
│   └── introduction/         # Demo application
└── package.json              # Workspace root
```

## Development

### Install Dependencies

```bash
npm install
```

### Run Demo App

```bash
npm run dev:intro
```

The demo app will be available at http://localhost:5173 (default Vite port) or as specified in the console.

### Build All

```bash
npm run build
```

## Available Scripts

- `npm run dev:intro` - Run the introduction demo app
- `npm run dev:core` - Build core library in watch mode
- `npm run dev:react` - Build react bindings in watch mode
- `npm run build` - Build all workspaces
- `npm run build:core` - Build the core library only
- `npm run build:react` - Build the react library only
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Development Workflow

1. **Development**: Use `npm run dev:intro` to run the demo app and test features.
2. **Library Development**: Use `npm run dev:core` and `npm run dev:react` to watch and rebuild packages.
3. **Build**: Use `npm run build` to build all packages.

## Installation

The packages are published as `@virtual-engine/core` and `@virtual-engine/react` and can be installed via:

```bash
npm install @virtual-engine/core @virtual-engine/react
```

## Commit Conventions

This project follows these commit message conventions, which are **strictly enforced** via git hooks:

- `feat`: A new feature (Corresponds to a MINOR version update).
- `fix`: A bug fix (Corresponds to a PATCH version update).
- `refactor`: A code change that neither fixes a bug nor adds a feature (e.g., Switching Store from `useMemo` to `useState`).
- `perf`: A code change that improves performance (e.g., Adding Delayed Destruction for Strict Mode optimization).
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation (e.g., updating `package.json`).

> [!NOTE]
> Use English for documentation and commit messages. For details, see [.agent/workflows/commit-conventions.md]
