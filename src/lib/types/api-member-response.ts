// Type for the unique members API response
export interface UniqueMemberResponse {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  groupCount?: number;
}

export interface UniqueMembersApiResponse {
  members: UniqueMemberResponse[];
}
