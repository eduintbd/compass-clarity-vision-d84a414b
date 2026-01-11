import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, FileText, Download, RefreshCw } from "lucide-react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { format } from "date-fns";

interface GmailEmailFetcherProps {
  onEmailsFound?: (emails: any[]) => void;
  onParseComplete?: (results: any[]) => void;
}

export function GmailEmailFetcher({ onEmailsFound, onParseComplete }: GmailEmailFetcherProps) {
  const [daysBack, setDaysBack] = useState("30");
  const { isConnected, fetchEmails, isFetchingEmails, fetchedEmails } = useGmailConnection();

  if (!isConnected) {
    return null;
  }

  const handleFetch = (parseEmails: boolean) => {
    fetchEmails(
      { daysBack: parseInt(daysBack), parseEmails },
      {
        onSuccess: (data) => {
          if (onEmailsFound) onEmailsFound(data.emails);
          if (parseEmails && onParseComplete && data.parsed) {
            onParseComplete(data.parsed);
          }
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Fetch Portfolio Emails
        </CardTitle>
        <CardDescription>
          Search your Gmail for portfolio statements from brokers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Time Range</label>
            <Select value={daysBack} onValueChange={setDaysBack}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-5">
            <Button
              onClick={() => handleFetch(false)}
              disabled={isFetchingEmails}
              variant="outline"
            >
              {isFetchingEmails ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
            <Button
              onClick={() => handleFetch(true)}
              disabled={isFetchingEmails}
            >
              {isFetchingEmails ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Search & Parse
            </Button>
          </div>
        </div>

        {fetchedEmails && fetchedEmails.emails.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Found {fetchedEmails.count} emails with PDF attachments
            </h4>
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-4 space-y-3">
                {fetchedEmails.emails.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {email.from}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {email.attachments.length} PDF{email.attachments.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(email.date), 'PPp')}</span>
                      <div className="flex gap-1 flex-wrap">
                        {email.attachments.map((att, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {att.filename}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {fetchedEmails && fetchedEmails.emails.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No portfolio emails found in the selected time range</p>
            <p className="text-sm">Try expanding the time range or check your broker's email domain</p>
          </div>
        )}

        {fetchedEmails && fetchedEmails.parsed && fetchedEmails.parsed.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
              ✓ Parsed {fetchedEmails.parsedCount} portfolio statements
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Go to Portfolio Upload to review and save the parsed data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
