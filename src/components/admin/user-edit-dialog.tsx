'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const userEditSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    email: z.string().email('Invalid email address'),
    isSuspended: z.boolean(),
    suspensionReason: z.string(),
  })
  .refine(
    (data) => {
      // If suspended, reason is required
      if (data.isSuspended && !data.suspensionReason.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Suspension reason is required when suspending a user',
      path: ['suspensionReason'],
    }
  );

type UserEditFormData = z.infer<typeof userEditSchema>;

interface User {
  id: string;
  name: string | null;
  email: string;
  suspendedAt: Date | null;
  suspensionReason: string | null;
}

interface UserEditDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserEditDialog({ user, isOpen, onClose, onSuccess }: UserEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email,
      isSuspended: !!user.suspendedAt,
      suspensionReason: user.suspensionReason || '',
    },
  });

  // Reset form when user changes
  const resetForm = () => {
    form.reset({
      name: user.name || '',
      email: user.email,
      isSuspended: !!user.suspendedAt,
      suspensionReason: user.suspensionReason || '',
    });
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UserEditFormData) => {
      const response = await axios.patch<{ success: boolean }>(`/api/admin/users/${user.id}`, {
        name: data.name,
        email: data.email,
        suspendedAt: data.isSuspended ? new Date() : null,
        suspensionReason: data.isSuspended ? data.suspensionReason : null,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'User updated successfully',
        description: 'User profile has been updated.',
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-user-detail', user.id] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
      toast({
        title: 'Error updating user',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UserEditFormData) => {
    updateMutation.mutate(data);
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter user's name"
                      {...field}
                      disabled={updateMutation.isPending}
                      className="focus-visible:ring-2 focus-visible:ring-blue-600"
                    />
                  </FormControl>
                  <FormDescription>The display name for this user.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter user's email"
                      {...field}
                      disabled={updateMutation.isPending}
                      className="focus-visible:ring-2 focus-visible:ring-blue-600"
                    />
                  </FormControl>
                  <FormDescription>The email address for this user.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-md border p-4">
              <FormField
                control={form.control}
                name="isSuspended"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Clear suspension reason if unchecking
                          if (!checked) {
                            form.setValue('suspensionReason', '');
                          }
                        }}
                        disabled={updateMutation.isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Suspend User</FormLabel>
                      <FormDescription>Suspended users cannot access their account</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('isSuspended') && (
                <FormField
                  control={form.control}
                  name="suspensionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suspension Reason *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the reason for suspending this user..."
                          {...field}
                          disabled={updateMutation.isPending}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
