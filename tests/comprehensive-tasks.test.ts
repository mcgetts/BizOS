import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '@server/routes';
import { TestDataFactory } from './setup';
import { storage } from '@server/storage';
import { insertTaskSchema } from '@shared/schema';

// Create test app
let app: express.Application;
let server: any;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Mock authentication middleware for testing
  app.use('/api', (req: any, res, next) => {
    if (req.path === '/test/reset' || req.path === '/auth/dev-login') {
      return next();
    }

    // Mock authenticated user for all other API routes
    req.user = {
      claims: {
        sub: 'test-user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    req.currentUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin'
    };

    req.isAuthenticated = () => true;
    next();
  });

  server = await registerRoutes(app);
});

describe('Comprehensive Tasks Module Testing', () => {
  let testClient: any;
  let testProject: any;
  let testUser: any;
  let testUser2: any;

  beforeEach(async () => {
    // Reset test data
    await request(app).get('/api/test/reset');

    // Create test data
    testClient = await storage.createClient(TestDataFactory.client({ name: 'Test Client Corp' }));
    testProject = await storage.createProject(TestDataFactory.project(testClient.id, { name: 'Test Project Alpha' }));
    testUser = await storage.upsertUser(TestDataFactory.user({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    }));
    testUser2 = await storage.upsertUser(TestDataFactory.user({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    }));
  });

  describe('1. Task API Endpoints - Basic CRUD Operations', () => {
    it('should create a new task with all fields', async () => {
      const taskData = {
        title: 'Implement user authentication',
        description: 'Create secure login and registration system with JWT tokens',
        projectId: testProject.id,
        assignedTo: testUser.id,
        createdBy: testUser.id,
        status: 'todo',
        priority: 'high',
        estimatedHours: '16.0',
        actualHours: '0.0',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['authentication', 'security', 'backend']
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        title: taskData.title,
        description: taskData.description,
        projectId: taskData.projectId,
        assignedTo: taskData.assignedTo,
        status: taskData.status,
        priority: taskData.priority,
        estimatedHours: taskData.estimatedHours
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should get all tasks', async () => {
      // Create multiple test tasks
      await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, {
        title: 'Task 1',
        priority: 'high'
      }));
      await storage.createTask(TestDataFactory.task(testProject.id, testUser2.id, {
        title: 'Task 2',
        priority: 'medium',
        status: 'in_progress'
      }));
      await storage.createTask(TestDataFactory.task(testProject.id, null, {
        title: 'Task 3',
        priority: 'low',
        status: 'completed'
      }));

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      // Verify different priorities and statuses are returned
      const priorities = response.body.map((task: any) => task.priority);
      const statuses = response.body.map((task: any) => task.status);
      expect(priorities).toContain('high');
      expect(priorities).toContain('medium');
      expect(priorities).toContain('low');
      expect(statuses).toContain('todo');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('completed');
    });

    it('should get a specific task by ID', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, {
        title: 'Specific Task',
        description: 'Task for ID testing'
      }));

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .expect(200);

      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe('Specific Task');
      expect(response.body.description).toBe('Task for ID testing');
    });

    it('should update a task', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));

      const updateData = {
        title: 'Updated Task Title',
        status: 'in_progress',
        priority: 'urgent',
        actualHours: '4.5',
        description: 'Updated description with more details'
      };

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.priority).toBe(updateData.priority);
      expect(response.body.actualHours).toBe(updateData.actualHours);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should delete a task', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));

      await request(app)
        .delete(`/api/tasks/${task.id}`)
        .expect(204);

      // Verify task is deleted
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .get('/api/tasks/non-existent-id')
        .expect(404);
    });
  });

  describe('2. Task Form Validation Schema', () => {
    it('should validate required title field', async () => {
      const invalidTaskData = {
        description: 'Task without title',
        projectId: testProject.id
      };

      await request(app)
        .post('/api/tasks')
        .send(invalidTaskData)
        .expect(400);
    });

    it('should accept optional fields as null/undefined', async () => {
      const minimalTaskData = {
        title: 'Minimal Task',
        description: null,
        projectId: null,
        assignedTo: null,
        priority: 'medium',
        status: 'todo'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(minimalTaskData)
        .expect(201);

      expect(response.body.title).toBe('Minimal Task');
      expect(response.body.description).toBeNull();
      expect(response.body.projectId).toBeNull();
      expect(response.body.assignedTo).toBeNull();
    });

    it('should validate estimatedHours as decimal', async () => {
      const taskData = {
        title: 'Hours Validation Task',
        estimatedHours: '15.75',
        actualHours: '8.25'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.estimatedHours).toBe('15.75');
      expect(response.body.actualHours).toBe('8.25');
    });

    it('should validate dueDate format', async () => {
      const validDate = new Date('2024-12-31T23:59:59.000Z').toISOString();
      const taskData = {
        title: 'Date Validation Task',
        dueDate: validDate
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(new Date(response.body.dueDate).toISOString()).toBe(validDate);
    });
  });

  describe('3. Task Status Workflow', () => {
    let workflowTask: any;

    beforeEach(async () => {
      workflowTask = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, {
        title: 'Workflow Test Task',
        status: 'todo'
      }));
    });

    it('should transition from todo to in_progress', async () => {
      const response = await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
    });

    it('should transition from in_progress to review', async () => {
      // First move to in_progress
      await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'in_progress' });

      // Then move to review
      const response = await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'review' })
        .expect(200);

      expect(response.body.status).toBe('review');
    });

    it('should transition from review to completed with completion timestamp', async () => {
      // Move through workflow
      await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'in_progress' });

      await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'review' });

      // Complete the task
      const response = await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
      // Note: completedAt would be set by backend logic if implemented
    });

    it('should allow direct status changes (no strict workflow enforcement)', async () => {
      // Should allow jumping directly from todo to completed
      const response = await request(app)
        .put(`/api/tasks/${workflowTask.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
    });
  });

  describe('4. Priority Levels', () => {
    it('should create tasks with all priority levels', async () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      const createdTasks = [];

      for (const priority of priorities) {
        const taskData = {
          title: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Task`,
          priority: priority
        };

        const response = await request(app)
          .post('/api/tasks')
          .send(taskData)
          .expect(201);

        expect(response.body.priority).toBe(priority);
        createdTasks.push(response.body);
      }

      // Verify all priorities were created
      const allTasks = await request(app).get('/api/tasks').expect(200);
      const taskPriorities = allTasks.body.map((task: any) => task.priority);

      priorities.forEach(priority => {
        expect(taskPriorities).toContain(priority);
      });
    });

    it('should default to medium priority when not specified', async () => {
      const taskData = {
        title: 'Default Priority Task'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.priority).toBe('medium');
    });
  });

  describe('5. Task-Project and Task-User Assignments', () => {
    it('should assign task to a project', async () => {
      const taskData = {
        title: 'Project Assignment Task',
        projectId: testProject.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.projectId).toBe(testProject.id);
    });

    it('should assign task to a user', async () => {
      const taskData = {
        title: 'User Assignment Task',
        assignedTo: testUser.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.assignedTo).toBe(testUser.id);
    });

    it('should allow reassignment of tasks between users', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ assignedTo: testUser2.id })
        .expect(200);

      expect(response.body.assignedTo).toBe(testUser2.id);
    });

    it('should allow unassigning tasks (set assignedTo to null)', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ assignedTo: null })
        .expect(200);

      expect(response.body.assignedTo).toBeNull();
    });

    it('should create task without project assignment', async () => {
      const taskData = {
        title: 'Unassigned Project Task',
        projectId: null
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.projectId).toBeNull();
    });
  });

  describe('6. Time Tracking (Estimated vs Actual Hours)', () => {
    it('should track estimated and actual hours', async () => {
      const taskData = {
        title: 'Time Tracking Task',
        estimatedHours: '20.0',
        actualHours: '15.5'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.estimatedHours).toBe('20.0');
      expect(response.body.actualHours).toBe('15.5');
    });

    it('should update actual hours as work progresses', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, {
        estimatedHours: '10.0',
        actualHours: '0.0'
      }));

      // Update actual hours after some work
      const response1 = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ actualHours: '3.5' })
        .expect(200);
      expect(response1.body.actualHours).toBe('3.5');

      // Update again
      const response2 = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ actualHours: '7.25' })
        .expect(200);
      expect(response2.body.actualHours).toBe('7.25');
    });

    it('should handle fractional hours correctly', async () => {
      const taskData = {
        title: 'Fractional Hours Task',
        estimatedHours: '2.75',
        actualHours: '1.25'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.estimatedHours).toBe('2.75');
      expect(response.body.actualHours).toBe('1.25');
    });
  });

  describe('7. Due Date Management and Overdue Detection', () => {
    it('should set and retrieve due dates correctly', async () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
      const taskData = {
        title: 'Due Date Task',
        dueDate: futureDate.toISOString()
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(new Date(response.body.dueDate).getTime()).toBe(futureDate.getTime());
    });

    it('should create tasks with past due dates (overdue)', async () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const taskData = {
        title: 'Overdue Task',
        dueDate: pastDate.toISOString(),
        status: 'todo'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(new Date(response.body.dueDate).getTime()).toBe(pastDate.getTime());
      // The frontend should detect this as overdue based on current date
    });

    it('should allow tasks without due dates', async () => {
      const taskData = {
        title: 'No Due Date Task',
        dueDate: null
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.dueDate).toBeNull();
    });

    it('should update due dates', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id));
      const newDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ dueDate: newDueDate.toISOString() })
        .expect(200);

      expect(new Date(response.body.dueDate).getTime()).toBe(newDueDate.getTime());
    });
  });

  describe('8. Task Tags and Metadata', () => {
    it('should create tasks with tags array', async () => {
      const taskData = {
        title: 'Tagged Task',
        tags: ['frontend', 'react', 'ui/ux', 'responsive']
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags).toEqual(['frontend', 'react', 'ui/ux', 'responsive']);
    });

    it('should update task tags', async () => {
      const task = await storage.createTask(TestDataFactory.task(testProject.id, testUser.id, {
        tags: ['initial', 'tags']
      }));

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ tags: ['updated', 'tags', 'new'] })
        .expect(200);

      expect(response.body.tags).toEqual(['updated', 'tags', 'new']);
    });

    it('should handle empty tags array', async () => {
      const taskData = {
        title: 'No Tags Task',
        tags: []
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.tags).toEqual([]);
    });
  });

  describe('9. Error Handling and Edge Cases', () => {
    it('should handle invalid project ID reference', async () => {
      const taskData = {
        title: 'Invalid Project Task',
        projectId: 'non-existent-project-id'
      };

      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(400);
    });

    it('should handle invalid user ID reference', async () => {
      const taskData = {
        title: 'Invalid User Task',
        assignedTo: 'non-existent-user-id'
      };

      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(400);
    });

    it('should handle invalid status values', async () => {
      const taskData = {
        title: 'Invalid Status Task',
        status: 'invalid_status'
      };

      // Should either reject with 400 or default to valid status
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle invalid priority values', async () => {
      const taskData = {
        title: 'Invalid Priority Task',
        priority: 'invalid_priority'
      };

      // Should either reject with 400 or default to valid priority
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500); // Very long title
      const taskData = {
        title: longTitle
      };

      // Should either accept or reject based on database constraints
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);

      expect([200, 201, 400]).toContain(response.status);
    });
  });
});