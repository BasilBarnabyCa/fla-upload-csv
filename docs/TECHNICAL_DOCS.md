# Azure Functions v4 Programming Model - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Azure Functions v4 Programming Model](#azure-functions-v4-programming-model)
3. [Function Registration & Startup](#function-registration--startup)
4. [Route Configuration](#route-configuration)
5. [Response Format](#response-format)
6. [Frontend Integration](#frontend-integration)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## Architecture Overview

This project uses **Azure Functions v4 Programming Model** (not the classic model with `function.json`). Here's how it works:

```
┌─────────────────┐
│   Frontend      │
│   (Vue 3)       │
│   Port 5173     │
└────────┬────────┘
         │ HTTP (proxied)
         ▼
┌─────────────────┐
│   Vite Dev      │
│   Proxy         │
│   /api → 7071   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure Functions │
│   Port 7071     │
│   v4 Runtime    │
└────────┬────────┘
         │
         ├───► PostgreSQL (metadata)
         └───► Azure Blob Storage (files)
```

---

## Azure Functions v4 Programming Model

### Key Difference from Classic Model

**Classic Model (v1/v2):**
- Functions defined in `function.json` files
- Code in `index.js` is just a handler function
- Routes defined in `function.json`

**Programming Model (v4):**
- Functions registered using `app.http()` in code
- No `function.json` files needed (we removed them)
- Routes defined in code with `route` property
- Functions must be registered **synchronously at startup**

### Function Structure

Each function follows this pattern:

```javascript
// api/auth_login/index.js
import { app } from '@azure/functions';

app.http('auth_login', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/login',  // Custom route
  handler: async (request, context) => {
    // Your handler code
    return {
      status: 200,
      headers: { /* CORS headers */ },
      jsonBody: { /* response data */ }
    };
  }
});
```

**Key Properties:**
- `app.http(name, config)` - Registers an HTTP function
- `name` - Function identifier (must match folder name)
- `methods` - HTTP methods this function accepts
- `authLevel` - Authentication level (`anonymous` means we handle auth ourselves)
- `route` - Custom URL path (optional, defaults to function name)
- `handler` - Async function that processes requests

---

## Function Registration & Startup

### The Critical Issue: Registration Timing

Azure Functions v4 requires **all functions to be registered during app startup**, not lazily when requested. This caused the error:

```
Worker was unable to load function: 'A function can only be registered during app startup.'
```

### Solution: Root `index.js` File

We created `/api/index.js` that imports all function modules:

```javascript
// api/index.js
import './auth_login/index.js';
import './users_create/index.js';
import './uploads_sas/index.js';
import './uploads_get/index.js';
import './uploads_complete/index.js';
```

**Why This Works:**
1. When Azure Functions starts, it loads modules
2. Each `index.js` file calls `app.http()` to register the function
3. By importing all functions in the root `index.js`, they're all registered synchronously
4. Azure Functions discovers functions from the folder structure, then loads the code

### How Azure Functions Discovers Functions

1. **Discovery Phase**: Azure Functions scans for function folders (directories with `index.js`)
2. **Loading Phase**: For each discovered function, it loads the `index.js` file
3. **Registration Phase**: The `app.http()` calls register functions with the runtime
4. **Startup Complete**: All functions must be registered before the worker accepts requests

**Important**: If a function's `index.js` is loaded AFTER the worker starts accepting requests, you get the "can only be registered during app startup" error.

### Why We Removed `function.json` Files

We initially had both `function.json` files AND `app.http()` calls. This created conflicts:

- `function.json` defines routes → Azure Functions uses those routes
- `app.http()` also defines routes → Conflict!
- Mixed model caused "mixed function app" warnings

**Solution**: Use ONLY the programming model (no `function.json` files). Routes are defined in code.

---

## Route Configuration

### How Routes Work

Routes are defined in the `app.http()` call:

```javascript
app.http('auth_login', {
  route: 'auth/login',  // This becomes /api/auth/login
  // ...
});
```

**Route Patterns:**
- `'auth/login'` → `/api/auth/login`
- `'uploads/{id}'` → `/api/uploads/{id}` (with `request.params.id`)
- `'users/create'` → `/api/users/create`

**Accessing Route Parameters:**

```javascript
// For route: 'uploads/{id}'
const uploadId = request.params.id;  // Extract from route
```

### Why Routes Must Be in Code (Not function.json)

In Azure Functions v4 programming model:
- Routes defined in `function.json` are ignored
- Routes MUST be in the `route` property of `app.http()`
- If you omit `route`, it defaults to the function name (`auth_login` → `/api/auth_login`)

---

## Response Format

### Correct Response Structure

Azure Functions v4 programming model expects responses in this format:

```javascript
return {
  status: 200,           // HTTP status code
  headers: {             // Response headers (CORS, etc.)
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  jsonBody: {            // JSON response body (NOT 'body')
    token: '...',
    username: 'admin'
  }
};
```

### Common Mistake: `body` vs `jsonBody`

**Wrong:**
```javascript
return {
  status: 400,
  body: { error: '...' }  // ❌ Results in [object Object]
};
```

**Correct:**
```javascript
return {
  status: 400,
  jsonBody: { error: '...' }  // ✅ Properly serialized JSON
};
```

**Why**: Azure Functions v4 programming model uses `jsonBody` for JSON responses. Using `body` tries to serialize the object as a string, resulting in `[object Object]`.

### Error Responses

Error handling uses the same format:

```javascript
// api/shared/errors.js
export function handleError(error, context) {
  return {
    status: error.statusCode,
    jsonBody: {  // ✅ Use jsonBody
      error: {
        code: error.code,
        message: error.message
      }
    }
  };
}
```

---

## Frontend Integration

### Vite Proxy Configuration

The frontend runs on port 5173, Functions on 7071. Vite proxies API requests:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

**How It Works:**
1. Frontend makes request to `/api/auth/login`
2. Vite intercepts `/api/*` requests
3. Vite forwards to `http://localhost:7071/api/auth/login`
4. Functions processes request and returns response
5. Vite forwards response back to frontend

### API Client Pattern

```javascript
// src/apiClient.js
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}
```

**Key Points:**
- Uses `/api` prefix (proxied by Vite)
- JWT token stored in `localStorage`
- Error responses are JSON with `{ error: { code, message } }` structure

---

## Common Issues & Solutions

### Issue 1: "A function can only be registered during app startup"

**Cause**: Functions are being loaded lazily (on-demand) instead of at startup.

**Solution**: Ensure root `api/index.js` imports all function modules:
```javascript
import './auth_login/index.js';
import './users_create/index.js';
// ... all functions
```

### Issue 2: Routes showing as `/api/auth_login` instead of `/api/auth/login`

**Cause**: Missing `route` property in `app.http()` call.

**Solution**: Add `route` property:
```javascript
app.http('auth_login', {
  route: 'auth/login',  // Add this
  // ...
});
```

### Issue 3: Response shows `[object Object]`

**Cause**: Using `body` instead of `jsonBody`.

**Solution**: Change to `jsonBody`:
```javascript
return {
  status: 200,
  jsonBody: { data: '...' }  // Not 'body'
};
```

### Issue 4: 404 on API endpoints

**Cause**: Functions not running or routes incorrect.

**Solution**: 
1. Check Functions is running: `lsof -ti:7071`
2. Verify routes in function code match what frontend expects
3. Check Vite proxy is configured correctly

### Issue 5: "Mixed function app" warning

**Cause**: Having both `function.json` files AND `app.http()` calls.

**Solution**: Remove `function.json` files, use only programming model.

---

## Development Workflow

### Starting the Application

```bash
npm run start
# or
npm run dev:all
```

This runs:
- Vite dev server (port 5173)
- Azure Functions (port 7071)

### Creating Users

```bash
npm run create-user <username> <password> [role]
# Example:
npm run create-user admin mypassword ADMIN
```

### Restarting Functions

```bash
npm run restart
```

Kills all processes and restarts both servers.

---

## File Structure Explained

```
api/
├── index.js              # Root file - imports all functions (CRITICAL)
├── startup.js            # Alternative entry point (if needed)
├── package.json          # Functions dependencies
├── local.settings.json   # Local environment variables
├── host.json             # Azure Functions configuration
│
├── auth_login/
│   └── index.js         # Function code (NO function.json)
│
├── users_create/
│   └── index.js         # Function code
│
├── uploads_sas/
│   └── index.js         # Function code
│
└── shared/              # Shared utilities
    ├── auth.js          # JWT validation
    ├── cors.js          # CORS handling
    ├── errors.js        # Error handling
    ├── jwt.js           # JWT generation/verification
    ├── prisma.js        # Database client
    └── users.js         # User operations
```

**Key Files:**
- `api/index.js` - **MUST** import all functions for startup registration
- Each function folder has `index.js` with `app.http()` call
- No `function.json` files (programming model only)
- `shared/` contains reusable code

---

## How It All Fits Together

1. **Startup**:
   - Azure Functions scans `api/` directory
   - Finds function folders (`auth_login/`, `users_create/`, etc.)
   - Loads `api/index.js` (if exists) or each function's `index.js`
   - Each `app.http()` call registers a function
   - Functions are now available at their routes

2. **Request Flow**:
   - Frontend → `/api/auth/login` → Vite proxy → `http://localhost:7071/api/auth/login`
   - Azure Functions matches route to registered function
   - Handler executes → Returns `{ status, headers, jsonBody }`
   - Response → Vite → Frontend

3. **Authentication**:
   - Login endpoint validates credentials → Returns JWT
   - Frontend stores JWT in `localStorage`
   - Subsequent requests include `Authorization: Bearer <token>`
   - Functions validate JWT using `validateAuth()` helper

---

## Key Takeaways

1. **Azure Functions v4 Programming Model** uses `app.http()` in code, not `function.json`
2. **All functions must register at startup** - use root `index.js` to import them
3. **Routes are in code** - use `route` property in `app.http()`
4. **Use `jsonBody` not `body`** for JSON responses
5. **Vite proxies `/api`** to Functions on port 7071
6. **No `function.json` files** - programming model only

This architecture gives you full control over function registration and routing in code, making it easier to maintain and debug.

