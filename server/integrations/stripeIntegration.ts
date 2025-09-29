import Stripe from 'stripe';
import { db } from '../db.js';
import { eq, and } from 'drizzle-orm';
import { invoices, clients, expenses } from '../../shared/schema.js';
import { sentryService } from '../monitoring/sentryService.js';

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  environment: 'test' | 'live';
}

export class StripeIntegration {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-11-20.acacia'
    });
  }

  /**
   * Create a payment intent for an invoice
   */
  async createPaymentIntent(invoiceId: string, returnUrl?: string): Promise<{
    success: boolean;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      // Get invoice details
      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (invoice.length === 0) {
        return { success: false, error: 'Invoice not found' };
      }

      const invoiceData = invoice[0];
      const amount = Math.round(parseFloat(invoiceData.total || invoiceData.amount) * 100); // Convert to cents

      // Get client details
      const client = await db.select()
        .from(clients)
        .where(eq(clients.id, invoiceData.clientId))
        .limit(1);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          invoiceId: invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          clientId: invoiceData.clientId
        },
        description: `Payment for Invoice #${invoiceData.invoiceNumber}`,
        receipt_email: client.length > 0 ? client[0].email || undefined : undefined,
        ...(returnUrl && {
          return_url: returnUrl,
          confirm: false
        })
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret
      };

    } catch (error) {
      console.error('Failed to create payment intent:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'create_payment_intent',
        additionalData: { invoiceId }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment intent creation failed'
      };
    }
  }

  /**
   * Create a checkout session for an invoice
   */
  async createCheckoutSession(invoiceId: string, successUrl: string, cancelUrl: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Get invoice details
      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (invoice.length === 0) {
        return { success: false, error: 'Invoice not found' };
      }

      const invoiceData = invoice[0];
      const amount = Math.round(parseFloat(invoiceData.total || invoiceData.amount) * 100); // Convert to cents

      // Get client details
      const client = await db.select()
        .from(clients)
        .where(eq(clients.id, invoiceData.clientId))
        .limit(1);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoiceData.invoiceNumber}`,
              description: `Payment for invoice #${invoiceData.invoiceNumber}`
            },
            unit_amount: amount
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          invoiceId: invoiceId,
          invoiceNumber: invoiceData.invoiceNumber
        },
        customer_email: client.length > 0 ? client[0].email || undefined : undefined
      });

      return {
        success: true,
        url: session.url
      };

    } catch (error) {
      console.error('Failed to create checkout session:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'create_checkout_session',
        additionalData: { invoiceId }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout session creation failed'
      };
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: string, signature: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      console.log(`Stripe webhook event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.payment_succeeded':
          // Handle recurring billing if implemented
          console.log('Invoice payment succeeded:', event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { success: true, message: 'Webhook processed successfully' };

    } catch (error) {
      console.error('Stripe webhook error:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'webhook_processing'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed'
      };
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (!invoiceId) {
        console.warn('Payment succeeded but no invoiceId in metadata');
        return;
      }

      // Update invoice status to paid
      await db.update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId));

      console.log(`Invoice ${invoiceId} marked as paid`);

    } catch (error) {
      console.error('Failed to handle payment success:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'payment_success_handler'
      });
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (!invoiceId) {
        console.warn('Payment failed but no invoiceId in metadata');
        return;
      }

      // Could update invoice with failure information or trigger notifications
      console.log(`Payment failed for invoice ${invoiceId}`);

    } catch (error) {
      console.error('Failed to handle payment failure:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'payment_failure_handler'
      });
    }
  }

  /**
   * Handle completed checkout session
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) {
        console.warn('Checkout completed but no invoiceId in metadata');
        return;
      }

      // Update invoice status to paid
      await db.update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId));

      console.log(`Invoice ${invoiceId} marked as paid via checkout`);

    } catch (error) {
      console.error('Failed to handle checkout completion:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'checkout_completion_handler'
      });
    }
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<{
    success: boolean;
    paymentMethods?: Stripe.PaymentMethod[];
    error?: string;
  }> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return {
        success: true,
        paymentMethods: paymentMethods.data
      };

    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment methods'
      };
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(clientData: {
    email?: string;
    name: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    customer?: Stripe.Customer;
    error?: string;
  }> {
    try {
      const customer = await this.stripe.customers.create({
        email: clientData.email,
        name: clientData.name,
        phone: clientData.phone,
        metadata: {
          source: 'bizos_integration'
        }
      });

      return {
        success: true,
        customer
      };

    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Customer creation failed'
      };
    }
  }

  /**
   * Get payment history for an invoice
   */
  async getPaymentHistory(invoiceId: string): Promise<{
    success: boolean;
    payments?: Array<{
      id: string;
      amount: number;
      status: string;
      created: Date;
      description?: string;
    }>;
    error?: string;
  }> {
    try {
      const paymentIntents = await this.stripe.paymentIntents.list({
        limit: 100
      });

      const relatedPayments = paymentIntents.data
        .filter(pi => pi.metadata?.invoiceId === invoiceId)
        .map(pi => ({
          id: pi.id,
          amount: pi.amount,
          status: pi.status,
          created: new Date(pi.created * 1000),
          description: pi.description
        }));

      return {
        success: true,
        payments: relatedPayments
      };

    } catch (error) {
      console.error('Failed to get payment history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment history'
      };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(paymentIntentId: string, amount?: number): Promise<{
    success: boolean;
    refund?: Stripe.Refund;
    error?: string;
  }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount // If not provided, refunds the full amount
      });

      return {
        success: true,
        refund
      };

    } catch (error) {
      console.error('Failed to process refund:', error);
      sentryService.captureException(error as Error, {
        feature: 'stripe_integration',
        action: 'process_refund',
        additionalData: { paymentIntentId, amount }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  /**
   * Get Stripe configuration for frontend
   */
  getPublicConfig(): {
    publishableKey: string;
    environment: string;
  } {
    return {
      publishableKey: this.config.publishableKey,
      environment: this.config.environment
    };
  }

  /**
   * Test Stripe connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Try to retrieve account info
      const account = await this.stripe.accounts.retrieve();

      return {
        success: true,
        message: `Connected to Stripe account: ${account.display_name || account.id}`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Factory function to create Stripe integration
export function createStripeIntegration(): StripeIntegration {
  const config: StripeConfig = {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || 'test'
  };

  return new StripeIntegration(config);
}