'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  // Form state
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      return res.json();
    },
    onSuccess: async (data) => {
      // Update the NextAuth session with new name and email
      await updateSession({
        name: data.profile.name,
        email: data.profile.email,
      });

      toast({
        title: 'Success!',
        description: 'Your profile has been updated',
      });
      // Invalidate user queries to refetch updated data
      void queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to update profile';

      // Check if error message contains field information
      if (message.toLowerCase().includes('email')) {
        setErrors({ email: message });
      } else if (message.toLowerCase().includes('name')) {
        setErrors({ name: message });
      } else {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name (1-100 characters)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    // Clean and trim data
    const cleanData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
    };

    updateMutation.mutate(cleanData);
  };

  // Track if form has unsaved changes
  const isDirty =
    formData.name.trim() !== (user.name || '') || formData.email.trim() !== user.email;

  const isLoading = updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name *
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
          maxLength={100}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email *
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isLoading || !isDirty}
          className="w-full sm:w-auto sm:min-w-[160px]"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
