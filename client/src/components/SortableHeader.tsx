import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SortDirection } from '@/hooks/useTableSort';

interface SortableHeaderProps {
  children: React.ReactNode;
  column: string;
  currentSort: string | null;
  direction: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({
  children,
  column,
  currentSort,
  direction,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSort === column;

  return (
    <th
      className={`text-left text-sm font-medium text-muted-foreground py-3 cursor-pointer hover:bg-muted/50 select-none transition-colors ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 ${
              isActive && direction === 'asc' ? 'text-primary' : 'text-muted-foreground/30'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 -mt-1 ${
              isActive && direction === 'desc' ? 'text-primary' : 'text-muted-foreground/30'
            }`}
          />
        </div>
      </div>
    </th>
  );
}

// Alternative version for use with shadcn Table components
export function SortableTableHead({
  children,
  column,
  currentSort,
  direction,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSort === column;

  return (
    <th
      className={`text-left font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors p-2 ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 ${
              isActive && direction === 'asc' ? 'text-primary' : 'text-muted-foreground/30'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 -mt-1 ${
              isActive && direction === 'desc' ? 'text-primary' : 'text-muted-foreground/30'
            }`}
          />
        </div>
      </div>
    </th>
  );
}