# Dev Journal - FLA CSV Upload Tool

## 2026-01-06 - Azure Functions v4 Programming Model Setup & Critical Fixes

### 🏗️ **ARCHITECTURE**

#### 🎯 **Overview**
Successfully set up Azure Functions v4 programming model for the CSV upload tool, resolving critical function registration timing issues, route configuration problems, and response serialization errors. Transitioned from mixed function.json/programming model to pure programming model approach.

#### 🚨 **Critical Issues & Errors**
- **"A function can only be registered during app startup"** - Functions were being loaded lazily instead of synchronously at startup
- **Routes showing as `/api/auth_login` instead of `/api/auth/login`** - Route configuration conflicts between function.json and code
- **Response showing `[object Object]`** - Using `body` instead of `jsonBody` in error responses
- **404 errors on API endpoints** - Functions not registering properly due to timing issues
- **"Mixed function app" warnings** - Having both function.json files AND app.http() calls

#### ✅ **What Was Accomplished**

**Azure Functions v4 Programming Model Setup:**
- **Removed all function.json files** - Using pure programming model with `app.http()` calls
- **Created root `api/index.js`** - Ensures all functions register synchronously at startup
- **Fixed route configuration** - Routes now defined in code with `route` property in `app.http()`
- **Fixed response format** - Changed error handler from `body` to `jsonBody` for proper JSON serialization
- **Resolved function registration timing** - All functions now register before worker accepts requests

**Authentication & User Management:**
- **JWT authentication** - Implemented with Argon2 password hashing
- **User creation script** - `npm run create-user` for database-backed user management
- **Role-based access control** - ADMIN role required for user creation
- **Database truncation** - Script to clear all tables for fresh starts

**Development Workflow:**
- **Concurrent dev servers** - `npm run start` runs both Vite and Functions simultaneously
- **Restart script** - `npm run restart` kills processes and restarts cleanly
- **Port management** - Scripts to kill processes on ports 5173, 5174, 7071

**Documentation:**
- **Technical documentation** - Created comprehensive TECHNICAL_DOCS.md explaining Azure Functions v4 architecture
- **README updates** - Added reference to technical docs
- **Gitignore configuration** - Added `api/local.settings.json` to protect secrets

#### 🔧 **Technical Implementation**

**Function Registration Pattern:**
```javascript
// api/index.js - CRITICAL: Loads all functions at startup
import './auth_login/index.js';
import './users_create/index.js';
import './uploads_sas/index.js';
import './uploads_get/index.js';
import './uploads_complete/index.js';
```

**Function Definition:**
```javascript
// api/auth_login/index.js
import { app } from '@azure/functions';

app.http('auth_login', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/login',  // Custom route (not in function.json)
  handler: async (request, context) => {
    // Handler code
    return {
      status: 200,
      headers: corsResult.headers,
      jsonBody: { token, username }  // Use jsonBody, not body
    };
  }
});
```

**Error Response Format:**
```javascript
// api/shared/errors.js
export function handleError(error, context) {
  return {
    status: error.statusCode,
    jsonBody: {  // ✅ jsonBody for JSON responses
      error: {
        code: error.code,
        message: error.message
      }
    }
  };
}
```

**Vite Proxy Configuration:**
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:7071',
      changeOrigin: true,
      secure: false
    }
  }
}
```

#### 📋 **Files Modified**

**Function Registration:**
- `api/index.js` - **NEW**: Root file that imports all functions for startup registration
- `api/startup.js` - Alternative entry point (created but not used)
- `api/package.json` - Added `main: "index.js"` (later removed, not needed)

**Function Definitions:**
- `api/auth_login/index.js` - Added `route: 'auth/login'`, removed route from function.json
- `api/users_create/index.js` - Added `route: 'users/create'`
- `api/uploads_sas/index.js` - Added `route: 'uploads/sas'`
- `api/uploads_get/index.js` - Added `route: 'uploads/{id}'`, fixed to use `request.params.id`
- `api/uploads_complete/index.js` - Added `route: 'uploads/complete'`

**Removed Files:**
- `api/auth_login/function.json` - Removed (programming model only)
- `api/users_create/function.json` - Removed
- `api/uploads_sas/function.json` - Removed
- `api/uploads_get/function.json` - Removed
- `api/uploads_complete/function.json` - Removed

**Error Handling:**
- `api/shared/errors.js` - Changed `body` to `jsonBody` in error responses

**Configuration:**
- `.gitignore` - Added `api/local.settings.json` to protect secrets
- `api/package.json` - Updated scripts, added main entry point (later removed)

**Documentation:**
- `docs/TECHNICAL_DOCS.md` - **NEW**: Comprehensive technical documentation
- `README.md` - Added reference to technical docs

#### 🚀 **Current Status**
- ✅ Azure Functions v4 programming model fully functional
- ✅ All functions registering correctly at startup
- ✅ Routes working correctly (`/api/auth/login`, `/api/users/create`, etc.)
- ✅ Error responses properly serialized as JSON
- ✅ Frontend connecting to API successfully
- ✅ Login functionality working
- ✅ User creation script functional
- ✅ Development workflow streamlined with concurrent servers
- ✅ Technical documentation complete

#### 🎯 **Next Steps**
- [ ] Test file upload functionality end-to-end
- [ ] Verify SAS token generation and blob upload
- [ ] Test audit logging functionality
- [ ] Deploy to Azure Static Web Apps
- [ ] Set up production environment variables
- [ ] Configure CORS for production domain
- [ ] Test authentication flow in production

#### 💡 **Key Decisions & Lessons**

**Why Remove function.json Files:**
- Azure Functions v4 programming model uses `app.http()` in code
- Having both function.json AND code routes caused conflicts
- Pure programming model gives full control over routes in code
- Eliminates "mixed function app" warnings

**Why Root index.js is Critical:**
- Azure Functions v4 requires functions to register synchronously at startup
- Without root index.js, functions load lazily (on-demand)
- Lazy loading causes "can only be registered during app startup" error
- Root index.js ensures all functions register before worker accepts requests

**Why jsonBody Not body:**
- Azure Functions v4 programming model uses `jsonBody` for JSON responses
- Using `body` tries to serialize object as string → `[object Object]`
- Error responses must use `jsonBody` for proper JSON serialization
- Success responses also use `jsonBody` for consistency

**Route Configuration:**
- Routes defined in `app.http()` with `route` property
- Route parameters accessed via `request.params.id` (not URL parsing)
- Routes become `/api/{route}` automatically
- No need for function.json route definitions

**Development Workflow:**
- Use `npm run start` to run both servers concurrently
- Use `npm run restart` to clean restart everything
- Vite proxies `/api` requests to Functions on port 7071
- Functions auto-reload on code changes (hot reload)

**Security:**
- `local.settings.json` contains secrets → must be gitignored
- Use `local.settings.json.example` as template
- JWT_SECRET must be strong (use `openssl rand -hex 32`)
- Database credentials never committed

#### 🔗 **Related Resources**
- Azure Functions v4 Programming Model: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions v4 Migration Guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Vite Proxy Configuration: https://vitejs.dev/config/server-options.html#server-proxy
- JWT Authentication: https://jwt.io/

---
