'use client';

import { Upload, X } from 'lucide-react';

import React, { useCallback, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { getCroppedImg } from '@/lib/utils/image-crop';

interface AvatarCropProps {
  value?: string; // Current avatar URL
  onChange: (avatarUrl: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AvatarCrop({ value, onChange, disabled = false, className }: AvatarCropProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a JPEG, PNG, GIF, or WebP image.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 2MB.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const handleCropAndUpload = useCallback(async () => {
    if (!selectedImage || !croppedAreaPixels) {
      return;
    }

    setIsUploading(true);

    try {
      const { file } = await getCroppedImg(selectedImage, croppedAreaPixels);

      const formData = new FormData();
      formData.append('avatar', file, 'avatar.jpg');

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = (await response.json()) as { avatarUrl: string };

      onChange(result.avatarUrl);
      setSelectedImage(null);

      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage, croppedAreaPixels, onChange, toast]);

  const handleCancel = useCallback(() => {
    setSelectedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleRemove = useCallback(() => {
    onChange('');
    toast({
      title: 'Photo removed',
      description: 'Your profile photo has been removed.',
    });
  }, [onChange, toast]);

  // Show crop interface when image is selected
  if (selectedImage) {
    return (
      <div className={className}>
        <Label className="text-sm font-medium">Adjust your photo</Label>

        {/* Crop Area */}
        <div className="relative mt-2 h-64 w-full overflow-hidden rounded-lg border border-border bg-gray-100 dark:bg-gray-900 sm:h-80">
          <Cropper
            image={selectedImage}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom Slider */}
        <div className="mt-4">
          <Label className="text-sm text-muted-foreground">Zoom</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Move the photo with your finger. Use the slider to zoom.
          </p>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(values) => setZoom(values[0])}
            className="mt-2"
            disabled={isUploading}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => {
              void handleCropAndUpload();
            }}
            disabled={isUploading}
            className="min-h-[44px] flex-1"
          >
            {isUploading ? 'Uploading...' : 'Save Photo'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isUploading}
            className="min-h-[44px] flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Show upload button or current avatar
  return (
    <div className={className}>
      <Label className="text-sm font-medium">Add a profile photo (optional)</Label>

      {/* Current Avatar Preview */}
      {value && (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Current avatar"
              className="h-24 w-24 rounded-full border-2 border-border object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-1 -top-1 h-6 w-6 rounded-full"
              onClick={handleRemove}
              disabled={disabled}
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Current profile photo</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="mt-4">
        <input
          type="file"
          id="avatar-upload"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
        <label htmlFor="avatar-upload" aria-label={value ? 'Change photo' : 'Upload photo'}>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full cursor-pointer"
            disabled={disabled || isUploading}
            asChild
          >
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {value ? 'Change Photo' : 'Upload Photo'}
            </span>
          </Button>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          JPEG, PNG, GIF, or WebP. Maximum size 2MB.
        </p>
      </div>
    </div>
  );
}
