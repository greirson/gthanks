import { Group, GroupInvitation, List, UserGroup } from '@prisma/client';

/**
 * API Response types with string dates for frontend consumption
 * These are the serialized versions of service types that get sent to the client
 */

// Group with member count - using string dates for API responses
export interface GroupWithCountsResponse extends Omit<Group, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    lists: number;
  };
  currentUserRole?: 'admin' | 'member' | null;
}

// Group with full details - using string dates for API responses
export interface GroupWithDetailsResponse extends Omit<Group, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  members: GroupMemberDetailsResponse[];
  lists: ListWithOwnerResponse[];
  invitations: GroupInvitationDetailsResponse[];
  currentUserRole?: 'admin' | 'member' | null;
  _count: {
    members: number;
    lists: number;
  };
}

// Group member with user details - for API responses
export interface GroupMemberDetailsResponse extends Omit<UserGroup, 'joinedAt'> {
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

// List with user info - using string dates for API responses
export interface ListWithOwnerResponse extends Omit<List, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
  };
  _count?: {
    listWishes: number;
  };
}

// Invitation with inviter details - for API responses
export interface GroupInvitationDetailsResponse
  extends Omit<GroupInvitation, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
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

// Wish type for API responses (with string dates)
export interface WishResponse {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  notes: string | null;
  color: string | null;
  size: string | null;
  brand: string | null;
  quantity: number;
  isReserved: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  wishLevel: number | null;
}
