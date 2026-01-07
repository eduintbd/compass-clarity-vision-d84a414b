import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Receipt, Calendar, AlertCircle } from "lucide-react";
import { useBills, useUpdateBill, useDeleteBill } from "@/hooks/useBills";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBill } from "@/hooks/useBills";
import { useToast } from "@/hooks/use-toast";

const Bills = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: bills, isLoading } = useBills();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const createBill = useCreateBill();
  const { toast } = useToast();

  const [newBill, setNewBill] = useState({
    name: "",
    amount: "",
    category: "",
    frequency: "monthly" as "weekly" | "monthly" | "quarterly" | "yearly",
    due_date: "",
    auto_pay: false,
  });

  const activeBills = bills?.filter(b => b.is_active) ?? [];
  const totalMonthly = activeBills
    .filter(b => b.frequency === 'monthly')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const handleAddBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.category) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createBill.mutate({
      name: newBill.name,
      amount: parseFloat(newBill.amount),
      category: newBill.category,
      frequency: newBill.frequency,
      due_date: newBill.due_date ? parseInt(newBill.due_date) : null,
      auto_pay: newBill.auto_pay,
      account_id: null,
      is_active: true,
      next_due_date: null,
    }, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setNewBill({ name: "", amount: "", category: "", frequency: "monthly", due_date: "", auto_pay: false });
        toast({ title: "Success", description: "Bill added successfully" });
      }
    });
  };

  const toggleAutoPay = (id: string, currentValue: boolean) => {
    updateBill.mutate({ id, auto_pay: !currentValue });
  };

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/bills" />
      <main className="ml-64 p-8">
        <Header 
          title="Bills & EMIs"
          subtitle="Manage your recurring payments"
        />
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-end">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Bill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Bill</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newBill.name}
                        onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                        placeholder="e.g., Electricity Bill"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={newBill.amount}
                        onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newBill.category} onValueChange={(v) => setNewBill({ ...newBill, category: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Rent">Rent</SelectItem>
                          <SelectItem value="Insurance">Insurance</SelectItem>
                          <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                          <SelectItem value="Loans">Loans</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={newBill.frequency} onValueChange={(v: "weekly" | "monthly" | "quarterly" | "yearly") => setNewBill({ ...newBill, frequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date (Day of month)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={newBill.due_date}
                        onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                        placeholder="15"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Auto-pay enabled</Label>
                      <Switch
                        checked={newBill.auto_pay}
                        onCheckedChange={(v) => setNewBill({ ...newBill, auto_pay: v })}
                      />
                    </div>
                    <Button onClick={handleAddBill} className="w-full" disabled={createBill.isPending}>
                      {createBill.isPending ? "Adding..." : "Add Bill"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Active Bills</p>
                  <p className="text-2xl font-bold text-foreground">{activeBills.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Monthly Total</p>
                  <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalMonthly)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Auto-pay Enabled</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {activeBills.filter(b => b.auto_pay).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bills List */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>All Bills</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : bills?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bills yet. Add your first bill to start tracking.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bills?.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{bill.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">{bill.category}</Badge>
                              <span>•</span>
                              <span className="capitalize">{bill.frequency}</span>
                              {bill.due_date && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Day {bill.due_date}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                              {formatCurrency(Number(bill.amount))}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Auto-pay</span>
                              <Switch
                                checked={bill.auto_pay || false}
                                onCheckedChange={() => toggleAutoPay(bill.id, bill.auto_pay || false)}
                              />
                            </div>
                          </div>
                        </div>
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

export default Bills;
