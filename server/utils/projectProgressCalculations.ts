import { db } from "../db";
import { projects, tasks } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { Project, Task, InsertProject } from "@shared/schema";

export interface ProjectProgressResult {
  progress: number;
  suggestedStatus: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasksCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextActions: string[];
}

/**
 * Calculate project progress based on task completion and status
 */
export async function calculateProjectProgress(projectId: string): Promise<ProjectProgressResult> {
  // Get all tasks for this project
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  if (projectTasks.length === 0) {
    return {
      progress: 0,
      suggestedStatus: 'planning',
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      overdueTasksCount: 0,
      riskLevel: 'low',
      nextActions: ['Add tasks to this project to track progress']
    };
  }

  // Task status counting
  const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
  const blockedTasks = projectTasks.filter(task => task.status === 'blocked').length;

  // Calculate overdue tasks
  const now = new Date();
  const overdueTasksCount = projectTasks.filter(task =>
    task.dueDate &&
    new Date(task.dueDate) < now &&
    task.status !== 'completed'
  ).length;

  // Calculate progress percentage
  const totalTasks = projectTasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  // Determine suggested status based on task completion and activity
  let suggestedStatus = 'planning';
  if (progress === 100) {
    suggestedStatus = 'completed';
  } else if (progress >= 80) {
    suggestedStatus = 'review';
  } else if (inProgressTasks > 0 || progress > 0) {
    suggestedStatus = 'active';
  } else if (blockedTasks > totalTasks * 0.3) {
    suggestedStatus = 'paused';
  }

  // Calculate risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (overdueTasksCount > totalTasks * 0.3 || blockedTasks > totalTasks * 0.2) {
    riskLevel = 'high';
  } else if (overdueTasksCount > 0 || blockedTasks > 0) {
    riskLevel = 'medium';
  }

  // Generate next actions
  const nextActions: string[] = [];
  if (blockedTasks > 0) {
    nextActions.push(`Resolve ${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''}`);
  }
  if (overdueTasksCount > 0) {
    nextActions.push(`Address ${overdueTasksCount} overdue task${overdueTasksCount > 1 ? 's' : ''}`);
  }
  if (inProgressTasks === 0 && progress < 100) {
    nextActions.push('Start working on pending tasks');
  }
  if (progress >= 80 && progress < 100) {
    nextActions.push('Review completed work and finalize remaining tasks');
  }

  return {
    progress,
    suggestedStatus,
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    overdueTasksCount,
    riskLevel,
    nextActions
  };
}

/**
 * Update project progress and status automatically
 */
export async function updateProjectProgress(projectId: string): Promise<Project> {
  const progressResult = await calculateProjectProgress(projectId);

  // Get current project
  const [currentProject] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!currentProject) {
    throw new Error('Project not found');
  }

  // Update project with calculated progress
  const updateData: Partial<InsertProject> = {
    progress: progressResult.progress,
    updatedAt: new Date()
  };

  // Only update status if it's significantly different and makes sense
  const currentStatus = currentProject.status;
  const suggestedStatus = progressResult.suggestedStatus;

  // Smart status update logic
  const shouldUpdateStatus = (
    // Always allow completion
    (suggestedStatus === 'completed' && currentStatus !== 'completed') ||
    // Move to active if tasks are in progress and project is still in planning
    (suggestedStatus === 'active' && currentStatus === 'planning') ||
    // Move to review when nearing completion
    (suggestedStatus === 'review' && currentStatus === 'active' && progressResult.progress >= 80) ||
    // Pause if too many blocked tasks
    (suggestedStatus === 'paused' && progressResult.blockedTasks > progressResult.totalTasks * 0.3)
  );

  if (shouldUpdateStatus) {
    updateData.status = suggestedStatus;
  }

  // Update completion date if project is completed
  if (suggestedStatus === 'completed' && !currentProject.completedAt) {
    updateData.completedAt = new Date();
  }

  // Update the project
  const [updatedProject] = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, projectId))
    .returning();

  return updatedProject;
}

/**
 * Get project health metrics for multiple projects
 */
export async function getProjectsHealthMetrics(projectIds: string[]): Promise<Map<string, ProjectProgressResult>> {
  const results = new Map<string, ProjectProgressResult>();

  for (const projectId of projectIds) {
    try {
      const metrics = await calculateProjectProgress(projectId);
      results.set(projectId, metrics);
    } catch (error) {
      console.error(`Error calculating progress for project ${projectId}:`, error);
    }
  }

  return results;
}

/**
 * Calculate project completion date estimate based on current velocity
 */
export async function estimateProjectCompletion(projectId: string): Promise<{
  estimatedCompletionDate: Date | null;
  daysRemaining: number | null;
  velocity: number; // tasks completed per day
  confidenceLevel: 'low' | 'medium' | 'high';
}> {
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  if (projectTasks.length === 0) {
    return {
      estimatedCompletionDate: null,
      daysRemaining: null,
      velocity: 0,
      confidenceLevel: 'low'
    };
  }

  // Calculate task completion velocity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentlyCompletedTasks = projectTasks.filter(task =>
    task.completedAt &&
    new Date(task.completedAt) >= thirtyDaysAgo
  ).length;

  const velocity = recentlyCompletedTasks / 30; // tasks per day

  const remainingTasks = projectTasks.filter(task => task.status !== 'completed').length;

  let estimatedCompletionDate: Date | null = null;
  let daysRemaining: number | null = null;
  let confidenceLevel: 'low' | 'medium' | 'high' = 'low';

  if (velocity > 0 && remainingTasks > 0) {
    daysRemaining = Math.ceil(remainingTasks / velocity);
    estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + daysRemaining);

    // Determine confidence based on velocity consistency and data availability
    if (recentlyCompletedTasks >= 5 && velocity >= 0.2) {
      confidenceLevel = 'high';
    } else if (recentlyCompletedTasks >= 2) {
      confidenceLevel = 'medium';
    }
  }

  return {
    estimatedCompletionDate,
    daysRemaining,
    velocity,
    confidenceLevel
  };
}