"use client";

import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DocStatus = "Indexed" | "Processing" | "Ready" | "Needs Review" | "Failed";

const statusConfig: Record<DocStatus, { variant: BadgeProps["variant"]; pulse?: boolean }> = {
  Indexed: { variant: "success" },
  Processing: { variant: "accent", pulse: true },
  Ready: { variant: "success" },
  "Needs Review": { variant: "warning" },
  Failed: { variant: "danger" },
};

export function DocumentStatusBadge({ status }: { status: DocStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn(config.pulse && "shimmer")}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Indexed" && "bg-green",
          status === "Processing" && "bg-accent",
          status === "Ready" && "bg-green",
          status === "Needs Review" && "bg-amber",
          status === "Failed" && "bg-red"
        )}
      />
      {status}
    </Badge>
  );
}
