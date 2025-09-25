import { db } from '../db.js';
import {
  users,
  userCapacity,
  userAvailability,
  resourceAllocations,
  tasks,
  projects,
  timeEntries,
  workloadSnapshots,
} from "@shared/schema";
import { eq, and, between, sum, desc, asc, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface WorkloadCalculation {
  userId: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  actualWorkedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  overallocationHours: number;
  isOverallocated: boolean;
  activeProjectsCount: number;
  activeTasksCount: number;
  conflictingAllocations: ResourceAllocationConflict[];
}

export interface ResourceAllocationConflict {
  userId: string;
  conflictDate: Date;
  totalAllocatedHours: number;
  availableHours: number;
  overallocationHours: number;
  conflictingProjects: string[];
}

export interface TeamUtilization {
  totalTeamMembers: number;
  averageUtilization: number;
  overallocatedMembers: number;
  underutilizedMembers: number;
  optimalUtilizationMembers: number;
  totalCapacityHours: number;
  totalAllocatedHours: number;
}

export interface ProjectResourceNeed {
  projectId: string;
  projectName: string;
  requiredSkills: string[];
  estimatedHours: number;
  priority: string;
  startDate: Date;
  endDate: Date;
  currentAllocation: number;
  shortfallHours: number;
}

/**
 * Calculate workload for a specific user within a date range
 */
export async function calculateUserWorkload(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WorkloadCalculation> {
  // Get user capacity
  const capacity = await db
    .select()
    .from(userCapacity)
    .where(
      and(
        eq(userCapacity.userId, userId),
        or(
          eq(userCapacity.effectiveTo, null),
          and(
            sql`${userCapacity.effectiveFrom} <= ${startDate}`,
            sql`${userCapacity.effectiveTo} >= ${startDate}`
          )
        )
      )
    )
    .orderBy(desc(userCapacity.effectiveFrom))
    .limit(1);

  const userCapacityData = capacity[0];
  if (!userCapacityData) {
    // Create default capacity data if none exists
    console.warn(`No capacity data found for user ${userId}, using defaults`);
    const defaultCapacity = {
      userId,
      hoursPerDay: "8.00",
      hoursPerWeek: "40.00",
      overtimeMultiplier: "1.50",
      effectiveFrom: new Date(),
      effectiveTo: null,
    };

    // Insert default capacity for future use
    try {
      await db.insert(userCapacity).values(defaultCapacity);
    } catch (error) {
      console.warn('Failed to create default capacity, continuing with runtime defaults');
    }

    // Use runtime defaults for this calculation
    const runtimeDefaults = {
      userId,
      hoursPerDay: "8.00",
      hoursPerWeek: "40.00",
      overtimeMultiplier: "1.50",
      effectiveFrom: new Date(),
      effectiveTo: null,
    };
    userCapacityData = runtimeDefaults as any;
  }

  // Calculate working days in the period (excluding weekends)
  const workingDays = calculateWorkingDays(startDate, endDate);
  const totalCapacityHours = workingDays * parseFloat(userCapacityData.hoursPerDay);

  // Get availability periods (vacations, sick days, etc.)
  const unavailablePeriods = await db
    .select()
    .from(userAvailability)
    .where(
      and(
        eq(userAvailability.userId, userId),
        eq(userAvailability.status, "approved"),
        or(
          and(
            sql`${userAvailability.startDate} >= ${startDate}`,
            sql`${userAvailability.startDate} <= ${endDate}`
          ),
          and(
            sql`${userAvailability.endDate} >= ${startDate}`,
            sql`${userAvailability.endDate} <= ${endDate}`
          ),
          and(
            sql`${userAvailability.startDate} <= ${startDate}`,
            sql`${userAvailability.endDate} >= ${endDate}`
          )
        )
      )
    );

  // Calculate unavailable hours
  let unavailableHours = 0;
  for (const period of unavailablePeriods) {
    const periodStart = new Date(Math.max(period.startDate.getTime(), startDate.getTime()));
    const periodEnd = new Date(Math.min(period.endDate.getTime(), endDate.getTime()));
    const periodWorkingDays = calculateWorkingDays(periodStart, periodEnd);

    if (period.hoursPerDay) {
      unavailableHours += periodWorkingDays * parseFloat(period.hoursPerDay);
    } else {
      unavailableHours += periodWorkingDays * parseFloat(userCapacityData.hoursPerDay);
    }
  }

  const availableHours = totalCapacityHours - unavailableHours;

  // Get resource allocations for the period
  const allocations = await db
    .select()
    .from(resourceAllocations)
    .where(
      and(
        eq(resourceAllocations.userId, userId),
        eq(resourceAllocations.status, "active"),
        or(
          and(
            sql`${resourceAllocations.startDate} >= ${startDate}`,
            sql`${resourceAllocations.startDate} <= ${endDate}`
          ),
          and(
            sql`${resourceAllocations.endDate} >= ${startDate}`,
            sql`${resourceAllocations.endDate} <= ${endDate}`
          ),
          and(
            sql`${resourceAllocations.startDate} <= ${startDate}`,
            sql`${resourceAllocations.endDate} >= ${endDate}`
          )
        )
      )
    );

  const totalAllocatedHours = allocations.reduce((total, allocation) => {
    return total + parseFloat(allocation.allocatedHours);
  }, 0);

  // Get actual worked hours from time entries
  const timeEntriesResult = await db
    .select({ totalHours: sum(timeEntries.hours) })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        sql`${timeEntries.date} >= ${startDate}`,
        sql`${timeEntries.date} <= ${endDate}`
      )
    );

  const actualWorkedHours = parseFloat(timeEntriesResult[0]?.totalHours || "0");

  // Calculate utilization
  const utilizationPercentage = availableHours > 0 ? (totalAllocatedHours / availableHours) * 100 : 0;
  const overallocationHours = Math.max(0, totalAllocatedHours - availableHours);
  const isOverallocated = overallocationHours > 0;

  // Get active projects and tasks count
  const activeProjectsCount = new Set(
    allocations
      .filter(a => a.projectId)
      .map(a => a.projectId)
  ).size;

  const activeTasksQuery = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedTo, userId),
        or(
          eq(tasks.status, "in_progress"),
          eq(tasks.status, "todo")
        )
      )
    );

  const activeTasksCount = activeTasksQuery[0]?.count || 0;

  // Check for allocation conflicts
  const conflictingAllocations = await findAllocationConflicts(userId, startDate, endDate);

  return {
    userId,
    totalCapacityHours,
    totalAllocatedHours,
    actualWorkedHours,
    availableHours,
    utilizationPercentage,
    overallocationHours,
    isOverallocated,
    activeProjectsCount,
    activeTasksCount,
    conflictingAllocations,
  };
}

/**
 * Calculate team-wide utilization metrics
 */
export async function calculateTeamUtilization(
  startDate: Date,
  endDate: Date,
  teamUserIds?: string[]
): Promise<TeamUtilization> {
  // Get all users if no specific team provided
  let userList = teamUserIds;
  if (!userList) {
    const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
    userList = allUsers.map(u => u.id);
  }

  const workloadCalculations = await Promise.all(
    userList.map(userId => calculateUserWorkload(userId, startDate, endDate))
  );

  const totalTeamMembers = workloadCalculations.length;
  const totalCapacityHours = workloadCalculations.reduce((sum, calc) => sum + calc.totalCapacityHours, 0);
  const totalAllocatedHours = workloadCalculations.reduce((sum, calc) => sum + calc.totalAllocatedHours, 0);
  const averageUtilization = totalCapacityHours > 0 ? (totalAllocatedHours / totalCapacityHours) * 100 : 0;

  // Categorize team members
  let overallocatedMembers = 0;
  let underutilizedMembers = 0;
  let optimalUtilizationMembers = 0;

  workloadCalculations.forEach(calc => {
    if (calc.utilizationPercentage > 100) {
      overallocatedMembers++;
    } else if (calc.utilizationPercentage < 70) {
      underutilizedMembers++;
    } else {
      optimalUtilizationMembers++;
    }
  });

  return {
    totalTeamMembers,
    averageUtilization,
    overallocatedMembers,
    underutilizedMembers,
    optimalUtilizationMembers,
    totalCapacityHours,
    totalAllocatedHours,
  };
}

/**
 * Find resource allocation conflicts for a user
 */
async function findAllocationConflicts(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ResourceAllocationConflict[]> {
  const conflicts: ResourceAllocationConflict[] = [];

  // Get user capacity
  const capacity = await db
    .select()
    .from(userCapacity)
    .where(eq(userCapacity.userId, userId))
    .orderBy(desc(userCapacity.effectiveFrom))
    .limit(1);

  if (!capacity[0]) return conflicts;

  const dailyCapacity = parseFloat(capacity[0].hoursPerDay);

  // Check each day in the period for overallocation
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get allocations for this day
      const dayAllocations = await db
        .select({
          allocatedHours: resourceAllocations.allocatedHours,
          projectId: resourceAllocations.projectId,
        })
        .from(resourceAllocations)
        .leftJoin(projects, eq(resourceAllocations.projectId, projects.id))
        .where(
          and(
            eq(resourceAllocations.userId, userId),
            eq(resourceAllocations.status, "active"),
            sql`${resourceAllocations.startDate} <= ${dayEnd}`,
            sql`${resourceAllocations.endDate} >= ${dayStart}`
          )
        );

      const totalDayAllocation = dayAllocations.reduce(
        (sum, allocation) => sum + parseFloat(allocation.allocatedHours) / calculateWorkingDays(
          new Date(Math.max(new Date(resourceAllocations.startDate).getTime(), dayStart.getTime())),
          new Date(Math.min(new Date(resourceAllocations.endDate).getTime(), dayEnd.getTime()))
        ), 0
      );

      if (totalDayAllocation > dailyCapacity) {
        conflicts.push({
          userId,
          conflictDate: new Date(currentDate),
          totalAllocatedHours: totalDayAllocation,
          availableHours: dailyCapacity,
          overallocationHours: totalDayAllocation - dailyCapacity,
          conflictingProjects: dayAllocations.map(a => a.projectId).filter(Boolean),
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return conflicts;
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Find optimal resource allocation suggestions
 */
export async function findOptimalResourceAllocations(
  projectId: string,
  requiredSkills: string[],
  estimatedHours: number,
  startDate: Date,
  endDate: Date
): Promise<{ userId: string; userName: string; skillMatch: number; availability: number; hourlyRate: number }[]> {
  // Get users with matching skills
  const usersWithSkills = await db
    .select({
      userId: users.id,
      userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      skillName: sql<string>`array_agg(${sql.raw("user_skills.skill_name")})`,
      avgProficiency: sql<number>`avg(${sql.raw("user_skills.proficiency_level")})`,
    })
    .from(users)
    .leftJoin(sql.raw("user_skills"), eq(users.id, sql.raw("user_skills.user_id")))
    .where(
      and(
        eq(users.isActive, true),
        sql.raw("user_skills.skill_name = ANY($1)", [requiredSkills])
      )
    )
    .groupBy(users.id, users.firstName, users.lastName);

  const suggestions = [];

  for (const user of usersWithSkills) {
    // Calculate skill match percentage
    const userSkills = user.skillName || [];
    const matchingSkills = requiredSkills.filter(skill => userSkills.includes(skill));
    const skillMatch = (matchingSkills.length / requiredSkills.length) * 100;

    // Calculate availability
    const workload = await calculateUserWorkload(user.userId, startDate, endDate);
    const availability = Math.max(0, 100 - workload.utilizationPercentage);

    // Get hourly rate from recent allocations
    const recentAllocations = await db
      .select({ hourlyRate: resourceAllocations.hourlyRate })
      .from(resourceAllocations)
      .where(
        and(
          eq(resourceAllocations.userId, user.userId),
          sql`${resourceAllocations.hourlyRate} IS NOT NULL`
        )
      )
      .orderBy(desc(resourceAllocations.createdAt))
      .limit(1);

    const hourlyRate = parseFloat(recentAllocations[0]?.hourlyRate || "0");

    suggestions.push({
      userId: user.userId,
      userName: user.userName,
      skillMatch,
      availability,
      hourlyRate,
    });
  }

  // Sort by skill match and availability
  return suggestions.sort((a, b) => {
    const scoreA = (a.skillMatch * 0.6) + (a.availability * 0.4);
    const scoreB = (b.skillMatch * 0.6) + (b.availability * 0.4);
    return scoreB - scoreA;
  });
}

/**
 * Create a workload snapshot for a user
 */
export async function createWorkloadSnapshot(userId: string, snapshotDate: Date): Promise<void> {
  const weekStart = new Date(snapshotDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const workload = await calculateUserWorkload(userId, weekStart, weekEnd);

  await db.insert(workloadSnapshots).values({
    userId,
    snapshotDate,
    totalAllocatedHours: workload.totalAllocatedHours.toFixed(2),
    actualWorkedHours: workload.actualWorkedHours.toFixed(2),
    availableHours: workload.availableHours.toFixed(2),
    utilizationPercentage: workload.utilizationPercentage.toFixed(2),
    overallocationHours: workload.overallocationHours.toFixed(2),
    activeProjectsCount: workload.activeProjectsCount,
    activeTasksCount: workload.activeTasksCount,
  });
}

/**
 * Generate workload snapshots for all active users
 */
export async function generateTeamWorkloadSnapshots(snapshotDate: Date = new Date()): Promise<void> {
  const activeUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));

  await Promise.all(
    activeUsers.map(user => createWorkloadSnapshot(user.id, snapshotDate))
  );
}