import type { Task, TaskDependency } from "@shared/schema";

export interface TaskNode {
  id: string;
  task: Task;
  dependencies: string[];
  dependents: string[];
  earliestStart: number;
  latestStart: number;
  earliestFinish: number;
  latestFinish: number;
  duration: number;
  slack: number;
  isCritical: boolean;
}

export interface CriticalPathResult {
  nodes: Map<string, TaskNode>;
  criticalPath: string[];
  totalDuration: number;
  criticalTasks: Task[];
}

/**
 * Calculate critical path for a set of tasks with dependencies
 * Uses the Critical Path Method (CPM) algorithm
 */
export function calculateCriticalPath(
  tasks: Task[],
  dependencies: TaskDependency[]
): CriticalPathResult {
  // Build task nodes
  const nodes = new Map<string, TaskNode>();

  // Initialize nodes
  tasks.forEach(task => {
    const duration = calculateTaskDuration(task);
    nodes.set(task.id, {
      id: task.id,
      task,
      dependencies: [],
      dependents: [],
      earliestStart: 0,
      latestStart: 0,
      earliestFinish: duration,
      latestFinish: duration,
      duration,
      slack: 0,
      isCritical: false,
    });
  });

  // Build dependency relationships
  dependencies.forEach(dep => {
    const fromNode = nodes.get(dep.dependencyId);
    const toNode = nodes.get(dep.taskId);

    if (fromNode && toNode) {
      toNode.dependencies.push(dep.dependencyId);
      fromNode.dependents.push(dep.taskId);
    }
  });

  // Forward pass - calculate earliest start and finish times
  const visited = new Set<string>();
  const calculateEarliestTimes = (nodeId: string): void => {
    if (visited.has(nodeId)) return;

    const node = nodes.get(nodeId);
    if (!node) return;

    // Calculate earliest start based on dependencies
    let maxEarliestFinish = 0;
    for (const depId of node.dependencies) {
      calculateEarliestTimes(depId);
      const depNode = nodes.get(depId);
      if (depNode) {
        maxEarliestFinish = Math.max(maxEarliestFinish, depNode.earliestFinish);
      }
    }

    node.earliestStart = maxEarliestFinish;
    node.earliestFinish = node.earliestStart + node.duration;
    visited.add(nodeId);
  };

  // Calculate earliest times for all nodes
  tasks.forEach(task => calculateEarliestTimes(task.id));

  // Find project completion time (maximum earliest finish)
  const projectDuration = Math.max(...Array.from(nodes.values()).map(node => node.earliestFinish));

  // Backward pass - calculate latest start and finish times
  const backwardVisited = new Set<string>();
  const calculateLatestTimes = (nodeId: string): void => {
    if (backwardVisited.has(nodeId)) return;

    const node = nodes.get(nodeId);
    if (!node) return;

    // If no dependents, latest finish is project duration
    if (node.dependents.length === 0) {
      node.latestFinish = projectDuration;
    } else {
      // Calculate latest finish based on dependents
      let minLatestStart = Infinity;
      for (const depId of node.dependents) {
        calculateLatestTimes(depId);
        const depNode = nodes.get(depId);
        if (depNode) {
          minLatestStart = Math.min(minLatestStart, depNode.latestStart);
        }
      }
      node.latestFinish = minLatestStart;
    }

    node.latestStart = node.latestFinish - node.duration;
    node.slack = node.latestStart - node.earliestStart;
    node.isCritical = node.slack === 0;

    backwardVisited.add(nodeId);
  };

  // Calculate latest times for all nodes
  tasks.forEach(task => calculateLatestTimes(task.id));

  // Find critical path
  const criticalPath: string[] = [];
  const criticalTasks: Task[] = [];

  // Start from critical tasks with no dependencies
  const criticalNodes = Array.from(nodes.values()).filter(node => node.isCritical);

  if (criticalNodes.length > 0) {
    // Build critical path by following critical dependencies
    const buildCriticalPath = (currentId: string, path: string[] = []): string[] => {
      if (path.includes(currentId)) return path; // Avoid cycles

      const node = nodes.get(currentId);
      if (!node || !node.isCritical) return path;

      const newPath = [...path, currentId];

      // Find the next critical dependent
      for (const dependentId of node.dependents) {
        const dependent = nodes.get(dependentId);
        if (dependent?.isCritical) {
          return buildCriticalPath(dependentId, newPath);
        }
      }

      return newPath;
    };

    // Find critical path starting from tasks with no critical predecessors
    const startNodes = criticalNodes.filter(node =>
      node.dependencies.every(depId => {
        const dep = nodes.get(depId);
        return !dep?.isCritical;
      })
    );

    if (startNodes.length > 0) {
      const longestPath = startNodes
        .map(node => buildCriticalPath(node.id))
        .reduce((longest, current) => current.length > longest.length ? current : longest, []);

      criticalPath.push(...longestPath);
    }
  }

  // Get critical tasks
  criticalNodes.forEach(node => {
    if (node.isCritical) {
      criticalTasks.push(node.task);
    }
  });

  return {
    nodes,
    criticalPath,
    totalDuration: projectDuration,
    criticalTasks,
  };
}

/**
 * Calculate task duration in days
 */
function calculateTaskDuration(task: Task): number {
  if (task.startDate && task.dueDate) {
    const start = new Date(task.startDate);
    const end = new Date(task.dueDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Default duration based on estimated hours or fallback
  if (task.estimatedHours) {
    return Math.max(1, Math.ceil(task.estimatedHours / 8)); // Assuming 8 hours per day
  }

  return 7; // Default 1 week
}

/**
 * Get tasks on critical path for a project
 */
export function getCriticalTasksForProject(
  projectId: string,
  allTasks: Task[],
  allDependencies: TaskDependency[]
): CriticalPathResult {
  const projectTasks = allTasks.filter(task => task.projectId === projectId);
  const projectDependencies = allDependencies.filter(dep =>
    projectTasks.some(task => task.id === dep.taskId) &&
    projectTasks.some(task => task.id === dep.dependencyId)
  );

  return calculateCriticalPath(projectTasks, projectDependencies);
}

/**
 * Check if a task is on the critical path
 */
export function isTaskOnCriticalPath(
  taskId: string,
  criticalPathResult: CriticalPathResult
): boolean {
  const node = criticalPathResult.nodes.get(taskId);
  return node?.isCritical ?? false;
}

/**
 * Get bottleneck tasks (critical tasks with high dependency count)
 */
export function getBottleneckTasks(criticalPathResult: CriticalPathResult): TaskNode[] {
  return Array.from(criticalPathResult.nodes.values())
    .filter(node => node.isCritical)
    .sort((a, b) => (b.dependents.length + b.dependencies.length) - (a.dependents.length + a.dependencies.length))
    .slice(0, 5); // Top 5 bottlenecks
}