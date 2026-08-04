"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title: string;
  description: string;
  confirmLabel: string;
}

export function ConfirmActionDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
  confirmLabel,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-white/10 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}