'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Video, FileIcon } from 'lucide-react';

export interface UploadedFile {
    id: string;
    file?: File;
    url: string;
    type: 'image' | 'video';
    preview?: string;
    altText?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    isPrimary?: boolean;
    displayOrder?: number;
}

interface FileUploadProps {
    files: UploadedFile[];
    onChange: (files: UploadedFile[]) => void;
    maxFiles?: number;
    acceptImages?: boolean;
    acceptVideos?: boolean;
    maxSizeInMB?: number;
    className?: string;
}

export default function FileUpload({
    files,
    onChange,
    maxFiles = 10,
    acceptImages = true,
    acceptVideos = true,
    maxSizeInMB = 50,
    className = '',
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const acceptedTypes = [
        ...(acceptImages ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] : []),
        ...(acceptVideos ? ['video/mp4', 'video/webm', 'video/quicktime'] : []),
    ].join(',');

    const handleFiles = useCallback(
        async (fileList: FileList) => {
            const newFiles: UploadedFile[] = [];

            if (files.length + fileList.length > maxFiles) {
                alert(`Maximum ${maxFiles} files allowed`);
                return;
            }

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];

                // Validate file size
                if (file.size > maxSizeInMB * 1024 * 1024) {
                    alert(`File ${file.name} exceeds ${maxSizeInMB}MB limit`);
                    continue;
                }

                // Validate file type
                if (!acceptedTypes.split(',').includes(file.type)) {
                    alert(`File ${file.name} has unsupported type`);
                    continue;
                }

                const fileId = `${Date.now()}-${i}`;
                const type = file.type.startsWith('image/') ? 'image' : 'video';

                // Create preview
                let preview = '';
                if (type === 'image') {
                    preview = URL.createObjectURL(file);
                } else if (type === 'video') {
                    // Generate video thumbnail
                    preview = await generateVideoThumbnail(file);
                }

                newFiles.push({
                    id: fileId,
                    file,
                    url: '', // Will be set after upload to server
                    type,
                    preview,
                    displayOrder: files.length + i,
                    isPrimary: files.length === 0 && i === 0,
                });
            }

            onChange([...files, ...newFiles]);
        },
        [files, maxFiles, maxSizeInMB, acceptedTypes, onChange]
    );

    const generateVideoThumbnail = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = 1; // Seek to 1 second
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL());
                }
                URL.revokeObjectURL(video.src);
            };

            video.onerror = () => {
                resolve(''); // Return empty string on error
                URL.revokeObjectURL(video.src);
            };

            video.src = URL.createObjectURL(file);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleFiles(droppedFiles);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const removeFile = (id: string) => {
        const updatedFiles = files.filter((f) => f.id !== id);
        // If removed file was primary, make first file primary
        if (updatedFiles.length > 0 && !updatedFiles.some((f) => f.isPrimary)) {
            updatedFiles[0].isPrimary = true;
        }
        onChange(updatedFiles);
    };

    const setPrimaryFile = (id: string) => {
        const updatedFiles = files.map((f) => ({
            ...f,
            isPrimary: f.id === id,
        }));
        onChange(updatedFiles);
    };

    const updateFileMetadata = (id: string, updates: Partial<UploadedFile>) => {
        const updatedFiles = files.map((f) =>
            f.id === id ? { ...f, ...updates } : f
        );
        onChange(updatedFiles);
    };

    const reorderFiles = (fromIndex: number, toIndex: number) => {
        const newFiles = [...files];
        const [movedFile] = newFiles.splice(fromIndex, 1);
        newFiles.splice(toIndex, 0, movedFile);

        // Update display orders
        const updatedFiles = newFiles.map((f, idx) => ({
            ...f,
            displayOrder: idx,
        }));
        onChange(updatedFiles);
    };

    return (
        <div className={className}>
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-background'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptedTypes}
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                <Upload className="w-12 h-12 mx-auto mb-4 text-text-secondary" />

                <p className="text-lg font-medium text-text-primary mb-2">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-text-secondary mb-2">
                    or click to browse
                </p>
                <p className="text-xs text-text-secondary">
                    {acceptImages && acceptVideos && 'Images and videos'}
                    {acceptImages && !acceptVideos && 'Images only'}
                    {!acceptImages && acceptVideos && 'Videos only'}
                    {' '}(max {maxSizeInMB}MB, up to {maxFiles} files)
                </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="font-semibold text-text-primary">
                        Uploaded Files ({files.length}/{maxFiles})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {files.map((file, index) => (
                            <div
                                key={file.id}
                                className="border border-border rounded-lg p-4 bg-surface relative"
                            >
                                {/* Preview */}
                                <div className="relative mb-3">
                                    {file.type === 'image' && (
                                        <div className="aspect-video rounded-md overflow-hidden bg-muted">
                                            <img
                                                src={file.preview || file.url}
                                                alt={file.altText || 'Product image'}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    {file.type === 'video' && (
                                        <div className="aspect-video rounded-md overflow-hidden bg-muted relative">
                                            {file.preview || file.thumbnail ? (
                                                <img
                                                    src={file.preview || file.thumbnail}
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <Video className="w-12 h-12 text-text-secondary" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-black/50 rounded-full p-3">
                                                    <Video className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Primary Badge */}
                                    {file.isPrimary && (
                                        <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                            Primary
                                        </div>
                                    )}

                                    {/* Remove Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeFile(file.id)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Metadata */}
                                <div className="space-y-2">
                                    {file.type === 'image' && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Alt text (optional)"
                                                value={file.altText || ''}
                                                onChange={(e) =>
                                                    updateFileMetadata(file.id, { altText: e.target.value })
                                                }
                                                className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-text-primary"
                                            />
                                        </>
                                    )}

                                    {file.type === 'video' && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Video title (optional)"
                                                value={file.title || ''}
                                                onChange={(e) =>
                                                    updateFileMetadata(file.id, { title: e.target.value })
                                                }
                                                className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-text-primary"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Description (optional)"
                                                value={file.description || ''}
                                                onChange={(e) =>
                                                    updateFileMetadata(file.id, { description: e.target.value })
                                                }
                                                className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-text-primary"
                                            />
                                        </>
                                    )}

                                    <div className="flex gap-2">
                                        {!file.isPrimary && (
                                            <button
                                                type="button"
                                                onClick={() => setPrimaryFile(file.id)}
                                                className="flex-1 px-3 py-1 text-xs bg-background border border-border rounded hover:bg-muted text-text-primary"
                                            >
                                                Set as Primary
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => index > 0 && reorderFiles(index, index - 1)}
                                            disabled={index === 0}
                                            className="px-3 py-1 text-xs bg-background border border-border rounded hover:bg-muted disabled:opacity-50 text-text-primary"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => index < files.length - 1 && reorderFiles(index, index + 1)}
                                            disabled={index === files.length - 1}
                                            className="px-3 py-1 text-xs bg-background border border-border rounded hover:bg-muted disabled:opacity-50 text-text-primary"
                                        >
                                            ↓
                                        </button>
                                    </div>

                                    {file.file && (
                                        <p className="text-xs text-text-secondary">
                                            {file.file.name} ({(file.file.size / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
