import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Dashboard preference interfaces
export interface DashboardPreferences {
  id?: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'list' | 'compact';
  widgetOrder: string[];
  hiddenWidgets: string[];
  kpiSelection: string[];
  refreshInterval: number; // in seconds
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  chartPreferences: {
    defaultType: 'bar' | 'line' | 'pie' | 'area';
    colorScheme: string;
    animationsEnabled: boolean;
  };
  customSettings: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Default preferences
const DEFAULT_PREFERENCES: Omit<DashboardPreferences, 'userId'> = {
  theme: 'auto',
  layout: 'grid',
  widgetOrder: ['kpis', 'revenue_chart', 'project_chart', 'team_chart'],
  hiddenWidgets: [],
  kpiSelection: ['revenue', 'projects', 'team', 'clients'],
  refreshInterval: 300, // 5 minutes
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false
  },
  chartPreferences: {
    defaultType: 'bar',
    colorScheme: 'primary',
    animationsEnabled: true
  },
  customSettings: {}
};

// Local storage keys
const STORAGE_KEYS = {
  preferences: (userId: string) => `dashboard-preferences-${userId}`,
  layout: (userId: string) => `dashboard-layout-${userId}`,
  widgets: (userId: string) => `dashboard-widgets-${userId}`,
  chartConfigs: (userId: string) => `chart-configs-${userId}`
};

// Hook for managing dashboard preferences
export const useDashboardPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences from API
  const { data: preferences, isLoading } = useQuery<DashboardPreferences>({
    queryKey: ['/api/dashboard/preferences', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/preferences', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<DashboardPreferences>) => {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newPreferences),
      });
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/preferences'] });
    }
  });

  // Get current preferences (API + localStorage fallback)
  const currentPreferences = preferences || {
    ...DEFAULT_PREFERENCES,
    userId: user?.id || '',
    ...getLocalStoragePreferences(user?.id || '')
  };

  // Local storage helpers
  const getLocalStoragePreferences = useCallback((userId: string) => {
    if (!userId) return {};

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.preferences(userId));
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored preferences:', error);
      return {};
    }
  }, []);

  const setLocalStoragePreferences = useCallback((userId: string, prefs: Partial<DashboardPreferences>) => {
    if (!userId) return;

    try {
      const current = getLocalStoragePreferences(userId);
      const updated = { ...current, ...prefs, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.preferences(userId), JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store preferences:', error);
    }
  }, [getLocalStoragePreferences]);

  // Update preferences function
  const updatePreferences = useCallback(async (updates: Partial<DashboardPreferences>) => {
    if (!user?.id) return;

    // Update local storage immediately for instant feedback
    setLocalStoragePreferences(user.id, updates);

    // Update server
    try {
      await updatePreferencesMutation.mutateAsync(updates);
    } catch (error) {
      console.error('Failed to sync preferences to server:', error);
      // Could implement retry logic here
    }
  }, [user?.id, setLocalStoragePreferences, updatePreferencesMutation]);

  // Theme management
  const updateTheme = useCallback((theme: 'light' | 'dark' | 'auto') => {
    updatePreferences({ theme });

    // Apply theme immediately
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [updatePreferences]);

  // Layout management
  const updateLayout = useCallback((layout: 'grid' | 'list' | 'compact') => {
    updatePreferences({ layout });
  }, [updatePreferences]);

  // Widget management
  const updateWidgetOrder = useCallback((widgetOrder: string[]) => {
    updatePreferences({ widgetOrder });
  }, [updatePreferences]);

  const toggleWidget = useCallback((widgetId: string) => {
    const { hiddenWidgets = [] } = currentPreferences;
    const newHiddenWidgets = hiddenWidgets.includes(widgetId)
      ? hiddenWidgets.filter(id => id !== widgetId)
      : [...hiddenWidgets, widgetId];

    updatePreferences({ hiddenWidgets: newHiddenWidgets });
  }, [currentPreferences, updatePreferences]);

  // KPI management
  const updateKPISelection = useCallback((kpiSelection: string[]) => {
    updatePreferences({ kpiSelection });
  }, [updatePreferences]);

  // Notification management
  const updateNotificationSettings = useCallback((notifications: Partial<DashboardPreferences['notifications']>) => {
    const currentNotifications = currentPreferences.notifications || DEFAULT_PREFERENCES.notifications;
    updatePreferences({
      notifications: { ...currentNotifications, ...notifications }
    });
  }, [currentPreferences, updatePreferences]);

  // Chart preferences
  const updateChartPreferences = useCallback((chartPreferences: Partial<DashboardPreferences['chartPreferences']>) => {
    const currentChartPrefs = currentPreferences.chartPreferences || DEFAULT_PREFERENCES.chartPreferences;
    updatePreferences({
      chartPreferences: { ...currentChartPrefs, ...chartPreferences }
    });
  }, [currentPreferences, updatePreferences]);

  // Refresh interval management
  const updateRefreshInterval = useCallback((refreshInterval: number) => {
    updatePreferences({ refreshInterval });
  }, [updatePreferences]);

  // Custom settings
  const updateCustomSetting = useCallback((key: string, value: any) => {
    const currentCustom = currentPreferences.customSettings || {};
    updatePreferences({
      customSettings: { ...currentCustom, [key]: value }
    });
  }, [currentPreferences, updatePreferences]);

  // Export/Import functionality
  const exportPreferences = useCallback(() => {
    const exportData = {
      preferences: currentPreferences,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-preferences-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentPreferences]);

  const importPreferences = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (imported.preferences) {
            updatePreferences(imported.preferences);
            resolve();
          } else {
            reject(new Error('Invalid preferences file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [updatePreferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!user?.id) return;

    const defaultPrefs = {
      ...DEFAULT_PREFERENCES,
      userId: user.id
    };

    updatePreferences(defaultPrefs);

    // Clear local storage
    localStorage.removeItem(STORAGE_KEYS.preferences(user.id));
    localStorage.removeItem(STORAGE_KEYS.layout(user.id));
    localStorage.removeItem(STORAGE_KEYS.widgets(user.id));
    localStorage.removeItem(STORAGE_KEYS.chartConfigs(user.id));
  }, [user?.id, updatePreferences]);

  // Apply theme on load
  useEffect(() => {
    if (currentPreferences.theme) {
      const root = document.documentElement;
      if (currentPreferences.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', currentPreferences.theme === 'dark');
      }
    }
  }, [currentPreferences.theme]);

  return {
    preferences: currentPreferences,
    isLoading,
    updatePreferences,
    updateTheme,
    updateLayout,
    updateWidgetOrder,
    toggleWidget,
    updateKPISelection,
    updateNotificationSettings,
    updateChartPreferences,
    updateRefreshInterval,
    updateCustomSetting,
    exportPreferences,
    importPreferences,
    resetToDefaults,
    isUpdating: updatePreferencesMutation.isPending
  };
};

// Hook for widget-specific preferences
export const useWidgetPreferences = (widgetId: string) => {
  const { preferences, updateCustomSetting } = useDashboardPreferences();

  const widgetPrefs = preferences.customSettings?.[`widget_${widgetId}`] || {};

  const updateWidgetPreference = useCallback((key: string, value: any) => {
    const currentWidgetPrefs = preferences.customSettings?.[`widget_${widgetId}`] || {};
    updateCustomSetting(`widget_${widgetId}`, {
      ...currentWidgetPrefs,
      [key]: value
    });
  }, [widgetId, preferences.customSettings, updateCustomSetting]);

  return {
    widgetPreferences: widgetPrefs,
    updateWidgetPreference
  };
};

// Hook for chart-specific preferences
export const useChartPreferences = () => {
  const { preferences, updateChartPreferences } = useDashboardPreferences();

  return {
    chartPreferences: preferences.chartPreferences || DEFAULT_PREFERENCES.chartPreferences,
    updateChartPreferences
  };
};