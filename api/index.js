// This file ensures all function modules are loaded at startup
// Azure Functions v4 programming model requires functions to be registered synchronously

// Import all function modules - this registers them with the app
import './auth_login/index.js';
import './users_create/index.js';
import './uploads_sas/index.js';
import './uploads_get/index.js';
import './uploads_complete/index.js';

