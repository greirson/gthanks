'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useRef, useState } from 'react';

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
import { UserAvatar } from '@/components/ui/user-avatar';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  userId: string;
  userEmail: string;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
}

export function AvatarUpload({
  currentAvatar,
  userName,
  userId,
  userEmail,
  onAvatarChange,
}: AvatarUploadProps) {
  const router = useRouter();
  const [localAvatar, setLocalAvatar] = useState<string | null | undefined>(currentAvatar);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {return;}

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
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setLocalAvatar(null);
        onAvatarChange?.(null);
        router.refresh();
        toast.success('Photo removed successfully');
      } else {
        const error = await response.json();
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
        <UserAvatar
          user={{
            id: userId,
            name: userName || null,
            email: userEmail || null,
            avatarUrl: localAvatar || null,
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
            Change Photo
          </Button>

          {/* Remove Photo button - only show if avatar exists */}
          {localAvatar && (
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

          <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
        </div>
      </div>

      <AvatarCropDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            // Clear selected file when dialog closes
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }}
        mode="user"
        currentImage={localAvatar || undefined}
        preSelectedFile={selectedFile ?? undefined}
        onSave={async (file) => {
          setIsUploading(true);
          try {
            const formData = new FormData();
            formData.append('avatar', file, 'avatar.jpg');

            const uploadResponse = await fetch('/api/user/avatar', {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const result = await uploadResponse.json();

              // Optimistic update - instant UI change
              setLocalAvatar(result.avatarUrl || '');

              // Callback for backward compatibility
              onAvatarChange?.(result.avatarUrl || '');

              // Refresh server component data
              router.refresh();

              toast.success('Photo updated successfully');
            } else {
              const error = await uploadResponse.json();
              toast.error(error.error || 'Failed to upload photo');
            }
          } catch {
            toast.error('Something went wrong');
          } finally {
            setIsUploading(false);
          }
        }}
        shape="circle"
        entityName={userName || 'Profile'}
        disabled={isUploading}
      />

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your profile photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isUploading} className="min-h-[44px]">
              {isUploading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
