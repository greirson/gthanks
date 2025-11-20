# Avatar Deletion & Data URL Processing Implementation

## Summary

Implemented two backend API improvements for avatar handling:

1. **DELETE endpoints** for user and group avatar removal
2. **Data URL processing** during group creation to convert base64 images to files

---

## Task 3: DELETE Endpoints for Avatar Removal

### Endpoint 1: User Avatar Deletion

**File:** `/src/app/api/user/avatar/route.ts`

**Method:** `DELETE /api/user/avatar`

**Functionality:**

- Authenticates the user
- Retrieves current avatar URL from database
- Deletes the file if it's a local upload (`/api/images/` path)
- Sets `avatarUrl` and `image` to `null` in database
- Returns `204 No Content`

**Security:**

- User can only delete their own avatar
- Only deletes local uploads, not OAuth avatars or external URLs
- Handles missing files gracefully (logs warning, continues)

**Code Changes:**

- Added `DELETE` method handler
- Uses `imageProcessor.deleteImage()` for file deletion
- Properly handles errors with user-friendly messages

---

### Endpoint 2: Group Avatar Deletion

**File:** `/src/app/api/groups/[id]/avatar/route.ts`

**Method:** `DELETE /api/groups/[id]/avatar`

**Functionality:**

- Authenticates the user
- Checks admin permissions using `groupService.requireAdmin()`
- Retrieves current avatar URL from database
- Deletes the file if it's a local upload (`/api/images/` path)
- Sets `avatarUrl` to `null` in database
- Returns `204 No Content`

**Security:**

- Only group admins can delete group avatar
- Returns `403 Forbidden` if user is not admin
- Only deletes local uploads, not data URLs
- Handles missing files gracefully (logs warning, continues)

**Code Changes:**

- Added `DELETE` method handler
- Uses `groupService.requireAdmin()` for permission check
- Uses `imageProcessor.deleteImage()` for file deletion
- Properly handles errors with user-friendly messages

---

## Updated Image Deletion Logic

**File:** `/src/lib/services/image-processor.ts`

**Method:** `deleteImage(localPath: string)`

**Changes:**

- Now supports both `/api/images/` paths (new format) and `/uploads/items/` paths (legacy)
- For `/api/images/` paths: extracts filename and deletes from `uploadsDir`
- For `/uploads/items/` paths: deletes from `public/` directory
- Throws error for invalid paths
- Logs errors but doesn't throw (file might already be deleted)

**Code:**

```typescript
async deleteImage(localPath: string): Promise<void> {
  try {
    // Support both legacy /uploads/items/ paths and new /api/images/ paths
    if (localPath.startsWith('/api/images/')) {
      // Extract filename from /api/images/{filename}
      const filename = path.basename(localPath);
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);
    } else if (localPath.startsWith('/uploads/items/')) {
      // Legacy path format
      const filepath = path.join(process.cwd(), 'public', localPath);
      await fs.unlink(filepath);
    } else {
      throw new Error('Invalid image path');
    }
  } catch (error) {
    logger.error(`Failed to delete image ${localPath}:`, error, { localPath });
    // Don't throw - file might already be deleted
  }
}
```

---

## Task 4: Fix Group Creation Avatar Not Saving

### Problem

When creating a new group with an avatar, the avatar was stored as a data URL string in the database. This caused issues:

- Data URLs are very long strings (can be 100KB+)
- GET endpoint expects file paths, not data URLs
- Avatar doesn't display correctly after group creation

### Solution

**File:** `/src/app/api/groups/route.ts`

**Changes:**

1. Added `processDataUrlToFile()` helper function
2. Updated `POST` handler to detect and process data URLs before calling service

**Helper Function:**

```typescript
async function processDataUrlToFile(dataUrl: string): Promise<string> {
  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const [, , base64Data] = matches;

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Process and save image using imageProcessor
  // This will resize, optimize, convert to WebP, and save to filesystem
  const result = await imageProcessor.processImageFromBuffer(buffer);

  return result.localPath; // Returns '/api/images/abc123.webp'
}
```

**Updated POST Handler:**

```typescript
export async function POST(request: NextRequest) {
  // ... authentication and parsing ...

  // Process data URL avatar if present
  let processedData = { ...data };

  if (data.avatarUrl && data.avatarUrl.startsWith('data:image/')) {
    try {
      logger.info('Processing data URL avatar for group creation');
      // Convert data URL to file and save it
      const avatarPath = await processDataUrlToFile(data.avatarUrl);
      processedData.avatarUrl = avatarPath;
      logger.info({ avatarPath }, 'Avatar data URL processed successfully');
    } catch (error) {
      logger.error({ error: error }, 'Failed to process avatar data URL');
      // Continue without avatar rather than failing the entire request
      processedData.avatarUrl = undefined;
    }
  }

  const group = await groupService.createGroup(processedData, user.id);
  // ... rest of handler ...
}
```

**Benefits:**

- Data URLs are converted to optimized WebP files
- Files are properly stored in filesystem
- Avatar displays correctly after group creation
- Reduces database storage (file path instead of 100KB+ string)
- Consistent with how user avatar uploads work

---

## Testing Checklist

### User Avatar Deletion

- [ ] DELETE `/api/user/avatar` removes user avatar
- [ ] User avatar file is deleted from filesystem
- [ ] Database `avatarUrl` is set to null
- [ ] Unauthenticated requests return 401
- [ ] Deleting non-existent avatar returns 204 (graceful handling)
- [ ] OAuth avatars (external URLs) are not deleted from filesystem
- [ ] Data URL avatars are not deleted from filesystem (only DB cleared)

### Group Avatar Deletion

- [ ] DELETE `/api/groups/{id}/avatar` removes group avatar (admin only)
- [ ] Group avatar file is deleted from filesystem
- [ ] Database `avatarUrl` is set to null
- [ ] Non-admins get 403 when trying to delete group avatar
- [ ] Unauthenticated requests return 401
- [ ] Deleting non-existent avatar returns 204 (graceful handling)
- [ ] Data URL avatars are not deleted from filesystem (only DB cleared)

### Group Creation with Avatar

- [ ] Creating group with data URL avatar saves file (not data URL)
- [ ] Group avatar displays correctly after creation
- [ ] Avatar is optimized and converted to WebP
- [ ] Avatar file is saved to correct directory
- [ ] Database stores file path (`/api/images/...`), not data URL
- [ ] If avatar processing fails, group is still created without avatar
- [ ] No errors in logs for successful avatar processing

### File System Integrity

- [ ] Avatar files are actually deleted from filesystem
- [ ] Deleted files don't leave orphaned data
- [ ] `/api/images/{filename}` endpoint serves new group avatars correctly
- [ ] No file permission errors

---

## API Documentation

### DELETE /api/user/avatar

**Description:** Removes the current user's avatar

**Authentication:** Required (session-based)

**Authorization:** User can only delete their own avatar

**Request:** No body required

**Response:**

- **204 No Content** - Avatar deleted successfully
- **401 Unauthorized** - User not authenticated
- **500 Internal Server Error** - Failed to delete avatar

**Side Effects:**

- Deletes avatar file from filesystem (if local upload)
- Sets `avatarUrl` and `image` to `null` in database

---

### DELETE /api/groups/[id]/avatar

**Description:** Removes the group's avatar

**Authentication:** Required (session-based)

**Authorization:** User must be a group admin

**Request:** No body required

**Response:**

- **204 No Content** - Avatar deleted successfully
- **401 Unauthorized** - User not authenticated
- **403 Forbidden** - User is not a group admin
- **404 Not Found** - Group not found
- **500 Internal Server Error** - Failed to delete avatar

**Side Effects:**

- Deletes avatar file from filesystem (if local upload)
- Sets `avatarUrl` to `null` in database

---

## Files Modified

1. `/src/app/api/user/avatar/route.ts`
   - Added `DELETE` method handler

2. `/src/app/api/groups/[id]/avatar/route.ts`
   - Added `DELETE` method handler

3. `/src/lib/services/image-processor.ts`
   - Updated `deleteImage()` to support `/api/images/` paths

4. `/src/app/api/groups/route.ts`
   - Added `processDataUrlToFile()` helper function
   - Updated `POST` handler to process data URL avatars
   - Added imports for `imageProcessor` and `logger`

---

## Next Steps

After testing, consider:

1. Add E2E tests for avatar deletion flows
2. Add unit tests for `processDataUrlToFile()` function
3. Document API endpoints in API documentation
4. Consider adding avatar size limits validation
5. Consider adding avatar format validation (MIME type checking)

---

## Implementation Notes

**Error Handling:**

- File deletion errors are logged but don't fail the request
- Data URL processing errors are logged and gracefully handled
- User-friendly error messages for all failure cases

**Security:**

- Permission checks using `groupService.requireAdmin()`
- Only local uploads are deleted (no external URL deletion)
- Proper authentication checks on all endpoints

**Logging:**

- All errors are logged with context
- Successful operations are logged (data URL processing)
- Warnings for missing files (might already be deleted)

**Database Updates:**

- User avatar: Sets both `avatarUrl` and `image` to null (NextAuth compatibility)
- Group avatar: Sets `avatarUrl` to null
- No cascade deletes - just sets to null

**File Management:**

- Supports both legacy (`/uploads/items/`) and new (`/api/images/`) paths
- Uses `path.basename()` to safely extract filename
- Uses `this.uploadsDir` for consistent path resolution
- Gracefully handles missing files (file might already be deleted)
