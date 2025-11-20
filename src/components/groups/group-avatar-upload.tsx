'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useEffect, useRef, useState } from 'react';

import { AvatarCropDialog } from '@/components/ui/avatar-crop-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { GroupAvatar } from '@/components/ui/group-avatar';

interface GroupAvatarUploadProps {
  groupId?: string; // Only needed when updating existing group
  currentAvatar?: string;
  groupName?: string;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
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
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null | undefined>(currentAvatar);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Store file and open dialog
    setSelectedFile(file);
    setIsOpen(true);
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/avatar`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLocalAvatarUrl(null);
        onAvatarChange?.(null);

        // Invalidate group queries
        if (groupId) {
          await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
          await queryClient.invalidateQueries({ queryKey: ['groups'] });
        }

        toast.success('Photo removed successfully');
      } else {
        const error = (await response.json()) as { error?: string };
        toast.error(error.error || 'Failed to remove photo');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsUploading(false);
      setShowRemoveConfirm(false);
    }
  };

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
        <div className="flex flex-col gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-h-[44px]"
          >
            {currentAvatar ? 'Change Photo' : 'Add Photo'}
          </Button>

          {/* Remove Photo button - only show if avatar exists and group is created */}
          {localAvatarUrl && groupId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRemoveConfirm(true)}
              disabled={isUploading}
              className="min-h-[44px]"
            >
              Remove Photo
            </Button>
          )}

          <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
        </div>
      </div>

      <AvatarCropDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }}
        mode="group"
        currentImage={localAvatarUrl || undefined}
        preSelectedFile={selectedFile ?? undefined}
        onSave={async (file) => {
          // For new groups (no groupId), convert to data URL
          if (!groupId) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              setLocalAvatarUrl(dataUrl);
              onAvatarChange?.(dataUrl);
              toast.success('Photo selected');
            };
            reader.readAsDataURL(file);
            return;
          }

          // For existing groups, upload to API
          setIsUploading(true);
          try {
            const formData = new FormData();
            formData.append('avatar', file, 'avatar.jpg');

            const uploadResponse = await fetch(`/api/groups/${groupId}/avatar`, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const result = (await uploadResponse.json()) as { avatarUrl?: string };
              setLocalAvatarUrl(result.avatarUrl);
              onAvatarChange?.(result.avatarUrl || '');

              // Invalidate group queries
              if (groupId) {
                await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
                await queryClient.invalidateQueries({ queryKey: ['groups'] });
              }

              toast.success('Group photo updated successfully');
            } else {
              const error = (await uploadResponse.json()) as { error?: string };
              toast.error(error.error || 'Failed to upload photo');
            }
          } catch {
            toast.error('Something went wrong');
          } finally {
            setIsUploading(false);
          }
        }}
        shape="circle"
        entityName={groupName || 'Group'}
        disabled={isUploading}
      />

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this group&apos;s photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRemove()}
              disabled={isUploading}
              className="min-h-[44px]"
            >
              {isUploading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
