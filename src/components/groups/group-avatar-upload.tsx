'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupAvatar } from '@/components/ui/group-avatar';

interface GroupAvatarUploadProps {
  groupId?: string; // Only needed when updating existing group
  currentAvatar?: string;
  groupName?: string;
  onAvatarChange?: (newAvatarUrl: string) => void;
}

export function GroupAvatarUpload({
  groupId,
  currentAvatar,
  groupName,
  onAvatarChange,
}: GroupAvatarUploadProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(currentAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local avatar URL when prop changes
  useEffect(() => {
    setLocalAvatarUrl(currentAvatar);
  }, [currentAvatar]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Store File object directly
    setSelectedFile(file);

    // Create blob URL for preview (efficient, CSP-compliant)
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    // For new groups (no groupId), create data URL for form state
    if (!groupId) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLocalAvatarUrl(dataUrl);
        onAvatarChange?.(dataUrl);
        toast.success('Avatar selected');
        setIsOpen(false);
        setPreview(null);
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    // For existing groups, upload to API
    setIsUploading(true);
    try {
      // Create FormData directly from File (no conversion needed - File IS a Blob!)
      const formData = new FormData();
      formData.append('avatar', selectedFile, selectedFile.name);

      // Upload to API
      const uploadResponse = await fetch(`/api/groups/${groupId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = (await uploadResponse.json()) as { avatarUrl?: string };
        setLocalAvatarUrl(result.avatarUrl);
        onAvatarChange?.(result.avatarUrl || '');

        // Invalidate group queries to refresh data
        if (groupId) {
          await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
          await queryClient.invalidateQueries({ queryKey: ['groups'] });
        }

        toast.success('Group avatar updated successfully');
        setIsOpen(false);
        setPreview(null);
        setSelectedFile(null);
      } else {
        const error = (await uploadResponse.json()) as { error?: string };
        toast.error(error.error || 'Failed to upload avatar');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup preview when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <>
      <div className="flex items-center space-x-4">
        <GroupAvatar
          group={{
            id: groupId || '',
            name: groupName || 'Group',
            avatarUrl: localAvatarUrl || null,
          }}
          size="2xl"
        />
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            {currentAvatar ? 'Change Avatar' : 'Add Avatar'}
          </Button>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Group Avatar</DialogTitle>
            <DialogDescription>
              Choose a group avatar. It will be cropped to a square.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload Area */}
            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
              >
                <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">Click to select an image</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex justify-center">
                  <div className="relative">
                    <GroupAvatar
                      group={{
                        id: groupId || '',
                        name: 'Preview',
                        avatarUrl: preview,
                      }}
                      size="3xl"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -right-2 -top-2"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    Choose Different
                  </Button>
                  <Button
                    onClick={() => void handleUpload()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? 'Uploading...' : groupId ? 'Upload' : 'Select'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
