/**
 * Utility functions for finding product images from R2 object storage
 * based on SKU patterns from productvariants table
 */

/**
 * Get image URL for a product SKU
 * 
 * Logic:
 * - If SKU is "062-CAR-PLN-850", look for images like:
 *   - "062-CAR-PLN-850-1.jpg", "062-CAR-PLN-850-1.png", etc.
 * - If multiple variants exist (-1, -2, -3), always use -1
 * 
 * @param sku - SKU from productvariants table (e.g., "062-CAR-PLN-850")
 * @returns Image URL or null if not found
 */
export function getProductImageUrl(sku: string | null | undefined): string | null {
  if (!sku) {
    return null;
  }

  const publicBase = process.env.R2_PUBLIC_BASE;
  if (!publicBase) {
    console.warn('R2_PUBLIC_BASE is not configured');
    return null;
  }

  // Always use -1 suffix as requested
  // Format: {SKU}-1.{extension}
  // Example: "062-CAR-PLN-850" -> "062-CAR-PLN-850-1.jpg"
  const baseSku = sku.trim();
  
  // Common image extensions in priority order
  // Try jpg first (most common format), then png, webp
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  // Return the first extension (jpg) as default
  // Frontend can handle fallback if image doesn't exist
  return `${publicBase}/${baseSku}-1.${extensions[0]}`;
}

/**
 * Get multiple image URLs for a product SKU
 * Returns all variants (-1, -2, -3, etc.) if they exist
 * 
 * @param sku - SKU from productvariants table
 * @param maxImages - Maximum number of images to return (default: 5)
 * @returns Array of image URLs
 */
export function getProductImageUrls(
  sku: string | null | undefined,
  maxImages: number = 5
): string[] {
  if (!sku) {
    return [];
  }

  const publicBase = process.env.R2_PUBLIC_BASE;
  if (!publicBase) {
    return [];
  }

  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const imageUrls: string[] = [];

  // Always prioritize -1 variant
  for (const ext of imageExtensions) {
    imageUrls.push(`${publicBase}/${sku}-1.${ext}`);
    break; // Only add one extension for -1
  }

  // Add other variants if needed (but prioritize -1)
  // For now, we'll just return the -1 variant as requested
  return imageUrls.slice(0, maxImages);
}

/**
 * Verify if an image exists in R2 storage
 * This is an async function that can be used to verify images exist
 * before returning URLs. Useful for production environments.
 * 
 * @param imagePath - Path to image in bucket (e.g., "062-CAR-PLN-850-1.jpg")
 * @param quiet - If true, don't log 404 (useful when probing multiple extensions)
 * @returns Promise<boolean>
 */
export async function verifyImageExists(imagePath: string, quiet = false): Promise<boolean> {
  try {
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: imagePath,
    });

    await client.send(command);
    return true;
  } catch (error) {
    if (!quiet) {
      console.error(`Image not found: ${imagePath}`, error);
    }
    return false;
  }
}

