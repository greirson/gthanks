import { LoginMessageEditor } from '@/components/admin/login-message-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { settingsService } from '@/lib/services/settings-service';

export default async function SettingsPage() {
  // Fetch initial login message
  const message = await settingsService.getLoginMessage();

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>
            Configure site-wide settings and messages displayed to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-1">Login Page Message</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Display a custom message on the login page. This is useful for announcements,
                maintenance notices, or welcome messages.
              </p>
              <LoginMessageEditor initialMessage={message} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
