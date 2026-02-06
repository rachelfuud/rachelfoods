/**
 * File Upload Service
 * 
 * This module handles file uploads to cloud storage.
 * Currently configured for Cloudinary, but can be adapted for AWS S3, Azure Blob, etc.
 */

/**
 * Upload a single file to Cloudinary
 * 
 * @param file - File object to upload
 * @param folder - Optional folder name in Cloudinary (default: 'products')
 * @returns Promise resolving to the uploaded file URL
 */
export async function uploadFile(
    file: File,
    folder: string = 'products'
): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rachelfoods');
        formData.append('folder', folder);

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
            throw new Error('Cloudinary cloud name not configured');
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload file');
    }
}

/**
 * Upload multiple files in parallel
 * 
 * @param files - Array of File objects
 * @param folder - Optional folder name
 * @returns Promise resolving to array of uploaded URLs
 */
export async function uploadFiles(
    files: File[],
    folder: string = 'products'
): Promise<string[]> {
    const uploadPromises = files.map(file => uploadFile(file, folder));
    return await Promise.all(uploadPromises);
}

/**
 * Upload file with progress tracking
 * 
 * @param file - File to upload
 * @param onProgress - Callback for upload progress (0-100)
 * @param folder - Optional folder name
 * @returns Promise resolving to uploaded URL
 */
export async function uploadFileWithProgress(
    file: File,
    onProgress: (progress: number) => void,
    folder: string = 'products'
): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rachelfoods');
        formData.append('folder', folder);

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed'));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
        });

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`);
        xhr.send(formData);
    });
}

/**
 * Delete a file from Cloudinary by URL
 * 
 * @param url - Full Cloudinary URL of the file
 * @returns Promise resolving when file is deleted
 */
export async function deleteFile(url: string): Promise<void> {
    // Extract public_id from URL
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/file.jpg
    // Public ID: folder/file

    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL');
    }

    // Get everything after 'upload' and before file extension
    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');

    // Note: Deleting via frontend requires admin API key (security risk)
    // Implement this on backend instead:
    // DELETE /api/admin/media/:publicId endpoint

    console.warn('File deletion should be implemented on backend for security');

    // For now, just log the public_id that needs to be deleted
    console.log('File to delete:', publicId);
}

/**
 * Validate file before upload
 * 
 * @param file - File to validate
 * @param options - Validation options
 * @returns true if valid, throws error if invalid
 */
export function validateFile(
    file: File,
    options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    } = {}
): boolean {
    const { maxSizeMB = 50, allowedTypes = [] } = options;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`);
    }

    return true;
}

/**
 * Get optimized image URL with transformations
 * 
 * @param url - Original Cloudinary URL
 * @param width - Target width
 * @param height - Target height
 * @param quality - Image quality (1-100)
 * @returns Optimized URL
 */
export function getOptimizedImageUrl(
    url: string,
    width?: number,
    height?: number,
    quality: number = 80
): string {
    // Only works for Cloudinary URLs
    if (!url.includes('cloudinary.com')) {
        return url;
    }

    // Insert transformations into URL
    // Original: https://res.cloudinary.com/cloud_name/image/upload/v1234/file.jpg
    // Optimized: https://res.cloudinary.com/cloud_name/image/upload/w_800,h_600,q_80/v1234/file.jpg

    const transformations: string[] = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${quality}`);
    transformations.push('f_auto'); // Auto format selection

    const transformString = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformString}/`);
}

// ============================================
// Alternative: AWS S3 Implementation
// ============================================

/**
 * Upload file to AWS S3 (alternative implementation)
 * 
 * Requires: npm install aws-sdk
 * Environment variables:
 * - NEXT_PUBLIC_AWS_REGION
 * - NEXT_PUBLIC_AWS_BUCKET_NAME
 * - NEXT_PUBLIC_AWS_ACCESS_KEY_ID (avoid exposing in frontend!)
 * - NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY (avoid exposing in frontend!)
 */
/*
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
    },
});

export async function uploadToS3(file: File, folder: string = 'products'): Promise<string> {
    const key = `${folder}/${Date.now()}-${file.name}`;
    
    const params = {
        Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: file.type,
        ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();
    return result.Location;
}
*/

// ============================================
// Alternative: Backend Upload Endpoint
// ============================================

/**
 * Upload file via backend API (most secure approach)
 * 
 * Backend handles file storage credentials
 */
export async function uploadViaBackend(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url;
}
