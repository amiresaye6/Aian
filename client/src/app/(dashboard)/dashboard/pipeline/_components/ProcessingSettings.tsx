"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ProcessingSettings } from "@/types/pipeline";
import { Database } from "lucide-react";

export function ProcessingSettingsForm({ organizationId }: { organizationId: string }) {
  const { data: settings, isLoading, mutate } = useSWR(
    organizationId ? `/api/v1/organizations/${organizationId}/settings/processing` : null,
    () => pipelineApi.getProcessingSettings(organizationId)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<ProcessingSettings>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full animate-pulse-soft rounded-2xl" />;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await pipelineApi.updateProcessingSettings(organizationId, localSettings);
      await mutate();
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="glass relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <CardHeader>
        <div className="flex items-center gap-2 text-[color:var(--gold)] mb-1">
          <Database className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Configuration</span>
        </div>
        <CardTitle>Auto-Sync Settings</CardTitle>
        <CardDescription>
          Configure how frequently AIAN should automatically pull and process your organization's data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Auto-Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically trigger the ingestion pipeline.
            </p>
          </div>
          <Switch
            checked={localSettings.autoSyncEnabled ?? true}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoSyncEnabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Sync Interval (Hours)</Label>
          <Select
            value={localSettings.syncIntervalHours?.toString() || "6"}
            onValueChange={(val) => setLocalSettings({ ...localSettings, syncIntervalHours: parseInt(val) })}
            disabled={!localSettings.autoSyncEnabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Every 1 hour</SelectItem>
              <SelectItem value="6">Every 6 hours</SelectItem>
              <SelectItem value="12">Every 12 hours</SelectItem>
              <SelectItem value="24">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="btn-gold btn-gold-hover w-full md:w-auto"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
}
