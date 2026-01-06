import { BlobSASPermissions, BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';

const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'csv-uploads';
const SAS_EXPIRY_MINUTES = parseInt(process.env.SAS_EXPIRY_MINUTES || '10', 10);

if (!ACCOUNT_NAME || !ACCOUNT_KEY) {
  throw new Error('Azure Storage credentials are required');
}

const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
const blobServiceClient = new BlobServiceClient(
  `https://${ACCOUNT_NAME}.blob.core.windows.net`,
  sharedKeyCredential
);

/**
 * Generate a server-controlled blob path
 */
export function generateBlobPath(originalName) {
  const date = new Date().toISOString().split('T')[0];
  const uuid = crypto.randomUUID();
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  return `csv-uploads/${date}/${uuid}${ext}`;
}

/**
 * Generate a write-only SAS URL for a specific blob
 */
export function generateSASUrl(blobPath) {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + SAS_EXPIRY_MINUTES);

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('cw'), // create + write only
      startsOn: new Date(),
      expiresOn: expiryDate
    },
    sharedKeyCredential
  );

  const blobUrl = `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobPath}`;
  return {
    sasUrl: `${blobUrl}?${sasQueryParams.toString()}`,
    expiresAt: expiryDate.toISOString()
  };
}

/**
 * Get container client (for future use if needed)
 */
export function getContainerClient() {
  return blobServiceClient.getContainerClient(CONTAINER_NAME);
}

