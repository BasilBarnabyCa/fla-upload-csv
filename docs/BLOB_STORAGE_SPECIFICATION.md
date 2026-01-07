# Azure Blob Storage Specification

This document describes how CSV files uploaded through the FLA CSV Upload Utility are stored in Azure Blob Storage. Use this specification to integrate with the main application or to understand file storage conventions.

## Storage Account Details

### Azure Storage Account
- **Account Name**: Configured via `AZURE_STORAGE_ACCOUNT_NAME` environment variable
- **Default Container**: `csv-uploads` (configurable via `AZURE_STORAGE_CONTAINER_NAME`)
- **Access Method**: Private access with Shared Access Signatures (SAS) tokens
- **Public Access**: Disabled (files are not publicly accessible)

### Container Structure
```
Azure Storage Account
└── csv-uploads/                    (container name)
    ├── 2026-01-07/                 (date folder: YYYY-MM-DD)
    │   ├── {uuid-1}.csv            (blob file)
    │   ├── {uuid-2}.csv            (blob file)
    │   └── ...
    ├── 2026-01-08/                 (next day's folder)
    │   └── {uuid}.csv
    └── ...
```

## Blob Path Structure

### Path Format
```
{YYYY-MM-DD}/{uuid}.csv
```

### Components

1. **Date Folder** (`YYYY-MM-DD`)
   - Format: ISO 8601 date format (e.g., `2026-01-07`)
   - Purpose: Organizes files by upload date for easy navigation and cleanup
   - Timezone: UTC (server timezone)
   - Example: `2026-01-07/`

2. **Filename** (`{uuid}.csv`)
   - Format: UUID v4 (e.g., `b2193800-0df4-460a-bb06-a994e52abfbe.csv`)
   - Purpose: Ensures uniqueness and prevents filename collisions
   - Extension: Always `.csv` (preserved from original filename)
   - Example: `b2193800-0df4-460a-bb06-a994e52abfbe.csv`

### Full Path Example
```
2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv
```

### Full URL Format
```
https://{storage-account-name}.blob.core.windows.net/{container-name}/{YYYY-MM-DD}/{uuid}.csv
```

**Example:**
```
https://flalmscsv.blob.core.windows.net/csv-uploads/2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv
```

## Naming Conventions

### Date Folder Naming
- **Format**: `YYYY-MM-DD` (ISO 8601)
- **Examples**: 
  - `2026-01-07` (January 7, 2026)
  - `2026-12-31` (December 31, 2026)
- **Timezone**: UTC
- **Purpose**: Date-based organization for easy filtering and cleanup

### Filename Naming
- **Format**: UUID v4 + original file extension
- **Examples**:
  - `a1b2c3d4-e5f6-7890-abcd-ef1234567890.csv`
  - `f47ac10b-58cc-4372-a567-0e02b2c3d479.csv`
- **Uniqueness**: Guaranteed by UUID algorithm
- **Collision Prevention**: Multiple uploads on the same day get unique UUIDs

### Why This Structure?

✅ **Date Folders**: Easy to find files by date, simple cleanup of old files  
✅ **UUID Filenames**: Prevents overwrites, ensures uniqueness, no collisions  
✅ **Industry Standard**: Similar pattern used by AWS S3, Azure Blob Storage, Google Cloud Storage  
✅ **Audit Trail**: Each upload gets a unique identifier, even if uploaded multiple times per day  
✅ **Scalability**: Can handle thousands of files per day without performance issues

## File Metadata

### Database Records

Each uploaded file has corresponding metadata stored in PostgreSQL:

**Table**: `upload_files`
- `id`: UUID (primary key)
- `uploadSessionId`: UUID (links to upload session)
- `originalName`: Original filename (e.g., `data_20260107.csv`)
- `blobPath`: Full blob path (e.g., `2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv`)
- `sizeBytes`: File size in bytes
- `sha256`: SHA-256 hash of file contents (optional)
- `etag`: Azure Blob Storage ETag (for integrity verification)
- `uploadedAt`: Timestamp of upload completion
- `mimeType`: MIME type (typically `text/csv`)

**Table**: `upload_sessions`
- `id`: UUID (primary key)
- `status`: `PENDING`, `UPLOADED`, `FAILED`, or `EXPIRED`
- `createdAt`: Timestamp when upload session was created
- `createdBy`: Username who initiated the upload
- `userId`: User ID (if authenticated)

### Querying Files

To find files uploaded on a specific date:
```sql
SELECT * FROM upload_files 
WHERE blob_path LIKE '2026-01-07/%';
```

To find a file by original name:
```sql
SELECT * FROM upload_files 
WHERE original_name = 'data_20260107.csv';
```

## Accessing Files

### Reading Files from Azure Blob Storage

#### Option 1: Using Azure Storage SDK

**Node.js Example:**
```javascript
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = 'csv-uploads';

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

// Get blob client
const containerClient = blobServiceClient.getContainerClient(containerName);
const blobClient = containerClient.getBlobClient('2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv');

// Download blob
const downloadResponse = await blobClient.download();
const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
const csvContent = buffer.toString('utf-8');
```

**Python Example:**
```python
from azure.storage.blob import BlobServiceClient

account_name = os.getenv('AZURE_STORAGE_ACCOUNT_NAME')
account_key = os.getenv('AZURE_STORAGE_ACCOUNT_KEY')
container_name = 'csv-uploads'

blob_service_client = BlobServiceClient(
    account_url=f"https://{account_name}.blob.core.windows.net",
    credential=account_key
)

blob_client = blob_service_client.get_blob_client(
    container=container_name,
    blob='2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv'
)

# Download blob
csv_content = blob_client.download_blob().readall().decode('utf-8')
```

#### Option 2: Using SAS URLs (Temporary Access)

Generate a read-only SAS URL for temporary access:

```javascript
import { generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

const sasQueryParams = generateBlobSASQueryParameters(
  {
    containerName: 'csv-uploads',
    blobName: '2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv',
    permissions: BlobSASPermissions.parse('r'), // read only
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + 3600 * 1000) // 1 hour expiry
  },
  sharedKeyCredential
);

const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasQueryParams.toString()}`;
```

### Listing Files by Date

To list all files uploaded on a specific date:

```javascript
const containerClient = blobServiceClient.getContainerClient('csv-uploads');
const prefix = '2026-01-07/'; // Date folder prefix

const blobs = [];
for await (const blob of containerClient.listBlobsFlat({ prefix })) {
  blobs.push({
    name: blob.name,
    size: blob.properties.contentLength,
    lastModified: blob.properties.lastModified,
    etag: blob.properties.etag
  });
}
```

## File Validation

All uploaded CSV files are validated before being marked as complete:

1. **File Encoding**: Must be UTF-8 (BOM is removed if present)
2. **Filename Pattern**: Original filename should match `YYYYMMDD.csv` (recommended, not enforced)
3. **Column Structure**: Must have exactly 13 columns with specific names and order
4. **Required Fields**: `appli_no`, `trn`, `app_file_dept` must not be empty
5. **Data Types**: Dates must be in `YYYY-MM-DD` format, numeric fields validated
6. **File Size**: Maximum 150MB

See `docs/csv-specification.md` for complete validation rules.

## Multiple Uploads Per Day

**Default Behavior**: Multiple uploads per day are allowed. Each upload gets a unique UUID filename, preserving an audit trail.

**Example**: If 3 files are uploaded on `2026-01-07`:
```
2026-01-07/uuid-1.csv
2026-01-07/uuid-2.csv
2026-01-07/uuid-3.csv
```

**Replacement Option**: Users can optionally delete all existing files for the current day before uploading a new one (via UI checkbox).

## Environment Variables

Required environment variables for accessing blob storage:

```bash
AZURE_STORAGE_ACCOUNT_NAME=flalmscsv
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
AZURE_STORAGE_CONTAINER_NAME=csv-uploads
```

## Security Considerations

1. **Private Access**: Container is set to private (no public access)
2. **SAS Tokens**: Upload uses short-lived SAS tokens (default: 10 minutes expiry)
3. **Authentication**: All uploads require JWT authentication
4. **Audit Logging**: All uploads are logged with user, timestamp, and IP hash
5. **Validation**: Files are validated before being marked as complete
6. **Cleanup**: Invalid files are automatically deleted if validation fails

## Integration Checklist

When integrating with the main application:

- [ ] Configure Azure Storage Account credentials
- [ ] Use `csv-uploads` container (or configured container name)
- [ ] Query database (`upload_files` table) to find blob paths
- [ ] Use Azure Storage SDK to download files
- [ ] Handle date-based folder structure (`YYYY-MM-DD/`)
- [ ] Account for UUID-based filenames (don't rely on original filename)
- [ ] Handle multiple files per day if needed
- [ ] Implement proper error handling for missing files
- [ ] Consider file size limits (max 150MB)

## Example: Complete Integration Flow

```javascript
// 1. Query database for uploads on a specific date
const uploads = await db.query(`
  SELECT blob_path, original_name, uploaded_at, size_bytes
  FROM upload_files
  WHERE blob_path LIKE $1
  ORDER BY uploaded_at DESC
`, [`2026-01-07/%`]);

// 2. Download each file from blob storage
for (const upload of uploads) {
  const blobClient = containerClient.getBlobClient(upload.blob_path);
  const downloadResponse = await blobClient.download();
  const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
  const csvContent = buffer.toString('utf-8');
  
  // 3. Process CSV content
  await processCSV(csvContent, upload.original_name);
}
```

## Support

For questions or issues:
- Check `docs/TECHNICAL_DOCS.md` for technical architecture details
- Check `docs/csv-specification.md` for CSV format requirements
- Review `api/shared/blob.js` for blob storage implementation details

