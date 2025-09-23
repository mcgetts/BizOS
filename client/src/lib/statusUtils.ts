// Status configuration with colors for badges
const statusConfig = [
  { key: "todo", label: "To Do", color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100" },
  { key: "blocked", label: "Blocked", color: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100" },
  { key: "review", label: "Review", color: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100" },
  { key: "completed", label: "Completed", color: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100" },
];

// Helper functions for status and priority styling
export const getStatusBadge = (status: string) => {
  const statusItem = statusConfig.find(s => s.key === status);
  if (statusItem) {
    return statusItem.color;
  }
  // Fallback for any status not in statusConfig
  const styles = {
    blocked: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100",
  };
  return styles[status as keyof typeof styles] || statusConfig[0].color; // Default to todo color
};

export const getPriorityBadge = (priority: string) => {
  const styles = {
    low: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    medium: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    high: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
    urgent: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
  };
  return styles[priority as keyof typeof styles] || styles.medium;
};

export { statusConfig };