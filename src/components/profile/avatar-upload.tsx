'use client';

import { toast } from 'sonner';

import { useState } from 'react';

import { AvatarCropDialog } from '@/components/ui/avatar-crop-dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  userId: string;
  userEmail: string;
  onAvatarChange?: (newAvatarUrl: string) => void;
}

export function AvatarUpload({
  currentAvatar,
  userName,
  userId,
  userEmail,
  onAvatarChange,
}: AvatarUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-4">
        <UserAvatar
          user={{
            id: userId,
            name: userName || null,
            email: userEmail || null,
            avatarUrl: currentAvatar || null,
          }}
          size="2xl"
        />
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            Change Photo
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
        </div>
      </div>

      <AvatarCropDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        mode="user"
        currentImage={currentAvatar}
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
              onAvatarChange?.(result.avatarUrl || '');
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
    </>
  );
}
