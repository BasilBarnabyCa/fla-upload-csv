# FLA CSV Upload Tool

Internal web tool for uploading CSV files to Azure Blob Storage without requiring Azure Storage Explorer.

> **📚 Technical Documentation**: See [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md) for detailed explanation of Azure Functions v4 programming model, function registration, routing, and architecture.

## Architecture

- **Frontend**: Vue 3 + Vite + Tailwind CSS (deployed to Azure Static Web Apps)
- **Backend**: Azure Functions (Node.js 20) integrated with SWA
- **Database**: Azure Database for PostgreSQL via Prisma
- **Storage**: Azure Blob Storage (private container, direct upload via SAS)

## Security

- **JWT Authentication** with Argon2 password hashing
- Origin + CORS lock (SWA origin only)
- Write-only, short-lived SAS tokens (5-10 min expiry)
- Server-controlled blob paths (never trust user filenames)
- CSV-only uploads with size limits (default 150MB)
- PII-safe audit logging (login attempts tracked)

## Development Setup

### Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4
- PostgreSQL database (local or Azure)
- Azure Storage Account with a container named `csv-uploads`

### Installation

1. Clone and install dependencies:
```bash
# Frontend
npm install

# Backend
cd api && npm install && cd ..
```

2. Set up environment variables:
```bash
# Copy example files
cp env.example.txt .env
cp api/local.settings.json.example api/local.settings.json

# Edit both files with your actual values:
# - Azure Storage credentials
# - PostgreSQL connection string
# - JWT_SECRET (use a strong random string, e.g., openssl rand -hex 32)
# - USER_CREDENTIALS (see below for creating users)
# - Allowed origins (your SWA URL + http://localhost:5173 for dev)
```

3. Set up Prisma (run from api directory):
```bash
cd api
npm run prisma:generate
npm run prisma:migrate
cd ..
```

Note: Prisma commands are configured to use the schema in `../prisma/schema.prisma`.

4. Create initial user account:
```bash
# Make sure DATABASE_URL is set in your environment
# First, generate Prisma client (if not already done)
cd api && npm run prisma:generate && cd ..

# Then create user (run from project root)
npm run create-user admin your-secure-password
```

This creates the user directly in the database. You can create additional users:
- Via script: `npm run create-user <username> <password>`
- Via API: `POST /api/users/create` (requires authentication)

4. Run development servers:

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Azure Functions):
```bash
cd api && npm start
```

The frontend will be available at `http://localhost:5173` and will proxy API calls to the Functions runtime.

### Environment Variables

**Root `.env` (for Vite):**
- `VITE_API_BASE` - API base URL (default: `/api`)
- `VITE_UPLOAD_TOOL_SECRET` - Shared secret (must match backend)

**API `local.settings.json` or production Function App settings:**
- `AZURE_STORAGE_ACCOUNT_NAME` - Storage account name
- `AZURE_STORAGE_ACCOUNT_KEY` - Storage account key
- `AZURE_STORAGE_CONTAINER_NAME` - Container name (default: `csv-uploads`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for signing JWT tokens (use `openssl rand -hex 32`)
- `JWT_EXPIRY_HOURS` - Token expiry in hours (default: 24)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins
- `MAX_FILE_SIZE_MB` - Max file size in MB (default: 150)
- `SAS_EXPIRY_MINUTES` - SAS token expiry (default: 10)

See `env.example.txt` for a complete reference.

## Deployment

### Azure Static Web Apps

1. **Create SWA resource** in Azure Portal
2. **Configure build settings:**
   - App location: `/`
   - Api location: `/api`
   - Output location: `dist`

3. **Set environment variables** in SWA Configuration:
   - Add all variables from `api/local.settings.json` to Function App settings
   - For production, consider using Azure Key Vault references

4. **Deploy:**
   ```bash
   # Build frontend
   npm run build

   # Deploy via GitHub Actions (auto-configured) or Azure CLI
   az staticwebapp deploy --name <your-app-name> --resource-group <resource-group>
   ```

5. **Run database migrations** in production:
   ```bash
   cd api
   DATABASE_URL="<production-connection-string>" npx prisma migrate deploy
   ```

### Security Checklist

- [ ] Generate strong `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Create initial admin user account
- [ ] Use strong passwords (minimum 8 characters)
- [ ] Set `ALLOWED_ORIGINS` to your production SWA URL only
- [ ] Enable HTTPS only in Azure Storage
- [ ] Configure Key Vault for secrets (recommended)
- [ ] Review audit logs regularly (login attempts are logged)
- [ ] Consider rate limiting for login endpoint

## Project Structure

```
fla-csv-upload-tool/
├── api/                    # Azure Functions
│   ├── uploads_sas/       # POST /api/uploads/sas
│   ├── uploads_complete/  # POST /api/uploads/complete
│   ├── uploads_get/       # GET /api/uploads/:id
│   └── shared/            # Shared utilities
│       ├── auth.js        # Authentication validation
│       ├── cors.js        # CORS handling
│       ├── validate.js    # Request validation
│       ├── blob.js        # Blob Storage operations
│       ├── prisma.js      # Prisma client
│       ├── audit.js       # Audit logging
│       ├── hash.js        # Hashing utilities
│       └── errors.js      # Error handling
├── src/                   # Vue frontend
│   ├── pages/
│   │   └── UploadCsv.vue  # Main upload page
│   ├── components/
│   │   ├── FilePicker.vue
│   │   ├── ProgressBar.vue
│   │   └── Alert.vue
│   ├── apiClient.js       # API client
│   ├── main.js           # App entry
│   └── App.vue
├── prisma/
│   └── schema.prisma     # Database schema
└── staticwebapp.config.json
```

## API Endpoints

### POST /api/auth/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

**Note:** Token should be included in subsequent requests as `Authorization: Bearer <token>`

### POST /api/users/create
Create a new user account (requires authentication).

**Request:**
```json
{
  "username": "newuser",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "id": "uuid",
  "username": "newuser",
  "createdAt": "2026-01-05T12:00:00Z"
}
```

### POST /api/uploads/sas
Request SAS URL for direct blob upload.

**Request:**
```json
{
  "originalName": "report.csv",
  "sizeBytes": 12345,
  "mimeType": "text/csv"
}
```

**Response:**
```json
{
  "uploadId": "uuid",
  "blobPath": "csv-uploads/2026-01-05/uuid.csv",
  "sasUrl": "https://...",
  "expiresAt": "2026-01-05T12:00:00Z"
}
```

### POST /api/uploads/complete
Mark upload as complete after blob upload succeeds.

**Request:**
```json
{
  "uploadId": "uuid",
  "etag": "...",
  "sha256": "optional-hex-string"
}
```

### GET /api/uploads/:id
Get upload metadata/receipt.

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2026-01-05T12:00:00Z",
  "status": "UPLOADED",
  "file": {
    "id": "uuid",
    "originalName": "report.csv",
    "blobPath": "csv-uploads/2026-01-05/uuid.csv",
    "sizeBytes": 12345,
    "uploadedAt": "2026-01-05T12:00:00Z"
  }
}
```

## Troubleshooting

**"Missing or invalid Authorization header"**
- Ensure you're logged in (check localStorage for `auth_token`)
- Token may have expired (default 24 hours) - log in again
- Check that `JWT_SECRET` is set correctly in backend settings

**CORS errors**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for exact origin being blocked

**Prisma errors**
- Run `npx prisma generate` after schema changes
- Ensure `DATABASE_URL` is correct
- Check database is accessible from your network

**Blob upload fails**
- Verify Azure Storage credentials
- Check container exists and is accessible
- Ensure SAS URL hasn't expired (default 10 minutes)

