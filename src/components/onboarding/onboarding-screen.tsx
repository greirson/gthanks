'use client';

import { ArrowRight, CheckCircle, Gift, Upload } from 'lucide-react';

import { useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { AvatarCropDialog } from '@/components/ui/avatar-crop-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useToast } from '@/components/ui/use-toast';

interface OnboardingScreenProps {
  defaultName?: string;
  defaultAvatar?: string;
}

export function OnboardingScreen({ defaultName = '', defaultAvatar = '' }: OnboardingScreenProps) {
  const { update: updateSession } = useSession();
  const { toast: showToast } = useToast();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
  const [isLoading, setIsLoading] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
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
    setIsCropDialogOpen(true);
  };

  const handleCompleteOnboarding = async () => {
    if (!name.trim()) {
      showToast({
        title: 'Name Required',
        description: 'Please tell us what you want people to call you',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile with name and optional avatar, mark onboarding complete
      const response = await fetch('/api/user/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      // Update session with new data
      await updateSession({
        name: name.trim(),
        image: avatarUrl || undefined,
      });

      showToast({
        title: 'Welcome to gthanks!',
        description: 'Your profile has been set up successfully',
      });

      // Redirect to wishes
      router.push('/wishes');
      router.refresh(); // Ensure session refresh
    } catch (error) {
      console.error('Onboarding error:', error);
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4 dark:from-gray-900 dark:to-gray-800 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Gift className="h-8 w-8 text-purple-600 dark:text-purple-300" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to gthanks!</h1>
          <p className="mt-2 text-muted-foreground">Let&apos;s set up your profile</p>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCompleteOnboarding();
              }}
              className="space-y-6"
            >
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  What do you want people to call you?
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={isLoading}
                  className="min-h-[44px]"
                  maxLength={100}
                  autoComplete="name"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is how you&apos;ll appear to family and friends.
                </p>
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add a profile photo (optional)</Label>

                {avatarUrl && (
                  <div className="flex items-center gap-4 mt-4">
                    <UserAvatar
                      user={{
                        id: 'preview',
                        name,
                        email: null,
                        avatarUrl,
                      }}
                      size="2xl"
                    />
                    <p className="text-sm text-muted-foreground">Your photo</p>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />

                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] w-full mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>

                <p className="text-xs text-muted-foreground mt-2">
                  JPEG, PNG, GIF, or WebP. Maximum size 2MB.
                </p>
              </div>

              <AvatarCropDialog
                open={isCropDialogOpen}
                onOpenChange={(open) => {
                  setIsCropDialogOpen(open);
                  if (!open) {
                    setSelectedFile(null); // Clear file when dialog closes
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''; // Reset file input
                    }
                  }
                }}
                mode="user"
                currentImage={avatarUrl}
                preSelectedFile={selectedFile ?? undefined}
                onSave={async (file) => {
                  // Upload the cropped image
                  const formData = new FormData();
                  formData.append('avatar', file, 'avatar.jpg');

                  const response = await fetch('/api/user/avatar', {
                    method: 'POST',
                    body: formData,
                  });

                  if (response.ok) {
                    const result = (await response.json()) as { avatarUrl: string };
                    setAvatarUrl(result.avatarUrl);
                    toast.success('Photo uploaded successfully');
                  } else {
                    toast.error('Failed to upload photo');
                  }
                }}
                shape="circle"
                entityName={name || 'Your photo'}
                disabled={isLoading}
              />

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="min-h-[44px] w-full"
                  size="lg"
                >
                  {isLoading ? (
                    'Setting up...'
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Helper Text */}
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>You can update your profile anytime in settings</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
