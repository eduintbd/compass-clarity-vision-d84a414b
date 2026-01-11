import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Shield, Palette } from "lucide-react";
import { EmailParsingSection } from "@/components/email/EmailParsingSection";
import { GmailConnectionCard } from "@/components/gmail/GmailConnectionCard";
import { GmailEmailFetcher } from "@/components/gmail/GmailEmailFetcher";

const Settings = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [currency, setCurrency] = useState(profile?.preferred_currency || "BDT");
  const [shariahMode, setShariahMode] = useState(profile?.shariah_mode || false);

  // Handle Gmail OAuth callback params
  useEffect(() => {
    const gmailSuccess = searchParams.get('gmail_success');
    const gmailError = searchParams.get('gmail_error');

    if (gmailSuccess === 'true') {
      toast({ title: "Success", description: "Gmail connected successfully!" });
      setSearchParams({});
    } else if (gmailError) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'OAuth callback missing required parameters',
        'invalid_state': 'Invalid OAuth state - please try again',
        'token_exchange_failed': 'Failed to exchange authorization code',
        'userinfo_failed': 'Failed to get Gmail account info',
        'storage_failed': 'Failed to save Gmail connection',
      };
      toast({ 
        title: "Gmail Connection Failed", 
        description: errorMessages[gmailError] || 'Unknown error occurred',
        variant: "destructive"
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  const handleSaveProfile = () => {
    updateProfile.mutate({
      full_name: fullName,
      preferred_currency: currency,
      shariah_mode: shariahMode,
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Profile updated successfully" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Sidebar activeItem="/settings" />
        <main className="ml-64 p-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/settings" />
      <main className="ml-64 p-8">
        <Header 
          title="Settings"
          subtitle="Manage your account preferences"
        />
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Profile Settings */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Profile</CardTitle>
                </div>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Email Transaction Parsing */}
            <EmailParsingSection />

            {/* Gmail Integration */}
            <GmailConnectionCard />
            <GmailEmailFetcher />

            {/* Shariah Mode */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Shariah Mode</CardTitle>
                </div>
                <CardDescription>Enable Shariah-compliant filtering and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Shariah-Conscious Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Filter and tag investments for Shariah compliance
                    </p>
                  </div>
                  <Switch
                    checked={shariahMode}
                    onCheckedChange={(checked) => {
                      setShariahMode(checked);
                      updateProfile.mutate({ shariah_mode: checked });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>Configure how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Budget Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Bill Reminders</p>
                    <p className="text-sm text-muted-foreground">Remind before upcoming bill due dates</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Goal Progress</p>
                    <p className="text-sm text-muted-foreground">Updates on savings goal milestones</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Use dark theme throughout the app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
    </div>
  );
};

export default Settings;
