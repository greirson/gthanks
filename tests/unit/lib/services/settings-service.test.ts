import { settingsService } from '@/lib/services/settings-service';
import { db } from '@/lib/db';
import { permissionService } from '@/lib/services/permission-service';
import { ForbiddenError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    siteSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/permission-service', () => ({
  permissionService: {
    can: jest.fn(),
  },
}));

jest.mock('@/lib/sanitize-html', () => ({
  sanitizeLoginMessage: jest.fn((html: string) => html), // Pass through by default
}));

describe('settingsService', () => {
  const mockAdminId = 'admin-user-123';
  const mockNonAdminId = 'regular-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log for tests (audit logs)
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLoginMessage', () => {
    it('returns sanitized login message when it exists', async () => {
      const mockMessage = '<p>Welcome to <strong>gthanks</strong>!</p>';
      (db.siteSettings.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        loginMessage: mockMessage,
      });

      const result = await settingsService.getLoginMessage();

      expect(result).toBe(mockMessage);
      expect(db.siteSettings.findUnique).toHaveBeenCalledWith({
        where: { id: 'global' },
        select: { loginMessage: true },
      });
    });

    it('returns null when login message is empty', async () => {
      (db.siteSettings.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        loginMessage: null,
      });

      const result = await settingsService.getLoginMessage();

      expect(result).toBeNull();
    });

    it('returns null when settings record does not exist', async () => {
      (db.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await settingsService.getLoginMessage();

      expect(result).toBeNull();
    });

    it('double-sanitizes message for defense in depth', async () => {
      const { sanitizeLoginMessage } = require('@/lib/sanitize-html');
      const mockMessage = '<p>Test message</p>';

      (db.siteSettings.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        loginMessage: mockMessage,
      });

      sanitizeLoginMessage.mockReturnValue('<p>Sanitized message</p>');

      const result = await settingsService.getLoginMessage();

      expect(sanitizeLoginMessage).toHaveBeenCalledWith(mockMessage);
      expect(result).toBe('<p>Sanitized message</p>');
    });
  });

  describe('updateLoginMessage', () => {
    it('updates login message successfully when user is admin', async () => {
      const { sanitizeLoginMessage } = require('@/lib/sanitize-html');
      const newMessage = '<p>New welcome message</p>';
      const sanitizedMessage = '<p>New welcome message</p>';

      // Reset the mock for this specific test
      sanitizeLoginMessage.mockReturnValue(sanitizedMessage);

      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      (db.siteSettings.upsert as jest.Mock).mockResolvedValue({
        id: 'global',
        loginMessage: sanitizedMessage,
      });

      await settingsService.updateLoginMessage(newMessage, mockAdminId);

      expect(permissionService.can).toHaveBeenCalledWith(
        mockAdminId,
        'admin',
        { type: 'site-settings' }
      );

      expect(db.siteSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'global' },
        update: {
          loginMessage: sanitizedMessage,
          loginMessageUpdatedAt: expect.any(Date),
          loginMessageUpdatedBy: mockAdminId,
        },
        create: {
          id: 'global',
          loginMessage: sanitizedMessage,
          loginMessageUpdatedAt: expect.any(Date),
          loginMessageUpdatedBy: mockAdminId,
        },
      });
    });

    it('sanitizes message before saving to database', async () => {
      const { sanitizeLoginMessage } = require('@/lib/sanitize-html');
      const unsafeMessage = '<script>alert("xss")</script><p>Safe content</p>';
      const safeMessage = '<p>Safe content</p>';

      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      sanitizeLoginMessage.mockReturnValue(safeMessage);

      await settingsService.updateLoginMessage(unsafeMessage, mockAdminId);

      expect(sanitizeLoginMessage).toHaveBeenCalledWith(unsafeMessage);
      expect(db.siteSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            loginMessage: safeMessage,
          }),
          create: expect.objectContaining({
            loginMessage: safeMessage,
          }),
        })
      );
    });

    it('logs audit trail when message is updated', async () => {
      const newMessage = '<p>Audit test</p>';
      const mockConsoleLog = jest.spyOn(console, 'log');

      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await settingsService.updateLoginMessage(newMessage, mockAdminId);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[AUDIT] Login message updated',
        expect.objectContaining({
          adminId: mockAdminId,
          timestamp: expect.any(String),
          messageLength: expect.any(Number),
        })
      );
    });

    it('enforces singleton pattern via upsert', async () => {
      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await settingsService.updateLoginMessage('<p>Test</p>', mockAdminId);

      expect(db.siteSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'global' },
        })
      );
    });

    it('handles null message (clearing the message)', async () => {
      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await settingsService.updateLoginMessage(null, mockAdminId);

      expect(db.siteSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            loginMessage: null,
          }),
          create: expect.objectContaining({
            loginMessage: null,
          }),
        })
      );
    });

    it('throws ForbiddenError when user is not admin', async () => {
      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'User is not an admin',
      });

      await expect(
        settingsService.updateLoginMessage('<p>Test</p>', mockNonAdminId)
      ).rejects.toThrow(ForbiddenError);

      await expect(
        settingsService.updateLoginMessage('<p>Test</p>', mockNonAdminId)
      ).rejects.toThrow('Admin access required');

      expect(db.siteSettings.upsert).not.toHaveBeenCalled();
    });

    it('uses permissionService.can for authorization (not direct admin check)', async () => {
      (permissionService.can as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await settingsService.updateLoginMessage('<p>Test</p>', mockAdminId);

      // Verify we're using the permission service, not checking isAdmin directly
      expect(permissionService.can).toHaveBeenCalledWith(
        mockAdminId,
        'admin',
        { type: 'site-settings' }
      );
    });
  });
});
