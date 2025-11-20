'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  Edit,
  Link2,
  Mail,
  MoreVertical,
  Search,
  Shield,
  User,
  XCircle,
} from 'lucide-react';

import { useCallback, useState } from 'react';

import { UserEditDialog } from './user-edit-dialog';
import { UserEmailManager } from './user-email-manager';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';

// Removed modals for MVP - inline actions only

interface UserEmail {
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  username: string | null;
  usernameSetAt: string | null;
  canUseVanityUrls: boolean;
  showPublicProfile: boolean;
  emails?: UserEmail[];
  _count: {
    wishes: number;
    lists: number;
    groupsJoined: number;
  };
}

interface UsersResponse {
  users: UserData[];
  total: number;
  hasMore: boolean;
}

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<UserData | null>(null);
  const [userEmails, setUserEmails] = useState<UserEmail[]>([]);

  const limit = 20;

  // Fetch users with filters
  const { data, isLoading, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String((page - 1) * limit),
      });

      if (search) {
        params.append('search', search);
      }
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (statusFilter !== 'all') {
        params.append('suspended', statusFilter === 'suspended' ? 'true' : 'false');
      }

      const response = await axios.get<UsersResponse>(`/api/admin/users?${params}`);
      return response.data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!data) {
      return;
    }

    if (selectedUsers.size === data.users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(data.users.map((u) => u.id)));
    }
  }, [data, selectedUsers]);

  // Handle individual selection
  const handleSelectUser = useCallback(
    (userId: string) => {
      const newSelected = new Set(selectedUsers);
      if (newSelected.has(userId)) {
        newSelected.delete(userId);
      } else {
        newSelected.add(userId);
      }
      setSelectedUsers(newSelected);
    },
    [selectedUsers]
  );

  // Handle user actions
  const handleSuspendUser = async (userId: string, reason: string) => {
    try {
      await axios.post(`/api/admin/users/${userId}/suspend`, {
        reason,
      });

      toast({
        title: 'User suspended',
        description: 'The user account has been suspended successfully.',
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin-user-detail', userId],
      });
      void refetch();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await axios.post(`/api/admin/users/${userId}/reactivate`);

      toast({
        title: 'User reactivated',
        description: 'The user account has been reactivated successfully.',
      });

      void queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      void refetch();
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMakeAdmin = (_userId: string) => {
    // TODO: Implement admin role endpoints in Phase 3
    toast({
      title: 'Feature Not Available',
      description: 'Admin role management will be available in Phase 3.',
      variant: 'destructive',
    });
  };

  const handleRemoveAdmin = (_userId: string) => {
    // TODO: Implement admin role endpoints in Phase 3
    toast({
      title: 'Feature Not Available',
      description: 'Admin role management will be available in Phase 3.',
      variant: 'destructive',
    });
  };

  const handleManageEmails = async (user: UserData) => {
    setSelectedUserForEmail(user);
    setEmailDialogOpen(true);

    // If emails are already included in user data, use them
    if (user.emails && user.emails.length > 0) {
      setUserEmails(user.emails);
      return;
    }

    // Otherwise, fetch emails on demand
    try {
      const response = await axios.get(`/api/admin/users/${user.id}/emails`);
      setUserEmails(response.data.emails || []);
    } catch (error) {
      console.error('Failed to fetch user emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user emails. Please try again.',
        variant: 'destructive',
      });
      setUserEmails([]);
    }
  };

  const handleToggleVanityAccess = async (userId: string, currentValue: boolean) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/vanity-access`, {
        canUseVanityUrls: !currentValue,
      });

      toast({
        title: 'Vanity URL Access Updated',
        description: `Vanity URL access has been ${!currentValue ? 'enabled' : 'disabled'}.`,
      });

      void queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      void refetch();
    } catch (error) {
      console.error('Failed to toggle vanity URL access:', error);
      toast({
        title: 'Error',
        description: 'Failed to update vanity URL access. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (user: UserData) => {
    if (user.suspendedAt) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (user.isAdmin) {
      return <Badge variant="default">Admin</Badge>;
    }
    return <Badge variant="secondary">User</Badge>;
  };

  // Mobile card view component
  const renderMobileCard = (user: UserData) => (
    <Card key={user.id} className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Checkbox
            checked={selectedUsers.has(user.id)}
            onCheckedChange={() => handleSelectUser(user.id)}
            aria-label={`Select user ${user.name || user.email}`}
            className="touch-target-enhanced mt-1"
          />
          <UserAvatar
            user={{
              id: user.id,
              name: user.name || null,
              email: user.email,
              avatarUrl: user.avatarUrl || null,
            }}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{user.name || 'Unnamed User'}</div>
            <div className="truncate text-sm text-muted-foreground">{user.email}</div>
            <div className="truncate text-xs text-muted-foreground">
              Username: {user.username || '(not set)'}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {getRoleBadge(user)}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${user.name || user.email}`}
              className="touch-target-enhanced h-12 w-12"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(user);
                setIsEditDialogOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // View details - simplified for MVP
                toast({
                  title: 'User Details',
                  description: `${user.name || 'No name'} - ${user.email}`,
                });
              }}
            >
              <User className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleManageEmails(user)}>
              <Mail className="mr-2 h-4 w-4" />
              Manage Emails
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void handleToggleVanityAccess(user.id, user.canUseVanityUrls)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {user.canUseVanityUrls ? 'Disable' : 'Enable'} Vanity URLs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.suspendedAt ? (
              <DropdownMenuItem onClick={() => void handleReactivateUser(user.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reactivate account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  // Simple suspend action for MVP
                  if (confirm(`Suspend user ${user.email}?`)) {
                    void handleSuspendUser(user.id, 'Admin suspension');
                  }
                }}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Suspend account
              </DropdownMenuItem>
            )}
            {user.isAdmin ? (
              <DropdownMenuItem onClick={() => handleRemoveAdmin(user.id)}>
                <Shield className="mr-2 h-4 w-4" />
                Remove admin role
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleMakeAdmin(user.id)}>
                <Shield className="mr-2 h-4 w-4" />
                Make admin
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>{user._count.wishes} wishes</span>
          <span>{user._count.lists} lists</span>
          <span>{user._count.groupsJoined} groups</span>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Search and filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <label htmlFor="user-search" className="sr-only">
              Search users by name or email
            </label>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="user-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-describedby="search-help"
            />
            <div id="search-help" className="sr-only">
              Search will filter users as you type. Use the dropdown filters to further refine
              results.
            </div>
          </div>

          <div className="flex gap-2" role="group" aria-label="User filters">
            <div>
              <label htmlFor="role-filter" className="sr-only">
                Filter by user role
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger
                  id="role-filter"
                  className="w-32 focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Filter by role"
                >
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="status-filter" className="sr-only">
                Filter by user status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  id="status-filter"
                  className="w-32 focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedUsers.size > 0 && (
          <div
            className="flex items-center gap-4 rounded-lg bg-muted p-4"
            role="region"
            aria-label="Bulk actions for selected users"
          >
            <span className="text-sm font-medium" aria-live="polite">
              {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUsers(new Set())}
              className="focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label={`Clear selection of ${selectedUsers.size} users`}
            >
              Clear selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                // TODO: Implement bulk suspend dialog and logic
                toast({
                  title: 'Bulk Suspend',
                  description: `This would suspend ${selectedUsers.size} selected users. Feature coming in Phase 2 completion.`,
                });
              }}
              className="focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label={`Suspend ${selectedUsers.size} selected users`}
            >
              Suspend selected
            </Button>
          </div>
        )}

        {/* Desktop table view */}
        <div
          className="hidden rounded-lg border md:block"
          role="region"
          aria-label="User management table"
        >
          <table className="w-full" aria-label="List of users with actions">
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-4 text-left">
                  <span className="sr-only">Select all users</span>
                  <Checkbox
                    checked={data?.users.length ? selectedUsers.size === data.users.length : false}
                    onCheckedChange={handleSelectAll}
                    aria-label={`Select all ${data?.users.length || 0} users`}
                    className="focus-visible:ring-2 focus-visible:ring-blue-600"
                  />
                </th>
                <th scope="col" className="p-4 text-left font-medium">
                  User
                </th>
                <th scope="col" className="hidden p-4 text-left font-medium sm:table-cell">
                  Username
                </th>
                <th scope="col" className="hidden p-4 text-left font-medium md:table-cell">
                  Status
                </th>
                <th scope="col" className="hidden p-4 text-left font-medium lg:table-cell">
                  Vanity Access
                </th>
                <th scope="col" className="hidden p-4 text-left font-medium xl:table-cell">
                  Activity
                </th>
                <th scope="col" className="p-4 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                        aria-label={`Select user ${user.name || user.email}`}
                        className="focus-visible:ring-2 focus-visible:ring-blue-600"
                      />
                    </td>
                    <th scope="row" className="p-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={{
                            id: user.id,
                            name: user.name || null,
                            email: user.email,
                            avatarUrl: user.avatarUrl || null,
                          }}
                          size="md"
                        />
                        <div>
                          <div className="font-medium">{user.name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </th>
                    <td className="hidden p-4 sm:table-cell">
                      <div className="text-sm">
                        {user.username || <span className="text-muted-foreground">(not set)</span>}
                      </div>
                    </td>
                    <td className="hidden p-4 md:table-cell">{getRoleBadge(user)}</td>
                    <td className="hidden p-4 lg:table-cell">
                      <Button
                        variant={user.canUseVanityUrls ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          void handleToggleVanityAccess(user.id, user.canUseVanityUrls)
                        }
                        className="touch-target-enhanced"
                      >
                        {user.canUseVanityUrls ? 'Enabled' : 'Disabled'}
                      </Button>
                    </td>
                    <td className="hidden p-4 xl:table-cell">
                      <div className="text-sm">
                        <div>{user._count.wishes} wishes</div>
                        <div className="text-muted-foreground">
                          {user._count.lists} lists • {user._count.groupsJoined} groups
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${user.name || user.email}`}
                            className="focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // View details - simplified for MVP
                              toast({
                                title: 'User Details',
                                description: `${user.name || 'No name'} - ${user.email}`,
                              });
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleManageEmails(user)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Manage Emails
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              void handleToggleVanityAccess(user.id, user.canUseVanityUrls)
                            }
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {user.canUseVanityUrls ? 'Disable' : 'Enable'} Vanity URLs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.suspendedAt ? (
                            <DropdownMenuItem onClick={() => void handleReactivateUser(user.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reactivate account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                // Simple suspend action for MVP
                                if (confirm(`Suspend user ${user.email}?`)) {
                                  void handleSuspendUser(user.id, 'Admin suspension');
                                }
                              }}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Suspend account
                            </DropdownMenuItem>
                          )}
                          {user.isAdmin ? (
                            <DropdownMenuItem onClick={() => handleRemoveAdmin(user.id)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Remove admin role
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleMakeAdmin(user.id)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="space-y-4 md:hidden" role="region" aria-label="User management cards">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
          ) : data?.users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No users found</div>
          ) : (
            data?.users.map((user) => renderMobileCard(user))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav role="navigation" aria-label="User list pagination">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground" aria-live="polite">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data?.total || 0)} of{' '}
                {data?.total || 0} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Go to previous page"
                  className="focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Go to next page"
                  className="focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Next
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>

      {/* User Edit Dialog */}
      {selectedUser && (
        <UserEditDialog
          user={{
            id: selectedUser.id,
            name: selectedUser.name,
            email: selectedUser.email,
            suspendedAt: selectedUser.suspendedAt ? new Date(selectedUser.suspendedAt) : null,
            suspensionReason: selectedUser.suspensionReason,
          }}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}

      {/* Email Management Dialog */}
      {emailDialogOpen && selectedUserForEmail && (
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Email Addresses</DialogTitle>
              <DialogDescription>
                Manage email addresses for {selectedUserForEmail.name || selectedUserForEmail.email}
              </DialogDescription>
            </DialogHeader>
            <UserEmailManager
              userId={selectedUserForEmail.id}
              userEmails={userEmails}
              userName={selectedUserForEmail.name || selectedUserForEmail.email || undefined}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
