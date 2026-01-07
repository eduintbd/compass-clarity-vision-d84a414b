import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Copy, Check, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmailForwarding, useCreateEmailForwarding } from '@/hooks/useEmailForwarding';
import { toast } from 'sonner';

export const EmailParsingCard = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { data: emailForwarding, isLoading } = useEmailForwarding();
  const createForwarding = useCreateEmailForwarding();

  const forwardingEmail = emailForwarding?.forwarding_key 
    ? `${emailForwarding.forwarding_key}@eduintbd.cloud`
    : null;

  const handleCopy = async () => {
    if (forwardingEmail) {
      await navigator.clipboard.writeText(forwardingEmail);
      setCopied(true);
      toast.success('Email address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEnable = () => {
    createForwarding.mutate();
  };

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Parsing
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : emailForwarding?.is_active && forwardingEmail ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-400 border-green-400/50 bg-green-400/10">
                Active
              </Badge>
              <span className="text-xs text-muted-foreground">
                {emailForwarding.emails_processed || 0} emails processed
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Forward bank emails to:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background/50 px-3 py-2 rounded border border-border/50 truncate">
                  {forwardingEmail}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8 shrink-0"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Auto-import transactions by forwarding bank emails
            </p>
            <Button onClick={handleEnable} size="sm" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Enable Email Parsing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
