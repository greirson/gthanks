'use client';

import { Upload, ZoomIn, ZoomOut } from 'lucide-react';

import React, { useCallback, useEffect, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { getCroppedImg } from '@/lib/utils/image-crop';

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'user' | 'group';
  currentImage?: string;
  onSave: (file: Blob) => void | Promise<void>;
  shape?: 'circle' | 'square';
  aspect?: number;
  entityName?: string;
  disabled?: boolean;
  preSelectedFile?: File; // NEW: Pre-selected file from parent
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  mode,
  currentImage,
  onSave,
  shape = 'circle',
  aspect = 1,
  entityName,
  disabled = false,
  preSelectedFile, // NEW
}: AvatarCropDialogProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // NEW: Handle pre-selected file from parent
  useEffect(() => {
    if (preSelectedFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(preSelectedFile);
    }
  }, [preSelectedFile, open]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 3)); // Max 3x
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 1)); // Min 1x
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

  const handleSave = useCallback(async () => {
    if (!selectedImage || !croppedAreaPixels) {
      return;
    }

    setIsUploading(true);

    try {
      const { file } = await getCroppedImg(selectedImage, croppedAreaPixels, 0);

      await onSave(file);

      // Reset state and close dialog
      setSelectedImage(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      onOpenChange(false);

      toast({
        title: 'Photo saved',
        description: `Your ${mode === 'user' ? 'profile' : 'group'} photo has been updated.`,
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage, croppedAreaPixels, onSave, mode, onOpenChange, toast]);

  const handleCancel = useCallback(() => {
    setSelectedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onOpenChange(false);
  }, [onOpenChange]);

  // Clean up state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedImage(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Conditional rendering: Skip upload button if preSelectedFile exists
  const showUploadButton = !preSelectedFile;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Photo</DialogTitle>
          <DialogDescription>Adjust the photo position and zoom to your liking.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {selectedImage ? (
            // Crop interface when file is selected
            <div className="space-y-4">
              {/* Crop Area */}
              <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border bg-gray-100 dark:bg-gray-900">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={shape === 'circle' ? 'round' : 'rect'}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom Controls */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Zoom</Label>
                <p className="text-xs text-muted-foreground">
                  Move the photo with your finger. Use the slider to zoom.
                </p>

                {/* Slider + Buttons Row */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1 || isUploading}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>

                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(values) => setZoom(values[0])}
                    className="flex-1"
                    disabled={isUploading}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3 || isUploading}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Zoom Level Indicator */}
                <p className="text-center text-xs text-muted-foreground">
                  {(zoom * 100).toFixed(0)}%
                </p>
              </div>

              {/* Preview info (if entityName provided) */}
              {entityName && (
                <p className="text-xs text-muted-foreground">
                  Preview for: <span className="font-medium">{entityName}</span>
                </p>
              )}
            </div>
          ) : (
            // Upload dropzone when no file selected
            <div className="space-y-4">
              {/* Current Image Preview */}
              {currentImage && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage}
                      alt="Current avatar"
                      className={`h-24 w-24 border-2 border-border object-cover ${
                        shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Current {mode === 'user' ? 'profile' : 'group'} photo
                    </p>
                  </div>
                </div>
              )}

              {/* Only show upload button if no preSelectedFile */}
              {!selectedImage && showUploadButton && (
                <div>
                  <input
                    type="file"
                    id="avatar-crop-upload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    disabled={disabled || isUploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-crop-upload"
                    aria-label={currentImage ? 'Change photo' : 'Upload photo'}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px] w-full cursor-pointer"
                      disabled={disabled || isUploading}
                      asChild
                    >
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {currentImage ? 'Change Photo' : 'Upload Photo'}
                      </span>
                    </Button>
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    JPEG, PNG, GIF, or WebP. Maximum size 2MB.
                  </p>
                </div>
              )}

              {/* If preSelectedFile provided but no image yet, show loading state */}
              {!selectedImage && preSelectedFile && (
                <div className="flex items-center justify-center p-8">
                  <p className="text-sm text-muted-foreground">Loading image...</p>
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {selectedImage ? (
            // Action buttons when cropping
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={isUploading}
                className="min-h-[44px] flex-1"
              >
                {isUploading ? 'Saving...' : 'Save Photo'}
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
          ) : (
            // Close button when in upload mode
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
