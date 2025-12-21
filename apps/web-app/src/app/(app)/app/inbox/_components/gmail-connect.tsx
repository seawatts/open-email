'use client';

import { api } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import { Mail, Shield, Sparkles } from 'lucide-react';

export function GmailConnect() {
  const { data: authData } = api.email.gmail.connect.useQuery();

  const handleConnect = () => {
    if (authData?.authUrl) {
      window.location.href = authData.authUrl;
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Gmail</CardTitle>
          <CardDescription>
            Connect your Gmail account to start using the AI email agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">AI-Powered Triage</p>
                <p className="text-sm text-muted-foreground">
                  Automatically categorize and prioritize your emails
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Secure & Private</p>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and never shared
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleConnect} size="lg">
            <Mail className="mr-2 h-5 w-5" />
            Connect Gmail Account
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We only request permissions necessary to read, organize, and send
            emails on your behalf.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}





