'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Smartphone,
  Globe,
  Code,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Infinity,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DEVICE_TYPES,
  EXPIRATION_OPTIONS,
  EXPIRATION_LABELS,
  DEFAULT_EXPIRATION,
  type DeviceType,
  type ExpirationOption,
  type TokenInfo,
} from '@/lib/validators/token';

// Device type labels for display
const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  safari_extension: 'Safari Extension',
  chrome_extension: 'Chrome Extension',
  firefox_extension: 'Firefox Extension',
  ios_app: 'iOS App',
  android_app: 'Android App',
  api_client: 'API Client',
  other: 'Other',
};

// Get icon for device type
function DeviceIcon({ deviceType, className }: { deviceType: string | null; className?: string }) {
  const iconClass = className || 'h-5 w-5';

  switch (deviceType) {
    case 'safari_extension':
      return <Globe className={iconClass} />;
    case 'chrome_extension':
      return <Globe className={iconClass} />;
    case 'firefox_extension':
      return <Globe className={iconClass} />;
    case 'ios_app':
      return <Smartphone className={iconClass} />;
    case 'android_app':
      return <Smartphone className={iconClass} />;
    case 'api_client':
      return <Code className={iconClass} />;
    default:
      return <Key className={iconClass} />;
  }
}

type MessageType = 'success' | 'error';

interface Message {
  type: MessageType;
  text: string;
}

interface ApiErrorResponse {
  error: string;
  message?: string;
}

interface TokenCreationResponse {
  token: string;
  expiresAt: number | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface TokenListResponse {
  tokens: TokenInfo[];
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error === 'string'
  );
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) {
    return 'Never used';
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return diffMins + ' minute' + (diffMins === 1 ? '' : 's') + ' ago';
  }
  if (diffHours < 24) {
    return diffHours + ' hour' + (diffHours === 1 ? '' : 's') + ' ago';
  }
  if (diffDays < 7) {
    return diffDays + ' day' + (diffDays === 1 ? '' : 's') + ' ago';
  }

  return date.toLocaleDateString();
}

// Format expiration display
function formatExpiration(expiresAt: string | null): string {
  if (!expiresAt) {
    return 'Never expires';
  }

  const date = new Date(expiresAt);
  const now = new Date();

  // Check if expired
  if (date < now) {
    return 'Expired';
  }

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 1) {
    return 'Expires today';
  }
  if (diffDays === 1) {
    return 'Expires tomorrow';
  }
  if (diffDays < 7) {
    return 'Expires in ' + diffDays + ' days';
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return 'Expires in ' + weeks + ' week' + (weeks === 1 ? '' : 's');
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return 'Expires in ' + months + ' month' + (months === 1 ? '' : 's');
  }

  return 'Expires ' + date.toLocaleDateString();
}

// Get badge variant for expiration
function getExpirationBadgeVariant(
  expiresAt: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!expiresAt) {
    return 'secondary'; // Never expires
  }

  const date = new Date(expiresAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return 'destructive'; // Expired
  }
  if (diffDays < 7) {
    return 'destructive'; // Expiring soon
  }
  if (diffDays < 30) {
    return 'outline'; // Warning
  }

  return 'secondary'; // Normal
}

export function TokenManager() {
  // Token list state
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  // Create token dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenDeviceType, setNewTokenDeviceType] = useState<string>('');
  const [newTokenExpiration, setNewTokenExpiration] =
    useState<ExpirationOption>(DEFAULT_EXPIRATION);

  // Show-once dialog state (after token creation)
  const [showOnceDialogOpen, setShowOnceDialogOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<{
    token: string;
    expiresAt: number | null;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Revoke confirmation dialog state
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    tokenId: string;
    tokenName: string;
  }>({ open: false, tokenId: '', tokenName: '' });

  const showMessage = useCallback((type: MessageType, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Fetch tokens on mount
  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/tokens');
      const data = (await response.json()) as TokenListResponse | ApiErrorResponse;

      if (!response.ok) {
        const errorMessage = isApiErrorResponse(data)
          ? data.message || data.error
          : 'Failed to load tokens';
        throw new Error(errorMessage);
      }

      if ('tokens' in data) {
        setTokens(data.tokens);
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  // Create token handler
  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      showMessage('error', 'Please enter a name for the token');
      return;
    }

    setActionLoading('create');
    try {
      const body: { name: string; deviceType?: string; expiresIn: ExpirationOption } = {
        name: newTokenName.trim(),
        expiresIn: newTokenExpiration,
      };
      if (newTokenDeviceType) {
        body.deviceType = newTokenDeviceType;
      }

      const response = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as TokenCreationResponse | ApiErrorResponse;

      if (!response.ok) {
        const errorMessage = isApiErrorResponse(data)
          ? data.message || data.error
          : 'Failed to create token';
        throw new Error(errorMessage);
      }

      if ('token' in data) {
        // Store token for show-once dialog
        setCreatedToken({
          token: data.token,
          expiresAt: data.expiresAt,
        });

        // Close create dialog and open show-once dialog
        setCreateDialogOpen(false);
        setShowOnceDialogOpen(true);

        // Reset form
        setNewTokenName('');
        setNewTokenDeviceType('');
        setNewTokenExpiration(DEFAULT_EXPIRATION);

        // Refresh token list
        void fetchTokens();
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to create token');
    } finally {
      setActionLoading(null);
    }
  };

  // Copy to clipboard handler
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  // Revoke token handler
  const handleRevokeToken = async (tokenId: string) => {
    setActionLoading('revoke-' + tokenId);
    try {
      const response = await fetch('/api/auth/tokens/' + tokenId, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiErrorResponse;
        const errorMessage = isApiErrorResponse(data)
          ? data.message || data.error
          : 'Failed to revoke token';
        throw new Error(errorMessage);
      }

      setTokens(tokens.filter((t) => t.id !== tokenId));
      showMessage('success', 'Token revoked successfully');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to revoke token');
    } finally {
      setActionLoading(null);
      setRevokeDialog({ open: false, tokenId: '', tokenName: '' });
    }
  };

  // Close show-once dialog handler
  const handleCloseShowOnce = () => {
    setShowOnceDialogOpen(false);
    setCreatedToken(null);
    setCopiedToken(false);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Token List */}
      <div className="space-y-3">
        {tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Key className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No access tokens yet. Create one to connect apps and extensions.
            </p>
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
                  <DeviceIcon deviceType={token.deviceType} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{token.name}</p>
                    {token.current && (
                      <Badge variant="default" className="flex-shrink-0">
                        Current
                      </Badge>
                    )}
                    <Badge
                      variant={getExpirationBadgeVariant(token.expiresAt)}
                      className="flex-shrink-0"
                    >
                      {!token.expiresAt && <Infinity className="mr-1 h-3 w-3" />}
                      {formatExpiration(token.expiresAt)}
                    </Badge>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>
                      Last used:{' '}
                      <span className="font-medium">{formatRelativeTime(token.lastUsedAt)}</span>
                    </p>
                    <p>
                      Created:{' '}
                      <span className="font-medium">
                        {new Date(token.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRevokeDialog({
                      open: true,
                      tokenId: token.id,
                      tokenName: token.name,
                    })
                  }
                  disabled={actionLoading !== null}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">Revoke</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Token Button */}
      <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Create Token
      </Button>

      {/* Create Token Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Access Token</DialogTitle>
            <DialogDescription>
              Create a new token to connect apps, browser extensions, or other services to your
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="My Safari Extension"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreateToken();
                  }
                }}
                disabled={actionLoading === 'create'}
              />
              <p className="text-xs text-muted-foreground">
                Give your token a name to help you remember what it&apos;s for.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type (optional)</Label>
              <Select value={newTokenDeviceType} onValueChange={setNewTokenDeviceType}>
                <SelectTrigger id="device-type">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <DeviceIcon deviceType={type} className="h-4 w-4" />
                        {DEVICE_TYPE_LABELS[type]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration</Label>
              <Select
                value={newTokenExpiration}
                onValueChange={(v) => setNewTokenExpiration(v as ExpirationOption)}
              >
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      <span className="flex items-center gap-2">
                        {option === 'never' && <Infinity className="h-4 w-4" />}
                        {EXPIRATION_LABELS[option]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how long this token should be valid. You can always revoke it early.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={actionLoading === 'create'}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateToken()}
              disabled={actionLoading === 'create' || !newTokenName.trim()}
            >
              {actionLoading === 'create' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Token'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show-Once Dialog (Token Display) */}
      <Dialog open={showOnceDialogOpen} onOpenChange={handleCloseShowOnce}>
        <DialogContent hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Token Created
            </DialogTitle>
            <DialogDescription>
              Copy your token now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy this token and store it securely. It won&apos;t be shown again.
              </AlertDescription>
            </Alert>

            {createdToken && (
              <>
                <div className="space-y-2">
                  <Label>Your Token</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={createdToken.token} className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopy(createdToken.token)}
                      className="flex-shrink-0"
                    >
                      {copiedToken ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this token to authenticate API requests.
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <span className="font-medium">Expires: </span>
                    {createdToken.expiresAt
                      ? new Date(createdToken.expiresAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Never'}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleCloseShowOnce} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={revokeDialog.open}
        onOpenChange={(open) => setRevokeDialog({ open, tokenId: '', tokenName: '' })}
        title="Revoke Access Token"
        description={
          'Are you sure you want to revoke "' +
          revokeDialog.tokenName +
          '"? Any apps or services using this token will no longer be able to access your account. This action cannot be undone.'
        }
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleRevokeToken(revokeDialog.tokenId)}
      />
    </div>
  );
}
