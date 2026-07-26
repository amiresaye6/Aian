"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ProcessingSettings } from "@/types/pipeline";
import { Database, Edit } from "lucide-react";

export function ProcessingSettingsForm({ organizationId }: { organizationId: string }) {
  const { data: settings, isLoading, mutate } = useSWR(
    organizationId ? `/api/v1/organizations/${organizationId}/settings/processing` : null,
    () => pipelineApi.getProcessingSettings(organizationId)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      setIsEditing(false);
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
            checked={localSettings.isAutoProcessingEnabled ?? true}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, isAutoProcessingEnabled: checked })}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label>Sync Interval (Hours)</Label>
          <Select
            value={localSettings.timeIntervalHours?.toString() || "6"}
            onValueChange={(val) => setLocalSettings({ ...localSettings, timeIntervalHours: parseInt(val) })}
            disabled={!isEditing || !(localSettings.isAutoProcessingEnabled ?? true)}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pending Item Threshold</Label>
          </div>
          <Input 
            type="number"
            min={1}
            max={1000}
            value={localSettings.pendingItemThreshold || ""}
            onChange={(e) => setLocalSettings({ ...localSettings, pendingItemThreshold: parseInt(e.target.value) || 0 })}
            disabled={!isEditing || !(localSettings.isAutoProcessingEnabled ?? true)}
            className="bg-white/5 border-white/10"
            placeholder="e.g. 50"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Trigger batching automatically when unbatched items exceed this amount, bypassing the interval.
          </p>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-3 pt-2">
            <Button 
              onClick={() => setShowConfirm(true)} 
              disabled={isSaving} 
              className="btn-gold btn-gold-hover w-full md:w-auto text-[#17130A] font-semibold"
            >
              Save Changes
            </Button>
            <Button 
              onClick={() => {
                setIsEditing(false);
                setLocalSettings(settings || {});
              }} 
              variant="outline" 
              className="w-full md:w-auto bg-transparent border-white/10 text-foreground hover:bg-white/5"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline"
              className="w-full md:w-auto bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Edit className="w-4 h-4 mr-2" />
              Configure Settings
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="glass-strong border-white/10 bg-background/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-display text-xl">Save Configuration</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to update the auto-sync settings? This will change how frequently your integrations are pulled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving} className="bg-transparent border-white/10 hover:bg-white/5 text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowConfirm(false);
                handleSave();
              }} 
              disabled={isSaving} 
              className="btn-gold btn-gold-hover text-[#17130A] font-semibold"
            >
              Confirm Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
