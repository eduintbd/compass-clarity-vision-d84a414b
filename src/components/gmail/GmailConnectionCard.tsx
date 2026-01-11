import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { formatDistanceToNow } from "date-fns";

export function GmailConnectionCard() {
  const {
    connection,
    isLoading,
    isConnected,
    connect,
    isConnecting,
    disconnect,
    isDisconnecting,
  } = useGmailConnection();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription className="mt-1">
              Connect your Gmail to automatically fetch portfolio statements
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{connection.email}</span>
              </div>
              {connection.last_sync_at && (
                <p className="text-sm text-muted-foreground">
                  Last synced: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Emails fetched: {connection.emails_fetched}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Disconnect Gmail
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">What you can do:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatically fetch portfolio statements from your inbox</li>
                <li>• Parse PDF attachments from your broker</li>
                <li>• Keep your portfolio data up to date</li>
              </ul>
            </div>
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Connect Gmail
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We only request read-only access to your emails. Your data is secure.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
