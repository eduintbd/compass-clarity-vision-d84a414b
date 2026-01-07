import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, CheckCircle, Trash2 } from "lucide-react";
import { useAlerts, useMarkAlertAsRead, useDeleteAlert } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/formatters";

const alertTypeIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  error: <AlertTriangle className="h-5 w-5 text-red-500" />,
};

const Alerts = () => {
  const { data: alerts, isLoading } = useAlerts();
  const markAsRead = useMarkAlertAsRead();
  const deleteAlert = useDeleteAlert();

  const unreadAlerts = alerts?.filter(a => !a.is_read) ?? [];
  const readAlerts = alerts?.filter(a => a.is_read) ?? [];

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteAlert.mutate(id);
  };

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/alerts" />
      <main className="ml-64 p-8">
        <Header 
          title="Alerts"
          subtitle="Stay informed about your finances"
        />
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Unread Alerts</p>
                  <p className="text-2xl font-bold text-amber-500">{unreadAlerts.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                  <p className="text-2xl font-bold text-foreground">{alerts?.length ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Unread Alerts */}
            {unreadAlerts.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Unread Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {unreadAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start justify-between p-4 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5">
                            {alertTypeIcons[alert.type] || <Bell className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{alert.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{formatDate(alert.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(alert.id)}
                          >
                            Mark as read
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Alerts */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>All Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : alerts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No alerts yet. You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts?.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start justify-between p-4 rounded-lg transition-colors ${
                          alert.is_read ? 'bg-muted/30' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5">
                            {alertTypeIcons[alert.type] || <Bell className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${alert.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {alert.title}
                              </p>
                              {!alert.is_read && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{formatDate(alert.created_at)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
    </div>
  );
};

export default Alerts;
