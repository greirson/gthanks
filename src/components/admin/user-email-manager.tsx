'use client';

import { useState } from 'react';
import { Mail, Shield, AlertCircle, CheckCircle2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface UserEmail {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

interface UserEmailManagerProps {
  userId: string;
  userEmails: UserEmail[];
  userName?: string;
}

type MessageType = 'success' | 'error' | 'info';

interface Message {
  type: MessageType;
  text: string;
}

export function UserEmailManager({ userId, userEmails, userName }: UserEmailManagerProps) {
  const [emails, setEmails] = useState<UserEmail[]>(userEmails);
  const [newEmail, setNewEmail] = useState('');
  const [sendVerification, setSendVerification] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    emailId: string;
    email: string;
  }>({ open: false, emailId: '', email: '' });

  // Sort emails: Primary first, then by creation order
  const sortedEmails = [...emails].sort((a, b) => {
    if (a.isPrimary) {
      return -1;
    }
    if (b.isPrimary) {
      return 1;
    }
    return 0;
  });

  const showMessage = (type: MessageType, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      showMessage('error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showMessage('error', 'Please enter a valid email address');
      return;
    }

    // Check for duplicates
    if (emails.some((e) => e.email.toLowerCase() === newEmail.toLowerCase())) {
      showMessage('error', 'This email address is already added');
      return;
    }

    setLoading('add');
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, sendVerification }),
      });

      const data = (await response.json()) as { email?: UserEmail; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to add email');
      }

      if (data.email) {
        setEmails([...emails, data.email]);
      }
      setNewEmail('');
      showMessage(
        'success',
        `Email added successfully${sendVerification ? '. Verification email sent.' : ''}`
      );
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to add email');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    setLoading(`remove-${emailId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails/${emailId}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to remove email');
      }

      setEmails(emails.filter((e) => e.id !== emailId));
      showMessage('success', 'Email removed successfully');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to remove email');
    } finally {
      setLoading(null);
      setConfirmDialog({ open: false, emailId: '', email: '' });
    }
  };

  const handleSetPrimary = async (emailId: string) => {
    setLoading(`primary-${emailId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails/${emailId}/set-primary`, {
        method: 'POST',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to set primary email');
      }

      // Update emails list
      setEmails(
        emails.map((e) => ({
          ...e,
          isPrimary: e.id === emailId,
        }))
      );
      showMessage('success', 'Primary email updated successfully');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to set primary email');
    } finally {
      setLoading(null);
    }
  };

  const handleResendVerification = async (emailId: string) => {
    setLoading(`resend-${emailId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails/${emailId}/resend`, {
        method: 'POST',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to resend verification email');
      }

      showMessage('success', 'Verification email sent. User should check their inbox.');
    } catch (error) {
      showMessage(
        'error',
        error instanceof Error ? error.message : 'Failed to resend verification email'
      );
    } finally {
      setLoading(null);
    }
  };

  const canRemoveEmail = (email: UserEmail): boolean => {
    // Cannot remove if it's the only email
    if (emails.length === 1) {
      return false;
    }
    // Cannot remove if it's the only verified email and is primary
    const verifiedEmails = emails.filter((e) => e.isVerified);
    return !(email.isPrimary && verifiedEmails.length === 1);
  };

  const canSetPrimary = (email: UserEmail): boolean => {
    return email.isVerified && !email.isPrimary;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Addresses</CardTitle>
          <CardDescription>
            {userName ? (
              <>
                Managing email addresses for <strong>{userName}</strong>
              </>
            ) : (
              'Manage user email addresses'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Display */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {message.type === 'info' && <Mail className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Email List */}
          <div className="space-y-3">
            {sortedEmails.map((email) => (
              <div
                key={email.id}
                className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="break-all text-sm font-medium">{email.email}</p>
                      {email.isPrimary && (
                        <Badge variant="default" className="flex-shrink-0">
                          Primary
                        </Badge>
                      )}
                      {!email.isVerified && (
                        <Badge variant="outline" className="flex-shrink-0">
                          Unverified
                        </Badge>
                      )}
                      {email.isVerified && !email.isPrimary && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Shield className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {email.verifiedAt && (
                        <p>Verified {new Date(email.verifiedAt).toLocaleDateString()}</p>
                      )}
                      <p>Added {new Date(email.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  {canSetPrimary(email) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSetPrimary(email.id)}
                      disabled={loading !== null}
                    >
                      {loading === `primary-${email.id}` ? 'Setting...' : 'Make Primary'}
                    </Button>
                  )}

                  {!email.isVerified && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleResendVerification(email.id)}
                      disabled={loading !== null}
                    >
                      {loading === `resend-${email.id}` ? 'Sending...' : 'Resend Verification'}
                    </Button>
                  )}

                  {canRemoveEmail(email) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setConfirmDialog({ open: true, emailId: email.id, email: email.email })
                      }
                      disabled={loading !== null}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      className="opacity-40"
                      title={
                        emails.length === 1
                          ? 'Cannot remove the only email'
                          : 'Cannot remove the only verified email'
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Email Form */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Add New Email</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="new-email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddEmail();
                  }
                }}
                disabled={loading !== null}
                className="flex-1"
              />
              <Button
                onClick={() => void handleAddEmail()}
                disabled={loading !== null || !newEmail.trim()}
                className="w-full sm:w-auto"
              >
                {loading === 'add' ? 'Adding...' : 'Add Email'}
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={sendVerification}
                onChange={(e) => setSendVerification(e.target.checked)}
                disabled={loading !== null}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Send verification email to user
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, emailId: '', email: '' })}
        title="Remove Email Address"
        description={`Are you sure you want to remove ${confirmDialog.email}? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleRemoveEmail(confirmDialog.emailId)}
      />
    </div>
  );
}
