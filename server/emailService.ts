import nodemailer from 'nodemailer';
import type { User } from '@shared/schema';

export interface EmailNotification {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface NotificationTemplate {
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email configuration is available
    const emailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email service not configured. SMTP environment variables missing.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter(emailConfig);
      this.isConfigured = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  public async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${notification.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  public async sendBulkEmails(notifications: EmailNotification[]): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    for (const notification of notifications) {
      const success = await this.sendEmail(notification);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  // Notification Templates
  public createTaskAssignmentNotification(
    assigneeEmail: string,
    assigneeName: string,
    taskTitle: string,
    projectName: string,
    dueDate?: string
  ): EmailNotification {
    const subject = `New Task Assignment: ${taskTitle}`;
    const dueDateText = dueDate ? ` Due: ${new Date(dueDate).toLocaleDateString()}` : '';

    const text = `
Hello ${assigneeName},

You have been assigned a new task:

Task: ${taskTitle}
Project: ${projectName}${dueDateText}

Please log in to the project management system to view details and start working on this task.

Best regards,
Project Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .task-details { background: white; padding: 15px; border-left: 4px solid #007bff; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Task Assignment</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${assigneeName}</strong>,</p>
      <p>You have been assigned a new task:</p>
      <div class="task-details">
        <h3>${taskTitle}</h3>
        <p><strong>Project:</strong> ${projectName}</p>
        ${dueDateText ? `<p><strong>Due Date:</strong> ${new Date(dueDate!).toLocaleDateString()}</p>` : ''}
      </div>
      <p>Please log in to the project management system to view details and start working on this task.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Project Management Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { to: assigneeEmail, subject, text, html };
  }

  public createTaskStatusChangeNotification(
    userEmail: string,
    userName: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    projectName: string
  ): EmailNotification {
    const subject = `Task Status Updated: ${taskTitle}`;

    const text = `
Hello ${userName},

A task status has been updated:

Task: ${taskTitle}
Project: ${projectName}
Status: ${oldStatus} → ${newStatus}

Please log in to the project management system to view the updated task details.

Best regards,
Project Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; color: white; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .status-change { background: white; padding: 15px; border-left: 4px solid #28a745; }
    .status-arrow { color: #007bff; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Task Status Updated</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>A task status has been updated:</p>
      <div class="status-change">
        <h3>${taskTitle}</h3>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Status:</strong> ${oldStatus} <span class="status-arrow">→</span> ${newStatus}</p>
      </div>
      <p>Please log in to the project management system to view the updated task details.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Project Management Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { to: userEmail, subject, text, html };
  }

  public createProjectCommentNotification(
    userEmail: string,
    userName: string,
    projectName: string,
    commenterName: string,
    commentText: string
  ): EmailNotification {
    const subject = `New Comment on Project: ${projectName}`;
    const truncatedComment = commentText.length > 100 ? commentText.substring(0, 100) + '...' : commentText;

    const text = `
Hello ${userName},

A new comment has been posted on project "${projectName}":

From: ${commenterName}
Comment: ${truncatedComment}

Please log in to the project management system to view the full comment and respond.

Best regards,
Project Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6f42c1; color: white; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .comment { background: white; padding: 15px; border-left: 4px solid #6f42c1; font-style: italic; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Project Comment</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>A new comment has been posted on project "<strong>${projectName}</strong>":</p>
      <div class="comment">
        <p><strong>From:</strong> ${commenterName}</p>
        <p>"${truncatedComment}"</p>
      </div>
      <p>Please log in to the project management system to view the full comment and respond.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Project Management Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { to: userEmail, subject, text, html };
  }

  public createDeadlineReminderNotification(
    userEmail: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate: string,
    daysUntilDue: number
  ): EmailNotification {
    const urgencyText = daysUntilDue <= 1 ? 'URGENT' : daysUntilDue <= 3 ? 'Important' : 'Reminder';
    const subject = `${urgencyText}: Task Due Soon - ${taskTitle}`;

    const text = `
Hello ${userName},

This is a ${urgencyText.toLowerCase()} reminder about an upcoming task deadline:

Task: ${taskTitle}
Project: ${projectName}
Due Date: ${new Date(dueDate).toLocaleDateString()}
Days Until Due: ${daysUntilDue}

Please ensure you complete this task on time or update its status if needed.

Best regards,
Project Management Team
    `.trim();

    const colorClass = daysUntilDue <= 1 ? '#dc3545' : daysUntilDue <= 3 ? '#fd7e14' : '#007bff';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${colorClass}; color: white; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .deadline-info { background: white; padding: 15px; border-left: 4px solid ${colorClass}; }
    .footer { text-align: center; color: #666; font-size: 12px; }
    .urgency { color: ${colorClass}; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${urgencyText}: Task Due Soon</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>This is a <span class="urgency">${urgencyText.toLowerCase()}</span> reminder about an upcoming task deadline:</p>
      <div class="deadline-info">
        <h3>${taskTitle}</h3>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        <p><strong>Days Until Due:</strong> ${daysUntilDue}</p>
      </div>
      <p>Please ensure you complete this task on time or update its status if needed.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Project Management Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { to: userEmail, subject, text, html };
  }
}

export const emailService = new EmailService();