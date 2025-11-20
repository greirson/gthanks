'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface NameFormProps {
  currentName: string | null;
}

interface ApiErrorResponse {
  error: string;
}

interface UpdateProfileResponse {
  profile: {
    name: string;
  };
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
  );
}

export function NameForm({ currentName }: NameFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  // Form state
  const [name, setName] = useState(currentName || '');
  const [error, setError] = useState<string>('');

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const responseData = (await res.json()) as UpdateProfileResponse | ApiErrorResponse;

      if (!res.ok) {
        const errorMessage = isApiErrorResponse(responseData)
          ? responseData.error
          : 'Failed to update name';
        throw new Error(errorMessage);
      }

      if (!('profile' in responseData)) {
        throw new Error('Invalid response format');
      }

      return responseData;
    },
    onSuccess: async (data) => {
      // Update the NextAuth session with new name
      await updateSession({
        name: data.profile.name,
      });

      toast({
        title: 'Success!',
        description: 'Your name has been updated',
      });

      // Invalidate user queries to refetch updated data
      void queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to update name';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) {
      setError('');
    }
  };

  // Client-side validation
  const validateName = (): boolean => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (name.length > 100) {
      setError('Name must be less than 100 characters');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateName()) {
      return;
    }

    const cleanName = name.trim();
    updateMutation.mutate(cleanName);
  };

  // Track if form has unsaved changes
  const hasUnsavedChanges = name.trim() !== (currentName || '');
  const isLoading = updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={handleChange}
          className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          maxLength={100}
          required
          aria-invalid={!!error}
          aria-describedby={error ? 'name-error' : undefined}
        />
        {error && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isLoading || !hasUnsavedChanges} size="default">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Save
      </Button>
    </form>
  );
}
