'use client';

import { Group } from '@prisma/client';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';
import { Loader2 } from 'lucide-react';
import { ZodError } from 'zod';

import { useEffect, useMemo, useState } from 'react';

import { GroupAvatarUpload } from '@/components/groups/group-avatar-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThemeButton } from '@/components/ui/theme-button';
import { useFormDirtyState } from '@/hooks/use-form-dirty-state';
import {
  GroupCreateInput,
  GroupCreateSchema,
  GroupUpdateInput,
  GroupUpdateSchema,
} from '@/lib/validators/group';

interface GroupFormProps {
  group?: Group | GroupWithCountsResponse;
  onSubmit: (data: GroupCreateInput | GroupUpdateInput) => void;
  isLoading?: boolean;
  onCancel?: () => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
}

export function GroupForm({
  group,
  onSubmit,
  isLoading = false,
  onCancel,
  onDirtyStateChange,
}: GroupFormProps) {
  const isEditing = Boolean(group);

  // Form state
  const [formData, setFormData] = useState<Partial<GroupCreateInput>>({
    name: group?.name ?? '',
    description: group?.description ?? '',
    avatarUrl: group?.avatarUrl ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initial values for dirty state tracking
  const initialFormData = useMemo(
    () => ({
      name: group?.name ?? '',
      description: group?.description ?? '',
      avatarUrl: group?.avatarUrl ?? '',
    }),
    [group]
  );

  // Track dirty state
  const { isDirty } = useFormDirtyState(
    initialFormData,
    formData as typeof initialFormData
  );

  // Reset form data when group prop changes (for edit dialogs)
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name ?? '',
        description: group.description ?? '',
        avatarUrl: group.avatarUrl ?? '',
      });
    }
  }, [group]);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyStateChange?.(isDirty);
  }, [isDirty, onDirtyStateChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Clean form data
    const cleanData = {
      ...formData,
      name: formData.name?.trim() || '',
      description: formData.description?.trim() || null,
      avatarUrl: formData.avatarUrl?.trim() || null,
    };

    try {
      // Validate with Zod schema
      const schema = isEditing ? GroupUpdateSchema : GroupCreateSchema;
      const validatedData = schema.parse(cleanData);

      // Call the onSubmit prop with validated data
      onSubmit(validatedData);
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Group Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter group name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your group..."
            rows={3}
          />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
        </div>

        <div>
          <Label>Group Avatar (Optional)</Label>
          <div className="mt-2">
            <GroupAvatarUpload
              groupId={group?.id}
              currentAvatar={formData.avatarUrl || undefined}
              groupName={formData.name || 'Group'}
              onAvatarChange={(newAvatarUrl) =>
                setFormData({ ...formData, avatarUrl: newAvatarUrl })
              }
            />
          </div>
          {errors.avatarUrl && <p className="mt-1 text-sm text-red-500">{errors.avatarUrl}</p>}
        </div>

      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}

        <ThemeButton type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Group' : 'Create Group'}
        </ThemeButton>
      </div>
    </form>
  );
}
