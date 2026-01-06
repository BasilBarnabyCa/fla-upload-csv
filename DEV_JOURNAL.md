# Dev Journal - FLA CSV Upload Tool

## 2026-01-06 (Evening) - User Management CRUD & Security Enhancements

### 🎯 **Overview**
Implemented comprehensive user management system with CRUD operations, role-based access control, protected users, password reset functionality, and AWS IAM-style credential export. Reorganized function structure into logical groups and added special protection for "admin" username.

### ✅ **What Was Accomplished**

**User Management CRUD Interface:**
- **Full CRUD operations** - Create, Read, Update, Delete users via admin interface
- **User list page** (`/users`) - Table view with username, role, status, creation date
- **Create user modal** - Username + role dropdown, auto-generated 16-character passwords
- **Edit user modal** - Update role, status, optional password change
- **Delete confirmation** - Soft delete (sets isActive=false) with confirmation
- **Password reset** - Generate new password and display once (AWS IAM pattern)
- **CSV credential export** - Download credentials file matching AWS IAM format

**Role-Based Access Control:**
- **SUPERADMIN role** - Highest privilege level, can manage all users
- **ADMIN role** - Can manage regular users, cannot see/edit SUPERADMIN users
- **USER role** - Standard user with upload permissions
- **Protected users** - Cannot be edited/deleted by regular admins
- **"admin" username protection** - Special protection: only SUPERADMIN or the user itself can edit

**Security Features:**
- **Password generation** - Secure 16-character passwords with uppercase, lowercase, numbers, special chars
- **Password shown once** - Like AWS IAM, passwords displayed once then never again
- **CSV download** - Credentials file for secure distribution (matches AWS IAM format)
- **Audit logging** - All user operations logged (CREATE, UPDATE, DELETE, PASSWORD_RESET)
- **SUPERADMIN invisibility** - Regular admins cannot see SUPERADMIN users in list
- **Self-edit protection** - Users can edit their own details (for "admin" username)

**Code Organization:**
- **Folder restructuring** - Grouped functions into `auth/`, `users/`, `uploads/` folders
- **Cleaner structure** - Better organization matching feature areas
- **Updated imports** - Fixed import paths for nested folder structure

**Database Schema:**
- **Protected field** - Boolean flag to mark protected users
- **SUPERADMIN role** - Added to UserRole enum
- **Audit actions** - Added USER_UPDATED, USER_DELETED, USER_PASSWORD_RESET

### 🔧 **Technical Implementation**

**User Management Endpoints:**
- `GET /api/users` - List all users (filtered by role)
- `GET /api/users/{id}` - Get single user details
- `POST /api/users/create` - Create new user (auto-generates password)
- `PUT /api/users/{id}` - Update user (role, status, password)
- `DELETE /api/users/{id}` - Soft delete user (sets isActive=false)
- `POST /api/users/{id}/reset-password` - Reset password (returns new password once)

**Protected User Logic:**
```javascript
// Special protection for "admin" username
const isAdminUser = existingUser.username.toLowerCase() === 'admin';
const isSelfEdit = existingUser.username.toLowerCase() === tokenPayload.username.toLowerCase();

if (isAdminUser && tokenPayload.role !== 'SUPERADMIN' && !isSelfEdit) {
  throw new ForbiddenError('The admin user can only be edited by super administrators or itself');
}
```

**Password Generation:**
```javascript
export function generatePassword(length = 16) {
  // Ensures uppercase, lowercase, number, special char
  // Shuffled to avoid predictable patterns
}
```

**CSV Export (AWS IAM Format):**
```javascript
const csvContent = [
  ['User name', 'Password', 'Access key ID', 'Secret access key', 'Console login link'],
  [username, password, 'N/A', 'N/A', loginUrl]
];
```

**Folder Structure:**
```
api/
├── auth/
│   └── login/
├── users/
│   ├── create/
│   ├── delete/
│   ├── get/
│   ├── list/
│   ├── reset_password/
│   └── update/
├── uploads/
│   ├── complete/
│   ├── get/
│   └── sas/
└── shared/
```

### 📋 **Files Modified**

**New Files:**
- `api/users/create/index.js` - User creation endpoint
- `api/users/list/index.js` - List users endpoint
- `api/users/get/index.js` - Get user endpoint
- `api/users/update/index.js` - Update user endpoint
- `api/users/delete/index.js` - Delete user endpoint
- `api/users/reset_password/index.js` - Password reset endpoint
- `api/scripts-create-superadmin.js` - Script to create super admin user
- `src/pages/Users.vue` - User management UI page
- `prisma/migrations/*` - Database migrations for protected field and SUPERADMIN role

**Modified Files:**
- `api/index.js` - Updated imports for new folder structure
- `api/shared/users.js` - Added password generation, protected user functions, SUPERADMIN filtering
- `src/apiClient.js` - Added user management API functions, CSV download helper
- `src/main.js` - Added `/users` route with admin check
- `src/App.vue` - Added navigation menu with Users link (admin only)
- `prisma/schema.prisma` - Added protected field, SUPERADMIN role, new audit actions
- `package.json` - Added `create-superadmin` script

**Deleted Files:**
- `api/manual-generate.js` - Removed (not needed, troubleshooting script)
- `api/generate-client.js` - Removed (not needed, troubleshooting script)

**Moved Files (Reorganization):**
- `api/auth_login/` → `api/auth/login/`
- `api/users_*/` → `api/users/*/`
- `api/uploads_*/` → `api/uploads/*/`

### 🚀 **Current Status**
- ✅ User management CRUD fully functional
- ✅ Role-based access control implemented
- ✅ Protected users and SUPERADMIN role working
- ✅ Password reset with AWS IAM-style display
- ✅ CSV credential export functional
- ✅ "admin" username special protection
- ✅ Code organized into logical folders
- ✅ All endpoints properly secured

### 💡 **Key Decisions & Lessons**

**Password Management:**
- Follow AWS IAM pattern: show password once, then never again
- Auto-generate secure passwords (16 chars, mixed character sets)
- CSV export for bulk onboarding scenarios
- Password reset generates new password (old one invalidated)

**User Protection:**
- Protected flag prevents accidental edits/deletes
- "admin" username gets special protection (can self-edit)
- SUPERADMIN users hidden from regular admins (security through obscurity)
- Self-deletion prevented (prevents lockout)

**Folder Organization:**
- Group by feature area (auth, users, uploads) not by HTTP method
- Makes codebase easier to navigate
- Import paths updated to `../../shared/` for nested folders
- Azure Functions discovers functions by folder structure

**Security Best Practices:**
- Passwords hashed with Argon2 (industry standard)
- Passwords never stored in plaintext
- Credentials shown once, then gone forever
- All user operations audited
- Role-based access enforced at API level

---

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
