"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Activity, FileText } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import SubscriptionTab from "./_components/SubscriptionTab";
import AiUsageTab from "./_components/AiUsageTab";
import TransactionsTab from "./_components/TransactionsTab";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { toast } from "sonner";

function PaymentNotification() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful! Your subscription has been updated.");
      router.replace("/dashboard/billing");
    } else if (paymentStatus === "failed") {
      toast.error("Payment failed. Your subscription was not changed.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  return null;
}

export default function BillingPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <PaymentNotification />
      </Suspense>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Billing & Usage
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Manage your subscription, view plan limits, and monitor your detailed AI usage across all models and features.
            </p>
          </div>
        </div>

        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 flex-wrap h-auto">
            <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground rounded-sm transition-all">
              <CreditCard className="h-4 w-4 text-gold-soft" />
              Subscription Details
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground rounded-sm transition-all">
              <Activity className="h-4 w-4 text-gold-soft" />
              AI Usage
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground rounded-sm transition-all">
              <FileText className="h-4 w-4 text-gold-soft" />
              Transactions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="subscription" className="space-y-4 outline-none">
            <SubscriptionTab />
          </TabsContent>
          <TabsContent value="usage" className="space-y-4 outline-none">
            <AiUsageTab />
          </TabsContent>
          <TabsContent value="transactions" className="space-y-4 outline-none">
            <TransactionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
