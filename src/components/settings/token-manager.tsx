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
import { DEVICE_TYPES, type DeviceType, type TokenInfo } from '@/lib/validators/token';

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
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
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
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString();
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

  // Show-once dialog state (after token creation)
  const [showOnceDialogOpen, setShowOnceDialogOpen] = useState(false);
  const [createdTokens, setCreatedTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'access' | 'refresh' | null>(null);

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
      const body: { name: string; deviceType?: string } = {
        name: newTokenName.trim(),
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

      if ('accessToken' in data) {
        // Store tokens for show-once dialog
        setCreatedTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        // Close create dialog and open show-once dialog
        setCreateDialogOpen(false);
        setShowOnceDialogOpen(true);

        // Reset form
        setNewTokenName('');
        setNewTokenDeviceType('');

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
  const handleCopy = async (text: string, field: 'access' | 'refresh') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  // Revoke token handler
  const handleRevokeToken = async (tokenId: string) => {
    setActionLoading(`revoke-${tokenId}`);
    try {
      const response = await fetch(`/api/auth/tokens/${tokenId}`, {
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
    setCreatedTokens(null);
    setCopiedField(null);
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
              Copy your tokens now. You won&apos;t be able to see them again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy these tokens and store them securely. They won&apos;t be shown
                again.
              </AlertDescription>
            </Alert>

            {createdTokens && (
              <>
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={createdTokens.accessToken}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopy(createdTokens.accessToken, 'access')}
                      className="flex-shrink-0"
                    >
                      {copiedField === 'access' ? (
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

                <div className="space-y-2">
                  <Label>Refresh Token</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={createdTokens.refreshToken}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopy(createdTokens.refreshToken, 'refresh')}
                      className="flex-shrink-0"
                    >
                      {copiedField === 'refresh' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this token to get new access tokens when they expire.
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
        description={`Are you sure you want to revoke "${revokeDialog.tokenName}"? Any apps or services using this token will no longer be able to access your account. This action cannot be undone.`}
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleRevokeToken(revokeDialog.tokenId)}
      />
    </div>
  );
}
