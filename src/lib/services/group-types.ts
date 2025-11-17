import { Group, GroupInvitation, List, UserGroup } from '@prisma/client';

// Group with member count - using Date objects (serialized at API layer)
export interface GroupWithCounts extends Group {
  _count: {
    members: number;
    lists: number;
  };
  currentUserRole?: 'admin' | 'member' | null;
}

// Group with full details - using Date objects (serialized at API layer)
export interface GroupWithDetails extends Group {
  members: GroupMemberDetails[];
  lists: ListWithOwner[];
  invitations: GroupInvitationDetails[];
  currentUserRole?: 'admin' | 'member' | null;
  _count: {
    members: number;
    lists: number;
  };
}

// Group member with user details
export interface GroupMemberDetails extends UserGroup {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

// List with owner info - using Date objects (serialized at API layer)
export interface ListWithOwner extends List {
  owner: {
    id: string;
    name: string | null;
  };
  _count?: {
    wishes: number;
  };
}

// Invitation with inviter details
export interface GroupInvitationDetails extends GroupInvitation {
  inviter: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  group: {
    id: string;
    name: string;
    description?: string | null;
  };
  // Computed status based on acceptedAt
  status?: 'pending' | 'accepted';
}

// Group member permissions
export interface GroupPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canRemoveMembers: boolean;
  canManageLists: boolean;
}
