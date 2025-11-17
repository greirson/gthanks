'use client';

import { Link2, Upload, X } from 'lucide-react';

import React, { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface ImageInputProps {
  value?: string;
  onChange: (value: string) => void;
  onError?: (error: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function ImageInput({
  value = '',
  onChange,
  onError,
  label = 'Image',
  placeholder = 'https://example.com/image.jpg',
  disabled = false,
  required = false,
  className,
}: ImageInputProps) {
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<'url' | 'upload'>('url');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle file upload
  const handleUpload = useCallback(async (file: File): Promise<string> => {
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = (await response.json()) as { imageUrl: string };
      return result.imageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      throw error;
    }
  }, []);

  // Handle successful upload
  const handleUploadSuccess = useCallback(
    (imageUrl: string) => {
      onChange(imageUrl);
      toast({
        title: 'Upload successful',
        description: 'Your image has been uploaded and is ready to save',
      });
    },
    [onChange, toast]
  );

  // Handle upload error
  const handleUploadError = useCallback(
    (error: string) => {
      setUploadError(error);
      if (onError) {
        onError(error);
      }
      toast({
        title: 'Upload failed',
        description: error,
        variant: 'destructive',
      });
    },
    [onError, toast]
  );

  // Handle URL input change
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const urlValue = e.target.value;
      onChange(urlValue);
      setUploadError(null); // Clear any upload errors when switching to URL
    },
    [onChange]
  );

  // Determine if we're showing an uploaded image
  const isUploadedImage = value?.startsWith('/api/images/');

  // Handle clearing the current image
  const handleClearImage = useCallback(() => {
    onChange('');
    setUploadError(null);
  }, [onChange]);

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}

      <div className="mt-2">
        {/* URL Mode - Default View */}
        {activeMode === 'url' && (
          <div className="flex gap-2">
            <Input
              type="url"
              inputMode="url"
              className="flex-1"
              placeholder={placeholder}
              value={isUploadedImage ? '' : value}
              onChange={handleUrlChange}
              disabled={disabled}
              aria-invalid={!!uploadError}
              aria-describedby={uploadError ? 'image-error' : undefined}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveMode('upload')}
              disabled={disabled}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </div>
        )}

        {/* Upload Mode */}
        {activeMode === 'upload' && (
          <div className="space-y-2">
            <FileUpload
              onUpload={handleUpload}
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMode('url')}
              disabled={disabled}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Back to URL
            </Button>
          </div>
        )}

        {/* Helper text for uploaded images in URL mode */}
        {activeMode === 'url' && isUploadedImage && (
          <div className="mt-2 text-sm text-muted-foreground">
            Currently showing an uploaded image. Enter a URL to replace it.
          </div>
        )}
      </div>

      {/* Error Display */}
      {uploadError && (
        <div id="image-error" className="mt-2 text-sm text-red-600" role="alert">
          {uploadError}
        </div>
      )}

      {/* Current Image Preview */}
      {value && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-gray-700">Current Image:</div>
          <div className="group relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              onError={(e) => {
                // Hide broken images
                e.currentTarget.style.display = 'none';
              }}
            />
            {isUploadedImage && (
              <div className="absolute -right-1 -top-1 rounded bg-green-500 px-1 py-0.5 text-xs text-white">
                Uploaded
              </div>
            )}
            {/* Delete button - shows on hover */}
            <Button
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleClearImage}
              disabled={disabled}
              aria-label="Remove image"
              type="button"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
