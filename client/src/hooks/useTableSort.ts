import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface SortConfig {
  key: string;
  type: 'string' | 'number' | 'date' | 'custom';
  customOrder?: Record<string, number>;
  accessor?: (item: any) => any;
}

export function useTableSort<T>(data: T[], sortConfigs: SortConfig[]) {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const handleSort = (column: string) => {
    if (sortState.column === column) {
      // Toggle through: asc -> desc -> null
      if (sortState.direction === 'asc') {
        setSortState({ column, direction: 'desc' });
      } else if (sortState.direction === 'desc') {
        setSortState({ column: null, direction: null });
      } else {
        setSortState({ column, direction: 'asc' });
      }
    } else {
      setSortState({ column, direction: 'asc' });
    }
  };

  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return data;
    }

    const config = sortConfigs.find(c => c.key === sortState.column);
    if (!config) {
      return data;
    }

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Use custom accessor if provided, otherwise use the key directly
      if (config.accessor) {
        aValue = config.accessor(a);
        bValue = config.accessor(b);
      } else {
        aValue = (a as any)[config.key];
        bValue = (b as any)[config.key];
      }

      // Handle different data types
      switch (config.type) {
        case 'string':
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
          break;
        case 'number':
          aValue = parseFloat(aValue || '0');
          bValue = parseFloat(bValue || '0');
          break;
        case 'date':
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
          break;
        case 'custom':
          if (config.customOrder) {
            aValue = config.customOrder[aValue] ?? 999;
            bValue = config.customOrder[bValue] ?? 999;
          }
          break;
      }

      // Compare values
      if (aValue < bValue) {
        return sortState.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortState, sortConfigs]);

  return {
    sortedData,
    sortState,
    handleSort,
  };
}