// src/config/email.config.ts

export interface EmailConfig {
  enabled: boolean;
  devMode: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  devRecipient?: string;
  maxRetries: number;
  retryDelay: number;

  // Development mode settings
  development: {
    // Capture all sent emails in memory
    capture: boolean;

    // Use local SMTP server (like MailDev)
    useLocalSmtp: boolean;
    localSmtpPort: number;

    // Enable preview endpoints
    enablePreview: boolean;

    // Enable dashboard
    enableDashboard: boolean;

    // Log email details to console
    logEmails: boolean;

    // Override recipient for all emails (useful for testing)
    overrideRecipient?: string;

    // Add prefix to subject in dev mode
    subjectPrefix: string;

    // Delay email sending (ms) to simulate production delays
    sendDelay: number;

    // Fail percentage for testing error handling
    failPercentage: number;
  };

  // Rate limiting
  rateLimit: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
}

export function getEmailConfig(): EmailConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const enabled = process.env.EMAIL_ENABLED !== 'false'; // Enabled by default
  const devMode = process.env.EMAIL_DEV_MODE === 'true' || !isProduction;

  if (!enabled) {
    console.log('[Email] Email service is disabled via EMAIL_ENABLED=false');
  }

  // In development, default to local MailDev settings
  const defaultHost = devMode ? 'localhost' : 'smtp.gmail.com';
  const defaultPort = devMode ? 1025 : 587;
  const defaultSecure = devMode ? false : process.env.SMTP_SECURE === 'true';

  return {
    enabled,
    devMode,
    smtp: {
      host: process.env.SMTP_HOST || defaultHost,
      port: parseInt(process.env.SMTP_PORT || String(defaultPort), 10),
      secure: defaultSecure,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'gThanks',
      email:
        process.env.EMAIL_FROM_ADDRESS || (devMode ? 'dev@gthanks.com' : 'noreply@gthanks.com'),
    },
    replyTo: process.env.EMAIL_REPLY_TO,
    devRecipient: process.env.EMAIL_DEV_RECIPIENT || 'dev@localhost',
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10),

    // Development mode settings
    development: {
      // Capture all sent emails in memory
      capture: process.env.EMAIL_CAPTURE !== 'false',

      // Use local SMTP server (like MailDev)
      useLocalSmtp: process.env.USE_LOCAL_SMTP !== 'false' && devMode,
      localSmtpPort: parseInt(process.env.LOCAL_SMTP_PORT || '1025', 10),

      // Enable preview endpoints
      enablePreview: process.env.EMAIL_PREVIEW !== 'false' && devMode,

      // Enable dashboard
      enableDashboard: process.env.EMAIL_DASHBOARD !== 'false' && devMode,

      // Log email details to console
      logEmails: process.env.LOG_EMAILS === 'true' || devMode,

      // Override recipient for all emails (useful for testing)
      overrideRecipient: process.env.EMAIL_OVERRIDE_RECIPIENT,

      // Add prefix to subject in dev mode
      subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || (devMode ? '[DEV] ' : ''),

      // Delay email sending (ms) to simulate production delays
      sendDelay: parseInt(process.env.EMAIL_SEND_DELAY || '0', 10),

      // Fail percentage for testing error handling
      failPercentage: parseInt(process.env.EMAIL_FAIL_PERCENTAGE || '0', 10),
    },

    // Rate limiting
    rateLimit: {
      maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_MINUTE || '10', 10),
      maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '100', 10),
      maxPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_DAY || '1000', 10),
    },
  };
}

// Validate email configuration
export function validateEmailConfig(config: EmailConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors; // Skip validation if disabled
  }

  // In production, require full SMTP configuration
  if (!config.devMode) {
    if (!config.smtp.host) {
      errors.push('SMTP_HOST is required in production');
    }
    if (!config.smtp.auth.user) {
      errors.push('SMTP_USER is required in production');
    }
    if (!config.smtp.auth.pass) {
      errors.push('SMTP_PASS is required in production');
    }
    if (!config.from.email) {
      errors.push('EMAIL_FROM_ADDRESS is required in production');
    }
  }

  // Validate development settings
  if (config.devMode) {
    if (config.development.failPercentage < 0 || config.development.failPercentage > 100) {
      errors.push('EMAIL_FAIL_PERCENTAGE must be between 0 and 100');
    }
    if (config.development.sendDelay < 0) {
      errors.push('EMAIL_SEND_DELAY must be non-negative');
    }
  }

  // Validate rate limits
  if (config.rateLimit.maxPerMinute <= 0) {
    errors.push('EMAIL_RATE_LIMIT_MINUTE must be positive');
  }
  if (config.rateLimit.maxPerHour <= 0) {
    errors.push('EMAIL_RATE_LIMIT_HOUR must be positive');
  }
  if (config.rateLimit.maxPerDay <= 0) {
    errors.push('EMAIL_RATE_LIMIT_DAY must be positive');
  }

  return errors;
}

// Get development-specific configuration
export function getDevEmailConfig() {
  const config = getEmailConfig();

  if (!config.devMode) {
    throw new Error('Development email config requested but not in development mode');
  }

  return config.development;
}

// Check if email capture is enabled
export function isEmailCaptureEnabled(): boolean {
  const config = getEmailConfig();
  return config.devMode && config.development.capture;
}

// Check if email dashboard is enabled
export function isEmailDashboardEnabled(): boolean {
  const config = getEmailConfig();
  return config.devMode && config.development.enableDashboard;
}

// Check if email preview is enabled
export function isEmailPreviewEnabled(): boolean {
  const config = getEmailConfig();
  return config.devMode && config.development.enablePreview;
}
