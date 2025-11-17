export interface AuthProvider {
  enabled: boolean;
  configured: boolean;
  name?: string;
  requiredVars?: string[];
  configuredVars?: string[];
  // Apple-specific fields
  method?: 'manual' | 'automatic' | 'none';
  error?: string;
}

export interface AuthStatusResponse {
  providers: {
    email: AuthProvider;
    google: AuthProvider;
    facebook: AuthProvider;
    apple: AuthProvider;
    oauth: AuthProvider;
  };
}
