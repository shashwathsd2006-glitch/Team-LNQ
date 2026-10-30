"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = ["All", "Indexed", "Processing", "Ready", "Needs Review", "Failed"] as const;

interface DocumentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function DocumentFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: DocumentFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or category…"
          className="h-9 pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
