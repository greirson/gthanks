import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { db } from '@/lib/db';
import { userService } from '@/lib/services/user-service';
import { listService } from '@/lib/services/list-service';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';

describe('Vanity URLs Integration Tests', () => {
  let testUser: any;
  let testList: any;

  beforeEach(async () => {
    // Create test user with vanity URL access
    testUser = await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        canUseVanityUrls: true,
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    if (testList) {
      await db.list.delete({ where: { id: testList.id } }).catch(() => {});
    }
    if (testUser) {
      await db.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  describe('userService.setUsername', () => {
    it('should successfully set username for eligible user', async () => {
      const username = 'testuser';
      const updatedUser = await userService.setUsername(testUser.id, username);

      expect(updatedUser.username).toBe('testuser');
      expect(updatedUser.usernameSetAt).toBeDefined();
    });

    it('should normalize username to lowercase', async () => {
      const updatedUser = await userService.setUsername(testUser.id, 'TestUser');
      expect(updatedUser.username).toBe('testuser');
    });

    it('should reject duplicate usernames', async () => {
      await userService.setUsername(testUser.id, 'duplicate');

      const otherUser = await db.user.create({
        data: {
          email: 'other@example.com',
          canUseVanityUrls: true,
        },
      });

      await expect(
        userService.setUsername(otherUser.id, 'duplicate')
      ).rejects.toThrow(ConflictError);

      await db.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject if user already has username', async () => {
      await userService.setUsername(testUser.id, 'first');

      await expect(
        userService.setUsername(testUser.id, 'second')
      ).rejects.toThrow(ConflictError);
    });

    it('should reject if user does not have vanity URL access', async () => {
      const noAccessUser = await db.user.create({
        data: {
          email: 'noaccess@example.com',
          canUseVanityUrls: false,
        },
      });

      await expect(
        userService.setUsername(noAccessUser.id, 'username')
      ).rejects.toThrow(ForbiddenError);

      await db.user.delete({ where: { id: noAccessUser.id } });
    });
  });

  describe('userService.canSetUsername', () => {
    it('should return true for eligible user without username', async () => {
      const canSet = await userService.canSetUsername(testUser.id);
      expect(canSet).toBe(true);
    });

    it('should return false if user already has username', async () => {
      await userService.setUsername(testUser.id, 'existing');
      const canSet = await userService.canSetUsername(testUser.id);
      expect(canSet).toBe(false);
    });

    it('should return false if user does not have vanity URL access', async () => {
      await db.user.update({
        where: { id: testUser.id },
        data: { canUseVanityUrls: false },
      });

      const canSet = await userService.canSetUsername(testUser.id);
      expect(canSet).toBe(false);
    });
  });

  describe('listService.setSlug', () => {
    beforeEach(async () => {
      // Set username first
      await userService.setUsername(testUser.id, 'testuser');

      // Create test list
      testList = await db.list.create({
        data: {
          name: 'Test List',
          ownerId: testUser.id,
          visibility: 'public',
        },
      });
    });

    it('should successfully set slug for list owner', async () => {
      const updatedList = await listService.setSlug(testList.id, testUser.id, 'my-list');
      expect(updatedList.slug).toBe('my-list');
    });

    it('should normalize slug to lowercase', async () => {
      const updatedList = await listService.setSlug(testList.id, testUser.id, 'My-List');
      expect(updatedList.slug).toBe('my-list');
    });

    it('should reject duplicate slugs for same user', async () => {
      await listService.setSlug(testList.id, testUser.id, 'duplicate');

      const otherList = await db.list.create({
        data: {
          name: 'Other List',
          ownerId: testUser.id,
          visibility: 'public',
        },
      });

      await expect(
        listService.setSlug(otherList.id, testUser.id, 'duplicate')
      ).rejects.toThrow(ConflictError);

      await db.list.delete({ where: { id: otherList.id } });
    });

    it('should allow same slug for different users', async () => {
      await listService.setSlug(testList.id, testUser.id, 'shared-slug');

      const otherUser = await db.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          usernameSetAt: new Date(),
          canUseVanityUrls: true,
        },
      });

      const otherList = await db.list.create({
        data: {
          name: 'Other List',
          ownerId: otherUser.id,
          visibility: 'public',
        },
      });

      const updatedList = await listService.setSlug(otherList.id, otherUser.id, 'shared-slug');
      expect(updatedList.slug).toBe('shared-slug');

      await db.list.delete({ where: { id: otherList.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject if user is not list owner', async () => {
      const otherUser = await db.user.create({
        data: {
          email: 'other@example.com',
          canUseVanityUrls: true,
        },
      });

      await expect(
        listService.setSlug(testList.id, otherUser.id, 'slug')
      ).rejects.toThrow(ForbiddenError);

      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('listService.getByVanityUrl', () => {
    beforeEach(async () => {
      await userService.setUsername(testUser.id, 'testuser');
      testList = await db.list.create({
        data: {
          name: 'Test List',
          ownerId: testUser.id,
          visibility: 'public',
          slug: 'test-list',
        },
      });
    });

    it('should retrieve list by username and slug', async () => {
      const list = await listService.getByVanityUrl('testuser', 'test-list');
      expect(list.id).toBe(testList.id);
      expect(list.name).toBe('Test List');
    });

    it('should be case-insensitive for username', async () => {
      const list = await listService.getByVanityUrl('TestUser', 'test-list');
      expect(list.id).toBe(testList.id);
    });

    it('should be case-insensitive for slug', async () => {
      const list = await listService.getByVanityUrl('testuser', 'Test-List');
      expect(list.id).toBe(testList.id);
    });

    it('should return null for non-existent username', async () => {
      const list = await listService.getByVanityUrl('nonexistent', 'test-list');
      expect(list).toBeNull();
    });

    it('should return null for non-existent slug', async () => {
      const list = await listService.getByVanityUrl('testuser', 'nonexistent');
      expect(list).toBeNull();
    });

    it('should exclude private lists', async () => {
      await db.list.update({
        where: { id: testList.id },
        data: { visibility: 'private' },
      });

      const list = await listService.getByVanityUrl('testuser', 'test-list');
      expect(list).toBeNull();
    });

    it('should exclude hidden lists', async () => {
      await db.list.update({
        where: { id: testList.id },
        data: { hideFromProfile: true },
      });

      const list = await listService.getByVanityUrl('testuser', 'test-list');
      expect(list).toBeNull();
    });

    it('should include password-protected lists', async () => {
      await db.list.update({
        where: { id: testList.id },
        data: { visibility: 'password' },
      });

      const list = await listService.getByVanityUrl('testuser', 'test-list');
      expect(list).toBeDefined();
      expect(list?.id).toBe(testList.id);
    });
  });
});
