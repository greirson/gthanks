# Email Service Interfaces

This directory contains the TypeScript interfaces that define the contracts for the email system services.

## Core Interfaces

### IEmailTemplateService

Manages CRUD operations and template lifecycle:

- Creating, updating, and deleting templates
- Finding templates by various filters
- Managing default templates per type
- Validating template content and variables

### ITemplateRenderer

Handles template rendering and variable substitution:

- Rendering templates with context data
- Validating required variables
- HTML sanitization and plain text generation
- Preview functionality with sample data

### IEmailService

Orchestrates email sending operations:

- Sending emails using templates
- Sending custom emails
- Retry logic for failed emails
- Bulk email operations
- Provider status and health checks

### IEmailLogService

Tracks email delivery and status:

- Creating log entries for all emails
- Updating delivery status
- Finding logs by various criteria
- Retry queue management
- Analytics and reporting

## Usage Example

```typescript
// Dependency injection setup
const templateService = container.get<IEmailTemplateService>('EmailTemplateService');
const renderer = container.get<ITemplateRenderer>('TemplateRenderer');
const emailService = container.get<IEmailService>('EmailService');

// Send a group invitation email
const result = await emailService.sendTemplateEmail({
  to: 'invitee@example.com',
  templateType: EmailTemplateType.GROUP_INVITATION,
  context: {
    groupName: 'Family Group',
    inviterName: 'John Doe',
    acceptLink: 'https://app.example.com/accept/123',
    declineLink: 'https://app.example.com/decline/123',
  },
  metadata: {
    invitationId: '123',
    groupId: '456',
  },
});
```

## Interface Segregation

The interfaces follow the Interface Segregation Principle:

- Each interface has a single, well-defined responsibility
- Clients depend only on the methods they use
- Easy to mock for testing
- Allows for different implementations (SMTP, SendGrid, etc.)

## Future Extensions

These interfaces are designed to support future enhancements:

- Multi-language template support (i18n)
- A/B testing with multiple template versions
- Advanced analytics and tracking
- Webhook integration for delivery events
- Template marketplace/sharing
