// This file ensures all function modules are loaded at startup
// Azure Functions v4 programming model requires functions to be registered synchronously

// Import all function modules - this registers them with the app
import './auth/login/index.js';
import './users/create/index.js';
import './users/list/index.js';
import './users/get/index.js';
import './users/update/index.js';
import './users/delete/index.js';
import './users/reset_password/index.js';
import './uploads/validate/index.js';
import './uploads/sas/index.js';
import './uploads/get/index.js';
import './uploads/complete/index.js';
import './uploads/check_today/index.js';
import './uploads/delete_today/index.js';
import './audit/list/index.js';

