'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useEffect, useState } from 'react';

import { AvatarCropDialog } from '@/components/ui/avatar-crop-dialog';
import { Button } from '@/components/ui/button';
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
  const [localAvatarUrl, setLocalAvatarUrl] = useState(currentAvatar);

  // Update local avatar URL when prop changes
  useEffect(() => {
    setLocalAvatarUrl(currentAvatar);
  }, [currentAvatar]);

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
            {currentAvatar ? 'Change Photo' : 'Add Photo'}
          </Button>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
        </div>
      </div>

      <AvatarCropDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        mode="group"
        currentImage={localAvatarUrl}
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
              const result = await uploadResponse.json();
              setLocalAvatarUrl(result.avatarUrl);
              onAvatarChange?.(result.avatarUrl || '');

              // Invalidate group queries
              if (groupId) {
                await queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
                await queryClient.invalidateQueries({ queryKey: ['groups'] });
              }

              toast.success('Group photo updated successfully');
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
        entityName={groupName || 'Group'}
        disabled={isUploading}
      />
    </>
  );
}
