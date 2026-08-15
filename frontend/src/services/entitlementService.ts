import { PlanDto, EntitlementDto, PaymentConfigDto } from '@student-os/shared';
import { API_BASE_URL as API_HOST } from '@/config/api';

const API_BASE_URL = `${API_HOST}/api/v1`;

export class EntitlementService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('student_os_session_token');
    const deviceId = localStorage.getItem('student_os_device_id') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(deviceId ? { 'x-device-id': deviceId } : {}),
    };
  }

  static async getPlans(): Promise<PlanDto[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/entitlement/plans`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('Failed to fetch plans from backend', err);
      return [];
    }
  }

  static async getEntitlement(): Promise<EntitlementDto | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/entitlement/status`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch entitlement status');
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.warn('Failed to fetch entitlement status', err);
      return null;
    }
  }

  static async getPaymentConfig(): Promise<PaymentConfigDto | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/config`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch payment config');
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.warn('Failed to fetch payment config', err);
      return null;
    }
  }

  static openWhatsAppPurchase(
    whatsappNumber: string | null | undefined,
    planName: string,
    priceInRupees: number,
    accountEmail: string,
    planId: string,
    durationDays?: number | null
  ): void {
    const defaultNumber = '919793593183';
    const cleanNumber = (whatsappNumber || defaultNumber).replace(/[^0-9]/g, '');
    const durationText = durationDays ? `${durationDays} days` : planId === 'yearly' ? '365 days' : '30 days';
    const formattedPlanName = planName.startsWith('Student OS') ? planName : `Student OS ${planName}`;
    const message = `Hi, I want to get ${formattedPlanName} access for ₹${priceInRupees}.\n\nAccount: ${accountEmail}\nPlan: ${planId}\nDuration: ${durationText}`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanNumber}?text=${encoded}`;
    window.open(url, '_blank');
  }
}
