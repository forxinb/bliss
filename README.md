# Bliss

**Business Logic Is Simple Script!**

A schema-driven full-stack JavaScript framework for building structured, validated, and type-safe APIs and UIs.

[![npm](https://img.shields.io/badge/npm-%40godbliss-blue)](https://www.npmjs.com/org/godbliss)
[![alpha](https://img.shields.io/badge/status-alpha-orange)]()

---

## Overview

Bliss is a full-stack JavaScript framework built around a **schema-based API Gateway pattern**. It lets you declaratively define the communication between server and client, handling validation, routing, and form management through a single, consistent approach.

### Why Bliss?

- **One schema, both sides**: The same schema definition powers server-side request validation and client-side form generation simultaneously.
- **Declarative APIs via the Gate Pattern**: Define schemas, errors, and success responses per route — the middleware handles validation and responses automatically.
- **UI library agnostic**: A Dependency Injection pattern lets you plug in any UI library (MUI, React Native Paper, etc.) without coupling.
- **First-class MongoDB support**: Built-in Document Helper, Cursor/Page Pagination, and Transaction utilities out of the box.

---

## Architecture
> 📦 There are other npm packages named bliss, blissjs, etc. Our packages are published under the **`@godbliss`** scope (e.g., `@godbliss/core`, `@godbliss/react`). Make sure you install from the `@godbliss` scope.

```
┌───────────────────────────────────────────────────────────────┐
│                        Applications                           │
│              (React Web / React Native / etc.)                │
├────────────────────────┬──────────────────────────────────────┤
│   @godbliss/react      │       @godbliss/express              │
│   ┌──────────────────┐ │ ┌────────────────────────────────┐   │
│   │ useGate          │ │ │ gating middleware              │   │
│   │ useSchema        │ │ │ ├─ schema validation           │   │
│   │ useGet           │ │ │ ├─ error/success handling      │   │
│   │ useAction        │ │ │ └─ JSON/BSON response          │   │
│   │ useDynamicSchema │ │ │                                │   │
│   │   Form           │ │ │ Document Helper (MongoDB)      │   │
│   └──────────────────┘ │ │ ├─ CRUD operations             │   │
│                        │ │ ├─ cursor/page pagination      │   │
│                        │ │ └─ transactions                │   │
│                        │ │                                │   │
│                        │ │ execute (route handler wrapper)│   │
│                        │ └────────────────────────────────┘   │
├────────────────────────┴──────────────────────────────────────┤
│                      @godbliss/core                           │
│   ┌───────────────┬──────────────┬────────────────────────┐   │
│   │ Schema Utils  │ Terminal     │ HTTP Client / Safe     │   │
│   │ (makeSchema,  │ (gateDefs,   │ (dataFetch,            │   │
│   │  SchemaFields)│  errorDefs,  │  handleJson/Bson)      │   │
│   │               │  successDefs)│                        │   │
│   ├───────────────┴──────────────┴────────────────────────┤   │
│   │ Singleton Exports: BSON, ObjectId, SimpleSchema       │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

---

## Packages

### [`@godbliss/core`](./packages/core)

Shared utilities used by all packages.

| Module | Description |
|---|---|
| **Schema Utils** | `makeSchema()` — create, extend, and merge schemas. Includes extended methods: `getForm()`, `getDmlForm()`, `alter()`, `pickAndAlter()`, etc. |
| **SchemaFields** | Field presets for common patterns: `readOnlyString()`, `oid()`, `yyyymmdd()`, `mustBeNull()` |
| **Terminal Utils** | `gateDefsFromRaw()`, `errorDefsFromRaw()`, `successDefsFromRaw()` — build processed Gate/Error/Success definitions from raw declarations |
| **HTTP Client** | `dataFetch()` — universal HTTP client with automatic JSON/BSON content-type detection |
| **Safe Utils** | `safeSpreadArguments()` — safely normalize arguments for spread operations |
| **Singleton Exports** | `BSON`, `ObjectId`, `SimpleSchema` — guaranteed single instances across the entire monorepo |

```js
const { makeSchema, SchemaFields, ObjectId, dataFetch } = require('@godbliss/core');
```

### [`@godbliss/express`](./packages/express)

Express middleware and MongoDB helpers for the server side.

| Module | Description |
|---|---|
| **Gating Middleware** | Schema-based request validation, parameter casting, and automated error/success response handling |
| **execute** | Route handler wrapper — automatically forwards sync/async errors to `next(err)` |
| **Document Helper** | `findDoc`, `findDocs`, `insertDoc`, `updateDoc`, `deleteDoc`, `upsertDoc`, `increase`, `decrease` |
| **Pagination** | Automatic cursor-based and page-based pagination |
| **Transaction** | `withTransaction()` — MongoDB transaction wrapper |
| **Collections** | `makeCollections()`, `registerCollection()` — collection registry with dev-mode Proxy support |

```js
const { middleware, mongo, utils } = require('@godbliss/express');
```

### [`@godbliss/react`](./packages/react)

React hooks for both React Web and React Native.

| Hook | Description |
|---|---|
| **useGate** | Manages API call context from gate definitions (URL generation, queryKey generation, schema/form binding) |
| **useSchema** | Schema-based form rendering and validation. Provides `formFieldRenderers`, `fullValidationErrors`, `inputtingValidationErrors` |
| **useGet** | `createUseGet()` factory — generates React Query–based GET request hooks (with Infinite Query support) |
| **useAction** | `createUseGateAction()`, `createUseGenericAction()` — generates React Query–based mutation hooks |
| **useDynamicSchemaForm** | Automatic MobX-based form state management that responds to dynamic schema changes |

```js
const { useGate, useSchema, createUseGet, createUseGateAction } = require('@godbliss/react');
```

---

## Core Concepts

### 1. Terminal Definitions

Declaratively define your API's errors, success responses, and gates.

```js
const { errorDefsFromRaw, successDefsFromRaw, gateDefsFromRaw } = require('@godbliss/core');

// Error definitions
const errorDefs = errorDefsFromRaw({
  request: {
    bad: { code: 400 },
    validationError: (custom) => ({ code: 400, ...custom })
  },
  system: {
    gateError: { code: 500 }
  }
});

// Success definitions
const successDefs = successDefsFromRaw({
  response: {
    ok: { code: 200, contentType: 'json' }
  }
});

// Gate definitions (3-level → 2-level automatic flattening)
const gateDefs = gateDefsFromRaw({
  '/users': {
    '': {
      'POST': { schema: createUserSchema }
    },
    '/:userId': {
      'GET': { schema: getUserSchema },
      'PUT': { schema: updateUserSchema }
    }
  }
});
```

### 2. Gating Middleware

Automates schema validation, parameter checking, and response handling based on terminal definitions.

```js
const { middleware } = require('@godbliss/express');

// Initialize at server startup
middleware.initializeTerminalDef({ errorDefs, successDefs, gateDefs });

// Apply to routes
router.post('/users', middleware.gating, execute(async (req, res) => {
  const { form, schema } = req.gate;    // validated form and schema
  // ...business logic
  res.gate.success('response.ok', { user });
}));
```

### 3. Schema System

An extended schema system built on top of `simpl-schema`, used on both server and client.

```js
const { makeSchema, SchemaFields } = require('@godbliss/core');

const userSchema = makeSchema({
  _id: SchemaFields.oid(),
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, initialValue: 'user', readOnly: true }
});

// Generate a form object (based on initialValue)
const form = userSchema.getForm();

// Generate a DML form (readOnly fields excluded)
const dmlForm = userSchema.getDmlForm(form);

// Extend schema with selected fields
const updateSchema = userSchema.pickAndAlter({
  name: { required: true },
  email: {}
});
```

### 4. React Hooks

Automatic form management, API integration, and validation driven by gate definitions.

```js
// Project-level setup (once)
const useGet = createUseGet({
  terminalDef: myTerminalDef,
  createQueryFn: ({ gate }) => async () => {
    const result = await dataFetch(API_URL + gate.urlSuffix);
    return result.data;
  },
  useQuery,
  useInfiniteQuery
});

// Usage in components
function UserList() {
  const { data, isLoading } = useGet('/users', {
    gateContext: {
      queryParams: { page: 1 }
    }
  });
}
```

---

## Installation

```bash
# pnpm (recommended)
pnpm add @godbliss/core
pnpm add @godbliss/express    # server
pnpm add @godbliss/react      # client

# npm
npm install @godbliss/core
npm install @godbliss/express
npm install @godbliss/react
```

### Peer Dependencies

Each package requires its peer dependencies to be installed in your project.

| Package | Peer Dependencies |
|---|---|
| `@godbliss/core` | `bson >=4`, `lodash >=4`, `simpl-schema >=3` |
| `@godbliss/express` | `express >=4.17`, `lodash >=4` |
| `@godbliss/react` | `react >=16.8`, `react-dom >=16.8`, `mobx >=5`, `mobx-react-lite >=3`, `@tanstack/react-query >=5` |

---

## Development

### Monorepo Structure

```
bliss/
├── packages/
│   ├── core/              # @godbliss/core — shared utilities
│   │   └── src/
│   │       └── utils/
│   │           ├── simpl-schema-utils/   # schema creation & extension
│   │           ├── terminal-utils/       # gate/error/success definition builders
│   │           ├── http-client-utils/    # HTTP client (JSON/BSON)
│   │           └── safe-utils/           # safe utility functions
│   ├── express/           # @godbliss/express — server middleware
│   │   └── src/
│   │       ├── middleware/
│   │       │   └── gating/              # schema-based gating middleware
│   │       ├── mongo/
│   │       │   ├── document/            # document CRUD + pagination
│   │       │   ├── collections.js       # collection registry
│   │       │   └── transaction.js       # transaction wrapper
│   │       └── utils/
│   │           └── execute.js           # route handler wrapper
│   └── react/             # @godbliss/react — React hooks
│       └── src/
│           └── hooks/
│               ├── use-gate/            # API gateway context
│               ├── use-schema/          # schema-based form rendering
│               ├── use-get/             # GET request hook factory
│               ├── use-action/          # mutation hook factory
│               └── use-dynamic-schema-form/  # dynamic schema form management
├── package.json           # root workspace configuration
└── pnpm-workspace.yaml    # pnpm workspace configuration
```

---

## Design Principles

### Singleton Identity
External libraries (`BSON`, `ObjectId`, `SimpleSchema`) are exported from `@godbliss/core` as single instances, ensuring `instanceof` checks work correctly across the entire monorepo.

### Schema-First
Schemas are at the center of everything. A single schema definition is used for server validation, form generation, DML transformation, and UI rendering.

### UI Library Agnostic
The React package is decoupled from any specific UI library through Dependency Injection. Use `setDefaultFormFieldRendererCreator()` to inject your project's renderer.

### Declarative API Definition
API endpoints are managed through **definitions**, not imperative code. Declare your Terminal/Gate definitions, and the middleware and React hooks consume them automatically.
