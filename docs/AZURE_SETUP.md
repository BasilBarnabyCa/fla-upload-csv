# Azure Setup Guide - FLA CSV Upload Tool

This guide explains how to set up Azure resources and configure the application for testing actual file uploads to Azure Blob Storage.

## Prerequisites

- Azure account with active subscription
- Azure Portal access (https://portal.azure.com)
- Azure CLI installed (optional, but helpful)

## Required Azure Resources

### 1. Azure Storage Account

You need an Azure Storage Account to store uploaded CSV files.

#### Step 1: Create Storage Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** or **"+ Create"**
3. Search for **"Storage account"**
4. Click **"Create"**

#### Step 2: Configure Storage Account

**Basics Tab:**
- **Subscription**: Select your subscription
- **Resource group**: Create new or use existing
- **Storage account name**: Choose a unique name (lowercase, numbers only)
  - Example: `flacsvuploads` or `fla-uploads-dev`
  - Must be globally unique
- **Region**: Choose closest to you (e.g., `East US`, `West US 2`)
- **Performance**: **Standard** (recommended)
- **Redundancy**: **LRS** (Locally Redundant Storage) for dev/testing, **GRS** for production

**Advanced Tab:**
- **Enable hierarchical namespace**: **Off** (unless you need Data Lake features)
- **Allow Blob public access**: **Disabled** (we use SAS tokens, not public access)
- **Minimum TLS version**: **Version 1.2** (recommended)

**Review + Create** → **Create**

Wait for deployment to complete (~1-2 minutes).

#### Step 3: Get Storage Account Credentials

1. Navigate to your Storage Account in Azure Portal
2. Go to **"Access keys"** in the left menu
3. You'll see:
   - **Storage account name**: Copy this (e.g., `flacsvuploads`)
   - **Key1** or **Key2**: Click **"Show"** and copy one of the keys
     - Format: Long base64 string (e.g., `AbCdEf123456...`)

**⚠️ Security Note**: These keys have full access to your storage account. Keep them secret!

### 2. Create Blob Container

A container is like a folder in Azure Blob Storage where files are stored.

#### Step 1: Create Container

1. In your Storage Account, go to **"Containers"** in the left menu
2. Click **"+ Container"**
3. Configure:
   - **Name**: `csv-uploads` (or your preferred name)
   - **Public access level**: **Private** (no anonymous access)
4. Click **"Create"**

#### Step 2: Verify Container

- Container should appear in the list
- Note the exact name (case-sensitive)

## Configuration Values

After setting up Azure resources, you'll have these values:

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name | `flacsvuploads` | Storage Account → Overview → Name |
| `AZURE_STORAGE_ACCOUNT_KEY` | Access key (Key1 or Key2) | `AbCdEf123456...` | Storage Account → Access keys → Show |
| `AZURE_STORAGE_CONTAINER_NAME` | Container name | `csv-uploads` | Storage Account → Containers → Name |

## Setting Up Local Configuration

### Option 1: Update `api/local.settings.json` (Recommended)

Edit `api/local.settings.json` and replace the placeholder values:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_ACCOUNT_NAME": "your-actual-storage-account-name",
    "AZURE_STORAGE_ACCOUNT_KEY": "your-actual-storage-account-key",
    "AZURE_STORAGE_CONTAINER_NAME": "csv-uploads",
    "DATABASE_URL": "postgres://user:password@localhost:5432/fla_uploads?schema=public",
    "JWT_SECRET": "your-jwt-secret-here",
    "JWT_EXPIRY_HOURS": "24",
    "ALLOWED_ORIGINS": "http://localhost:5173,http://localhost:5174",
    "MAX_FILE_SIZE_MB": "150",
    "SAS_EXPIRY_MINUTES": "10"
  }
}
```

**Replace:**
- `your-actual-storage-account-name` → Your storage account name
- `your-actual-storage-account-key` → Your storage account key (Key1 or Key2)
- `csv-uploads` → Your container name (if different)

### Option 2: Use Environment Variables

You can also set these as environment variables, but `local.settings.json` is easier for Azure Functions.

## Testing the Configuration

### Step 1: Verify Storage Account Connection

1. Start your development servers:
   ```bash
   npm run start
   ```

2. Log in to the application

3. Try uploading a CSV file

4. Check Azure Portal:
   - Go to Storage Account → Containers → `csv-uploads`
   - You should see your uploaded file

### Step 2: Verify File Upload

Files should appear in Azure Blob Storage with:
- **Path Structure**: `YYYY-MM-DD/{uuid}.csv` (e.g., `2026-01-07/b2193800-0df4-460a-bb06-a994e52abfbe.csv`)
- **Organization**: Date-based folders for easy organization and cleanup
- **Filename**: UUID-based to prevent collisions and ensure uniqueness
- **Size**: Matches your uploaded file
- **Last Modified**: Current timestamp

**Why this structure?**
- ✅ Date folders make it easy to find files by date
- ✅ UUID filenames prevent overwrites and collisions
- ✅ Industry standard pattern (used by AWS S3, Azure, GCS)
- ✅ Easy to clean up old files by date

## CORS Configuration (REQUIRED)

**⚠️ IMPORTANT:** You must configure CORS on your Azure Storage Account to allow direct uploads from your frontend.

### Step 1: Configure CORS in Azure Portal

1. Go to your Storage Account in Azure Portal
2. Navigate to **"Resource sharing (CORS)"** in the left menu (under "Data management")
3. Click on **"Blob service"** tab
4. Click **"+ Add"** to add a CORS rule

### Step 2: Configure CORS Rules

**For Development (localhost):**
- **Allowed origins**: `http://localhost:5173,http://localhost:5174`
- **Allowed methods**: `PUT, OPTIONS, GET, HEAD`
- **Allowed headers**: `*` (or specific: `x-ms-blob-type, x-ms-blob-content-type, Content-Type`)
- **Exposed headers**: `ETag, x-ms-request-id`
- **Max age**: `3600` (1 hour)

**For Production:**
- **Allowed origins**: Your production domain (e.g., `https://your-app.azurestaticapps.net`)
- **Allowed methods**: `PUT, OPTIONS, GET, HEAD`
- **Allowed headers**: `*` (or specific headers)
- **Exposed headers**: `ETag, x-ms-request-id`
- **Max age**: `3600`

### Step 3: Save Configuration

Click **"Save"** - changes take effect immediately.

### Step 4: Verify CORS

After configuring, try uploading again. The CORS error should be resolved.

**Common CORS Errors:**
- `No 'Access-Control-Allow-Origin' header` → CORS not configured
- `Method PUT not allowed` → Add PUT to allowed methods
- `Header x-ms-blob-type not allowed` → Add headers to allowed headers

## Security Best Practices

### Development (local.settings.json)
- ✅ File is gitignored (already configured)
- ✅ Never commit storage account keys
- ✅ Use separate storage account for dev/testing

### Production
- ⚠️ Use Azure Key Vault or App Settings (not local.settings.json)
- ⚠️ Use separate storage account for production
- ⚠️ Rotate access keys regularly
- ⚠️ Use managed identity when possible (more secure than keys)

## Troubleshooting

### Error: "Storage account not found"
- Check `AZURE_STORAGE_ACCOUNT_NAME` is correct (case-sensitive)
- Verify storage account exists in Azure Portal

### Error: "Authentication failed"
- Check `AZURE_STORAGE_ACCOUNT_KEY` is correct
- Make sure you copied the entire key (very long string)
- Try using Key2 instead of Key1

### Error: "Container not found"
- Check `AZURE_STORAGE_CONTAINER_NAME` is correct (case-sensitive)
- Verify container exists in your storage account
- Check container name matches exactly

### Files not appearing in Azure Portal
- Check container name is correct
- Verify upload completed successfully (check browser console)
- Wait a few seconds for Azure Portal to refresh
- Check Storage Account → Containers → Your container → Blobs

## Azure CLI Alternative (Optional)

If you prefer command line:

```bash
# Login to Azure
az login

# Create storage account
az storage account create \
  --name flacsvuploads \
  --resource-group your-resource-group \
  --location eastus \
  --sku Standard_LRS

# Get storage account key
az storage account keys list \
  --account-name flacsvuploads \
  --resource-group your-resource-group

# Create container
az storage container create \
  --name csv-uploads \
  --account-name flacsvuploads \
  --account-key YOUR_KEY_HERE
```

## Cost Considerations

**Storage Account Pricing:**
- **Standard Storage**: ~$0.0184 per GB/month
- **Transactions**: ~$0.004 per 10,000 transactions
- **Data transfer**: Free within same region

**For Testing:**
- Small files (< 100MB) = essentially free
- 1GB storage = ~$0.02/month
- Typical testing usage = < $1/month

## Next Steps

After configuring Azure:

1. ✅ Update `api/local.settings.json` with your Azure credentials
2. ✅ Restart your development servers (`npm run restart`)
3. ✅ Test file upload functionality
4. ✅ Verify files appear in Azure Portal
5. ✅ Check audit logs in database for upload events

## Production Deployment

When deploying to Azure Static Web Apps:

1. **Storage Account**: Use production storage account (separate from dev)
2. **Configuration**: Set values in Azure Portal → Static Web App → Configuration → Application settings
3. **Keys**: Use Azure Key Vault or App Settings (not in code)
4. **CORS**: Update `ALLOWED_ORIGINS` to your production domain

---

**Need Help?**
- Azure Storage Documentation: https://learn.microsoft.com/en-us/azure/storage/
- Azure Portal: https://portal.azure.com
- Azure CLI Reference: https://learn.microsoft.com/en-us/cli/azure/storage

