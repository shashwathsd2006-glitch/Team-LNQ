"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DocumentErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function DocumentErrorState({
  message = "Something went wrong while loading documents.",
  onRetry,
}: DocumentErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-soft">
          <AlertTriangle className="h-6 w-6 text-red" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">Unable to load documents</p>
        <p className="mt-1 max-w-xs text-center text-xs text-subtle">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
