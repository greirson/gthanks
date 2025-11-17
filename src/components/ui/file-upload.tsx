'use client';

import { Image as ImageIcon, Upload, X } from 'lucide-react';

import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { isResizeSupported, resizeImage } from '@/lib/utils/image-resize';

interface FileUploadProps {
  onUpload: (file: File) => Promise<string>;
  onSuccess: (imageUrl: string) => void;
  onError: (error: string) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  onSuccess,
  onError,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        onError('Please select an image file');
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        onError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 80) {
              clearInterval(progressInterval);
              return 80;
            }
            return prev + 10;
          });
        }, 100);

        // Resize image on client-side to reduce upload size and server load
        let fileToUpload = file;
        if (isResizeSupported()) {
          try {
            // Update progress to show resizing
            setUploadProgress(85);
            fileToUpload = await resizeImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85,
              outputFormat: 'jpeg',
            });
            setUploadProgress(90);
          } catch (resizeError) {
            console.warn('Client-side resize failed, uploading original:', resizeError);
            // Continue with original file if resize fails
          }
        }

        const imageUrl = await onUpload(fileToUpload);

        clearInterval(progressInterval);
        setUploadProgress(100);

        // Store the uploaded image URL
        setUploadedImageUrl(imageUrl);
        onSuccess(imageUrl);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Upload failed');
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onUpload, onSuccess, onError, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading) {
        return;
      }

      const files = e.dataTransfer.files;
      void handleFiles(files);
    },
    [handleFiles, disabled, isUploading]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    setUploadedImageUrl(null);
  }, []);

  // Cleanup blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Show preview if we have an uploaded image or preview
  const showPreview = previewUrl || uploadedImageUrl;

  return (
    <div className={cn('space-y-4', className)}>
      {!showPreview && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            isDragOver && !disabled && !isUploading
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'cursor-not-allowed opacity-50',
            isUploading && 'pointer-events-none'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            disabled={disabled || isUploading}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Upload image file"
          />

          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-500">
              PNG, JPG, GIF, WebP up to {maxSize / 1024 / 1024}MB
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Preview */}
      {showPreview && !isUploading && (
        <div className="relative">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-green-100">
                    <ImageIcon className="h-8 w-8 text-green-600" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {uploadedImageUrl ? 'Image uploaded successfully' : 'Image ready for upload'}
                </div>
                <div className="text-sm text-gray-500">
                  {uploadedImageUrl ? 'Ready to save with your wish' : 'Preview'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
