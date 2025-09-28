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
    const port = parseInt(process.env.SMTP_PORT || '587');
    const isSecurePort = port === 465;
    const emailConfig = {
      host: process.env.SMTP_HOST || 'in-v3.mailjet.com',
      port: port,
      secure: isSecurePort, // Only true for port 465
      requireTLS: !isSecurePort, // Force TLS for non-secure ports
      auth: {
        user: process.env.SMTP_USER, // Mailjet API Key
        pass: process.env.SMTP_PASS, // Mailjet Secret Key
      },
      // Mailjet-optimized TLS configuration
      tls: {
        // Standard TLS verification for Mailjet
        rejectUnauthorized: true,
        // Let Node.js handle TLS version negotiation automatically
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      },
      // Connection options optimized for Mailjet
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds  
      socketTimeout: 60000, // 60 seconds
      // Enable debug for troubleshooting
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    };

    if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email service not configured. SMTP environment variables missing.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
      console.log('Email service initialized successfully');
      
      // Test SMTP connection on startup to identify authentication issues
      this.testConnection().then(result => {
        if (result.success) {
          console.log('✅ SMTP connection test passed - email sending is ready');
        } else {
          console.error('❌ SMTP connection test failed:', result.error);
          console.error('Email verification during user registration will fall back to console logging');
        }
      }).catch(error => {
        console.error('❌ SMTP connection test error:', error);
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // Test SMTP connection by verifying the transporter
      await this.transporter.verify();
      console.log('SMTP connection test successful');
      return { success: true };
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
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

  // Authentication email methods

  public async sendEmailVerification(
    userEmail: string,
    userName: string,
    verificationToken: string,
    protocol: string,
    host: string
  ) {
    const verificationUrl = `${protocol}://${host}/verify-email?token=${verificationToken}`;

    // In development mode without SMTP OR if SMTP authentication fails, log the verification link
    if (!this.isConfigured) {
      console.log('\n=== EMAIL VERIFICATION (Development Mode) ===');
      console.log(`To: ${userEmail}`);
      console.log(`Subject: Verify Your Email Address`);
      console.log(`\nHello ${userName},`);
      console.log('\nWelcome! Please verify your email address to complete your account setup.');
      console.log('\nClick the following link to verify your email:');
      console.log(`${verificationUrl}`);
      console.log('\nIf you didn\'t create this account, you can safely ignore this email.');
      console.log('=========================\n');
      return true;
    }

    const subject = 'Verify Your Email Address';

    const text = `
Hello ${userName},

Welcome! Please verify your email address to complete your account setup.

Click the following link to verify your email:
${verificationUrl}

If you didn't create this account, you can safely ignore this email.

Best regards,
Your Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Verify Your Email Address</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Welcome! Please verify your email address to complete your account setup and start using the platform.</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p><strong>Note:</strong> If you didn't create this account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Your Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Try to send email, but fall back to console logging if authentication fails
    const success = await this.sendEmail({ to: userEmail, subject, text, html });
    
    if (!success && process.env.NODE_ENV === 'development') {
      console.log('\n=== EMAIL VERIFICATION (Fallback - SMTP Auth Failed) ===');
      console.log(`To: ${userEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`\nHello ${userName},`);
      console.log('\nWelcome! Please verify your email address to complete your account setup.');
      console.log('\nClick the following link to verify your email:');
      console.log(`${verificationUrl}`);
      console.log('\nNOTE: In production, this would be sent via email.');
      console.log('=========================\n');
      return true; // Return true in development so registration can complete
    }
    
    return success;
  }

  public async sendPasswordReset(
    userEmail: string,
    userName: string,
    resetToken: string,
    protocol: string,
    host: string
  ) {
    const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

    const subject = 'Reset Your Password';

    const text = `
Hello ${userName},

You requested to reset your password. Click the link below to set a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
Your Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 14px; color: #666; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reset Your Password</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <div class="warning">
        <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
      </div>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>Your Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: userEmail, subject, text, html });
  }

  /**
   * Send escalation notification email
   */
  public async sendEscalationNotification(
    userEmail: string,
    ticket: any,
    escalationLevel: number,
    reason: string
  ): Promise<boolean> {
    const subject = `🚨 Support Ticket Escalated - Action Required #${ticket.ticketNumber}`;

    const text = `
Support Ticket Escalation Notice

Ticket #${ticket.ticketNumber} has been escalated to Level ${escalationLevel}

Title: ${ticket.title}
Priority: ${ticket.priority}
Category: ${ticket.category}
Reason: ${reason}

Please review and take action immediately.

Best regards,
Support Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .ticket-info { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
    .priority-urgent { color: #dc3545; font-weight: bold; }
    .priority-high { color: #fd7e14; font-weight: bold; }
    .priority-medium { color: #ffc107; font-weight: bold; }
    .priority-low { color: #28a745; font-weight: bold; }
    .action-button {
      display: inline-block;
      padding: 12px 25px;
      background: #dc3545;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
    }
    .footer { text-align: center; color: #666; font-size: 12px; }
    .escalation-badge {
      background: #dc3545;
      color: white;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 Support Ticket Escalated</h2>
      <span class="escalation-badge">Level ${escalationLevel} Escalation</span>
    </div>
    <div class="content">
      <p><strong>Action Required:</strong> A support ticket has been escalated to you and requires immediate attention.</p>

      <div class="ticket-info">
        <h3>Ticket Details</h3>
        <p><strong>Ticket Number:</strong> #${ticket.ticketNumber}</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> <span class="priority-${ticket.priority || 'medium'}">${(ticket.priority || 'medium').toUpperCase()}</span></p>
        <p><strong>Category:</strong> ${ticket.category || 'General'}</p>
        <p><strong>Business Impact:</strong> ${ticket.businessImpact || 'Medium'}</p>
        <p><strong>Escalation Reason:</strong> ${reason}</p>
        <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
      </div>

      <p><strong>Description:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 5px;">${ticket.description}</p>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support?ticket=${ticket.id}" class="action-button">
        View Ticket Details
      </a>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review the ticket details immediately</li>
        <li>Assess the situation and take appropriate action</li>
        <li>Update the ticket status and add resolution notes</li>
        <li>Contact the client if necessary</li>
      </ul>
    </div>
    <div class="footer">
      <p>This is an automated escalation notification.<br>
      Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: userEmail, subject, text, html });
  }

  /**
   * Send SLA breach notification email
   */
  public async sendSlaBreachNotification(
    userEmail: string,
    ticket: any
  ): Promise<boolean> {
    const subject = `⚠️ SLA Breach Alert - Ticket #${ticket.ticketNumber}`;

    const text = `
SLA Breach Alert

Ticket #${ticket.ticketNumber} has breached its Service Level Agreement.

Title: ${ticket.title}
Priority: ${ticket.priority}
Time Since Created: ${Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60))} hours

Immediate action required to prevent further escalation.

Best regards,
Support Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #212529; padding: 15px; border-radius: 5px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; margin: 10px 0; }
    .breach-info { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
    .action-button {
      display: inline-block;
      padding: 12px 25px;
      background: #ffc107;
      color: #212529;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
      font-weight: bold;
    }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ SLA Breach Alert</h2>
    </div>
    <div class="content">
      <p><strong>Service Level Agreement Breach Detected</strong></p>

      <div class="breach-info">
        <h3>Ticket Information</h3>
        <p><strong>Ticket:</strong> #${ticket.ticketNumber}</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> ${ticket.priority || 'Medium'}</p>
        <p><strong>Status:</strong> ${ticket.status}</p>
        <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
        <p><strong>Time Elapsed:</strong> ${Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60))} hours</p>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support?ticket=${ticket.id}" class="action-button">
        Resolve Immediately
      </a>

      <p><strong>Required Actions:</strong></p>
      <ul>
        <li>Take immediate action to resolve the issue</li>
        <li>Update ticket status and progress</li>
        <li>Communicate with client if appropriate</li>
        <li>Document resolution steps</li>
      </ul>
    </div>
    <div class="footer">
      <p>Automated SLA monitoring system<br>
      Please respond immediately to prevent further escalation.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: userEmail, subject, text, html });
  }
}

export const emailService = new EmailService();