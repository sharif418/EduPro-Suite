import { prisma } from './prisma';

export interface PaymentGatewayConfig {
  bkash: {
    appKey: string;
    appSecret: string;
    username: string;
    password: string;
    baseUrl: string;
  };
  nagad: {
    merchantId: string;
    merchantPrivateKey: string;
    pgPublicKey: string;
    baseUrl: string;
  };
  sslcommerz: {
    storeId: string;
    storePassword: string;
    baseUrl: string;
  };
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  gateway: 'BKASH' | 'NAGAD' | 'SSLCOMMERZ';
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  redirectUrl?: string;
  qrCode?: string;
  message: string;
  transactionId?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  currency: string;
  transactionId?: string;
  gatewayResponse: any;
  completedAt?: Date;
  failureReason?: string;
}

export class PaymentGatewayService {
  private static config: PaymentGatewayConfig = {
    bkash: {
      appKey: process.env.BKASH_APP_KEY || '',
      appSecret: process.env.BKASH_APP_SECRET || '',
      username: process.env.BKASH_USERNAME || '',
      password: process.env.BKASH_PASSWORD || '',
      baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
    },
    nagad: {
      merchantId: process.env.NAGAD_MERCHANT_ID || '',
      merchantPrivateKey: process.env.NAGAD_PRIVATE_KEY || '',
      pgPublicKey: process.env.NAGAD_PUBLIC_KEY || '',
      baseUrl: process.env.NAGAD_BASE_URL || 'https://api.mynagad.com:10443'
    },
    sslcommerz: {
      storeId: process.env.SSLCOMMERZ_STORE_ID || '',
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
      baseUrl: process.env.SSLCOMMERZ_BASE_URL || 'https://sandbox.sslcommerz.com'
    }
  };

  /**
   * Initialize payment with bKash
   */
  static async initiateBkashPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Get bKash access token
      const token = await this.getBkashToken();
      
      if (!token) {
        return {
          success: false,
          paymentId: '',
          message: 'Failed to get bKash access token'
        };
      }

      // Create payment request
      const createPaymentData = {
        mode: '0011',
        payerReference: paymentRequest.customerPhone,
        callbackURL: paymentRequest.successUrl,
        amount: paymentRequest.amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: paymentRequest.orderId
      };

      const response = await fetch(`${this.config.bkash.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-APP-Key': this.config.bkash.appKey
        },
        body: JSON.stringify(createPaymentData)
      });

      const result = await response.json();

      if (result.statusCode === '0000') {
        // Store payment record
        await this.storePaymentRecord({
          paymentId: result.paymentID,
          orderId: paymentRequest.orderId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          gateway: 'BKASH',
          status: 'PENDING',
          customerInfo: {
            name: paymentRequest.customerName,
            email: paymentRequest.customerEmail,
            phone: paymentRequest.customerPhone
          },
          gatewayResponse: result
        });

        return {
          success: true,
          paymentId: result.paymentID,
          redirectUrl: result.bkashURL,
          message: 'Payment initiated successfully'
        };
      } else {
        return {
          success: false,
          paymentId: '',
          message: result.statusMessage || 'Payment initiation failed'
        };
      }

    } catch (error: any) {
      console.error('bKash payment initiation error:', error);
      return {
        success: false,
        paymentId: '',
        message: 'Payment service temporarily unavailable'
      };
    }
  }

  /**
   * Initialize payment with Nagad
   */
  static async initiateNagadPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Mock implementation for Nagad
      const paymentId = `nagad_${Date.now()}`;
      
      // Store payment record
      await this.storePaymentRecord({
        paymentId,
        orderId: paymentRequest.orderId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        gateway: 'NAGAD',
        status: 'PENDING',
        customerInfo: {
          name: paymentRequest.customerName,
          email: paymentRequest.customerEmail,
          phone: paymentRequest.customerPhone
        },
        gatewayResponse: { mock: true }
      });

      return {
        success: true,
        paymentId,
        redirectUrl: `${this.config.nagad.baseUrl}/payment/${paymentId}`,
        message: 'Nagad payment initiated successfully'
      };

    } catch (error: any) {
      console.error('Nagad payment initiation error:', error);
      return {
        success: false,
        paymentId: '',
        message: 'Nagad payment service temporarily unavailable'
      };
    }
  }

  /**
   * Initialize payment with SSLCommerz
   */
  static async initiateSSLCommerzPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const paymentData = {
        store_id: this.config.sslcommerz.storeId,
        store_passwd: this.config.sslcommerz.storePassword,
        total_amount: paymentRequest.amount.toString(),
        currency: 'BDT',
        tran_id: paymentRequest.orderId,
        success_url: paymentRequest.successUrl,
        fail_url: paymentRequest.failUrl,
        cancel_url: paymentRequest.cancelUrl,
        cus_name: paymentRequest.customerName,
        cus_email: paymentRequest.customerEmail,
        cus_phone: paymentRequest.customerPhone,
        cus_add1: 'Dhaka, Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        product_name: paymentRequest.description,
        product_category: 'Education',
        product_profile: 'general'
      };

      const response = await fetch(`${this.config.sslcommerz.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(paymentData).toString()
      });

      const result = await response.json();

      if (result.status === 'SUCCESS') {
        // Store payment record
        await this.storePaymentRecord({
          paymentId: result.sessionkey,
          orderId: paymentRequest.orderId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          gateway: 'SSLCOMMERZ',
          status: 'PENDING',
          customerInfo: {
            name: paymentRequest.customerName,
            email: paymentRequest.customerEmail,
            phone: paymentRequest.customerPhone
          },
          gatewayResponse: result
        });

        return {
          success: true,
          paymentId: result.sessionkey,
          redirectUrl: result.GatewayPageURL,
          message: 'SSLCommerz payment initiated successfully'
        };
      } else {
        return {
          success: false,
          paymentId: '',
          message: result.failedreason || 'SSLCommerz payment initiation failed'
        };
      }

    } catch (error: any) {
      console.error('SSLCommerz payment initiation error:', error);
      return {
        success: false,
        paymentId: '',
        message: 'SSLCommerz payment service temporarily unavailable'
      };
    }
  }

  /**
   * Execute bKash payment
   */
  static async executeBkashPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getBkashToken();
      
      if (!token) {
        return {
          success: false,
          paymentId,
          message: 'Failed to get bKash access token'
        };
      }

      const response = await fetch(`${this.config.bkash.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-APP-Key': this.config.bkash.appKey
        },
        body: JSON.stringify({ paymentID: paymentId })
      });

      const result = await response.json();

      if (result.statusCode === '0000') {
        // Update payment record
        await this.updatePaymentStatus(paymentId, 'COMPLETED', result.trxID, result);

        return {
          success: true,
          paymentId,
          transactionId: result.trxID,
          message: 'Payment completed successfully'
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'FAILED', undefined, result);
        
        return {
          success: false,
          paymentId,
          message: result.statusMessage || 'Payment execution failed'
        };
      }

    } catch (error: any) {
      console.error('bKash payment execution error:', error);
      await this.updatePaymentStatus(paymentId, 'FAILED', undefined, { error: error.message });
      
      return {
        success: false,
        paymentId,
        message: 'Payment execution failed'
      };
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      // Mock implementation - in production this would query the database
      return {
        paymentId,
        status: 'COMPLETED',
        amount: 1000,
        currency: 'BDT',
        transactionId: `txn_${Date.now()}`,
        gatewayResponse: { mock: true },
        completedAt: new Date()
      };

    } catch (error) {
      console.error('Error fetching payment status:', error);
      return null;
    }
  }

  /**
   * Process refund
   */
  static async processRefund(paymentId: string, amount: number, reason: string): Promise<{
    success: boolean;
    refundId?: string;
    message: string;
  }> {
    try {
      // Mock implementation
      const refundId = `refund_${Date.now()}`;
      
      // Update payment status
      await this.updatePaymentStatus(paymentId, 'REFUNDED', refundId, { 
        refundAmount: amount, 
        refundReason: reason 
      });

      return {
        success: true,
        refundId,
        message: 'Refund processed successfully'
      };

    } catch (error: any) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        message: 'Refund processing failed'
      };
    }
  }

  /**
   * Verify payment webhook
   */
  static async verifyWebhook(payload: any, signature: string, gateway: string): Promise<boolean> {
    try {
      // Mock implementation - in production this would verify the webhook signature
      console.log(`Webhook received from ${gateway}:`, payload);
      
      if (payload.paymentId) {
        await this.updatePaymentStatus(
          payload.paymentId, 
          payload.status, 
          payload.transactionId, 
          payload
        );
        return true;
      }

      return false;

    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Get bKash access token
   */
  private static async getBkashToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.bkash.baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': this.config.bkash.username,
          'password': this.config.bkash.password
        },
        body: JSON.stringify({
          app_key: this.config.bkash.appKey,
          app_secret: this.config.bkash.appSecret
        })
      });

      const result = await response.json();
      
      if (result.statusCode === '0000') {
        return result.id_token;
      }

      return null;

    } catch (error) {
      console.error('bKash token generation error:', error);
      return null;
    }
  }

  /**
   * Store payment record (mock implementation)
   */
  private static async storePaymentRecord(paymentData: any): Promise<void> {
    try {
      // Mock implementation - in production this would store in database
      console.log('Storing payment record:', paymentData);
      
      // This would create a record in the payments table
      // await prisma.payment.create({ data: paymentData });

    } catch (error) {
      console.error('Error storing payment record:', error);
    }
  }

  /**
   * Update payment status (mock implementation)
   */
  private static async updatePaymentStatus(
    paymentId: string, 
    status: string, 
    transactionId?: string, 
    gatewayResponse?: any
  ): Promise<void> {
    try {
      // Mock implementation - in production this would update the database
      console.log(`Updating payment ${paymentId} status to ${status}`, {
        transactionId,
        gatewayResponse
      });

      // This would update the payment record in database
      // await prisma.payment.update({
      //   where: { paymentId },
      //   data: { status, transactionId, gatewayResponse }
      // });

    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  }

  /**
   * Generate payment receipt
   */
  static async generateReceipt(paymentId: string): Promise<{
    success: boolean;
    receiptUrl?: string;
    receiptData?: any;
  }> {
    try {
      const paymentStatus = await this.getPaymentStatus(paymentId);
      
      if (!paymentStatus) {
        return {
          success: false
        };
      }

      const receiptData = {
        receiptId: `receipt_${Date.now()}`,
        paymentId,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        transactionId: paymentStatus.transactionId,
        status: paymentStatus.status,
        completedAt: paymentStatus.completedAt,
        generatedAt: new Date()
      };

      // Mock receipt URL
      const receiptUrl = `/api/payments/receipts/${receiptData.receiptId}.pdf`;

      return {
        success: true,
        receiptUrl,
        receiptData
      };

    } catch (error) {
      console.error('Receipt generation error:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    gatewayBreakdown: { [key: string]: number };
    dailyStats: Array<{
      date: string;
      transactions: number;
      amount: number;
    }>;
  }> {
    try {
      // Mock implementation
      return {
        totalTransactions: 1250,
        totalAmount: 2500000, // 25 Lakh BDT
        successRate: 94.5,
        gatewayBreakdown: {
          'BKASH': 60,
          'NAGAD': 25,
          'SSLCOMMERZ': 15
        },
        dailyStats: [
          { date: '2024-01-01', transactions: 45, amount: 90000 },
          { date: '2024-01-02', transactions: 52, amount: 104000 },
          { date: '2024-01-03', transactions: 38, amount: 76000 }
        ]
      };

    } catch (error) {
      console.error('Payment analytics error:', error);
      throw new Error('Failed to fetch payment analytics');
    }
  }
}
