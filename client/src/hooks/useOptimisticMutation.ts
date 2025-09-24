import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface OptimisticUpdate<T> {
  queryKey: (string | any)[];
  updater: (old: T[] | undefined, newItem: T, operation: 'create' | 'update' | 'delete') => T[] | undefined;
}

export interface OptimisticMutationOptions<TData, TError, TVariables> extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onMutate' | 'onError' | 'onSettled'> {
  optimisticUpdates?: OptimisticUpdate<any>[];
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context?: unknown) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context?: unknown) => void;
}

/**
 * Enhanced mutation hook that provides optimistic updates with automatic rollback on error
 */
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = void>(
  options: OptimisticMutationOptions<TData, TError, TVariables>
) {
  const { toast } = useToast();

  return useMutation<TData, TError, TVariables, any>({
    ...options,
    onMutate: async (variables) => {
      const snapshots: any[] = [];

      // Apply optimistic updates
      if (options.optimisticUpdates) {
        for (const update of options.optimisticUpdates) {
          // Cancel outgoing refetches
          await queryClient.cancelQueries({ queryKey: update.queryKey });

          // Snapshot the previous value
          const previousData = queryClient.getQueryData(update.queryKey);
          snapshots.push({ queryKey: update.queryKey, data: previousData });

          // Optimistically update the cache
          queryClient.setQueryData(update.queryKey, (old: any) => {
            return update.updater(old, variables as any, 'create'); // Default to create, can be overridden
          });
        }
      }

      // Return a context object with the snapshots
      return { snapshots };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.snapshots) {
        for (const snapshot of context.snapshots) {
          queryClient.setQueryData(snapshot.queryKey, snapshot.data);
        }
      }

      // Show error toast
      if (options.errorMessage) {
        toast({
          title: "Error",
          description: options.errorMessage,
          variant: "destructive",
        });
      }

      // Call custom error handler if provided
      options.onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Show success toast
      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }

      // Call custom success handler if provided
      options.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate and refetch affected queries to ensure consistency
      if (options.optimisticUpdates && !error) {
        for (const update of options.optimisticUpdates) {
          queryClient.invalidateQueries({ queryKey: update.queryKey });
        }
      }

      // Call custom settled handler if provided
      options.onSettled?.(data, error, variables, context);
    },
  });
}

// Helper functions for common optimistic update patterns

export const optimisticCreators = {
  /**
   * Creates an optimistic update function for adding an item to a list
   */
  addToList: <T extends { id?: string }>(getId?: (item: T) => string) => ({
    updater: (old: T[] | undefined, newItem: T): T[] | undefined => {
      if (!old) return [newItem];

      // Generate temporary ID if needed
      const item = getId
        ? newItem
        : { ...newItem, id: newItem.id || `temp-${Date.now()}` };

      return [item, ...old];
    }
  }),

  /**
   * Creates an optimistic update function for updating an item in a list
   */
  updateInList: <T extends { id: string }>(itemId: string) => ({
    updater: (old: T[] | undefined, updatedFields: Partial<T>): T[] | undefined => {
      if (!old) return old;

      return old.map(item =>
        item.id === itemId
          ? { ...item, ...updatedFields }
          : item
      );
    }
  }),

  /**
   * Creates an optimistic update function for removing an item from a list
   */
  removeFromList: <T extends { id: string }>(itemId: string) => ({
    updater: (old: T[] | undefined): T[] | undefined => {
      if (!old) return old;
      return old.filter(item => item.id !== itemId);
    }
  })
};