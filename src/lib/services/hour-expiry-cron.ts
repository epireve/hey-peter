/**
 * Hour Expiry Cron Job
 * 
 * This service runs daily to expire old hour purchases and create alerts
 */

import { createClient } from '@/lib/supabase/server';

export class HourExpiryCronService {
  private supabase = createClient();

  /**
   * Run the expiry process
   * This should be called daily by a cron job
   */
  async runExpiryProcess(): Promise<{
    success: boolean;
    expired: number;
    alerts: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      expired: 0,
      alerts: 0,
      errors: [] as string[]
    };

    try {
      // Call the database function to expire purchases
      const { data: expiredCount, error: expireError } = await this.supabase
        .rpc('expire_hour_purchases');

      if (expireError) {
        throw expireError;
      }

      results.expired = expiredCount || 0;

      // Check for upcoming expirations and create alerts
      const alertsCreated = await this.createExpiryAlerts();
      results.alerts = alertsCreated;

      // Send notifications for critical alerts
      await this.sendExpiryNotifications();

      console.log(`Hour expiry process completed: ${results.expired} expired, ${results.alerts} alerts created`);
    } catch (error) {
      results.success = false;
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('Hour expiry process failed:', error);
    }

    return results;
  }

  /**
   * Create alerts for hours expiring soon
   */
  private async createExpiryAlerts(): Promise<number> {
    try {
      // Find purchases expiring within different time frames
      const timeFrames = [
        { days: 7, priority: 'high' },
        { days: 14, priority: 'medium' },
        { days: 30, priority: 'low' }
      ];

      let totalAlerts = 0;

      for (const frame of timeFrames) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + frame.days);

        // Get purchases expiring within this timeframe
        const { data: expiringPurchases, error } = await this.supabase
          .from('hour_purchases')
          .select('id, student_id, hours_remaining, valid_until')
          .eq('is_active', true)
          .eq('is_expired', false)
          .gt('hours_remaining', 0)
          .lte('valid_until', expiryDate.toISOString())
          .gte('valid_until', new Date().toISOString());

        if (error) {
          console.error(`Error fetching expiring purchases for ${frame.days} days:`, error);
          continue;
        }

        // Create alerts for each expiring purchase
        for (const purchase of expiringPurchases || []) {
          const existingAlert = await this.supabase
            .from('hour_alerts')
            .select('id')
            .eq('student_id', purchase.student_id)
            .eq('alert_type', 'expiring_soon')
            .eq('expiry_date', purchase.valid_until)
            .eq('is_active', true)
            .single();

          if (!existingAlert.data) {
            const { error: alertError } = await this.supabase
              .from('hour_alerts')
              .insert({
                student_id: purchase.student_id,
                alert_type: 'expiring_soon',
                hours_remaining: purchase.hours_remaining,
                expiry_date: purchase.valid_until,
                threshold_value: frame.days,
                metadata: { priority: frame.priority }
              });

            if (!alertError) {
              totalAlerts++;
            }
          }
        }
      }

      return totalAlerts;
    } catch (error) {
      console.error('Error creating expiry alerts:', error);
      return 0;
    }
  }

  /**
   * Send notifications for critical alerts
   */
  private async sendExpiryNotifications(): Promise<void> {
    try {
      // Get critical alerts (expiring within 7 days)
      const { data: criticalAlerts, error } = await this.supabase
        .from('hour_alerts')
        .select(`
          *,
          profiles!hour_alerts_student_id_fkey (
            id,
            full_name,
            email,
            phone_number
          )
        `)
        .eq('alert_type', 'expiring_soon')
        .eq('is_active', true)
        .eq('is_acknowledged', false)
        .lte('threshold_value', 7)
        .or('last_notification_at.is.null,last_notification_at.lt.' + 
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching critical alerts:', error);
        return;
      }

      // Send notifications for each alert
      for (const alert of criticalAlerts || []) {
        try {
          // In a real implementation, this would send actual emails/SMS
          // For now, we'll just update the notification timestamp
          await this.supabase
            .from('hour_alerts')
            .update({
              notifications_sent: (alert.notifications_sent || 0) + 1,
              last_notification_at: new Date().toISOString(),
              next_notification_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', alert.id);

          console.log(`Notification sent for alert ${alert.id} to student ${alert.profiles.full_name}`);
        } catch (notifError) {
          console.error(`Error sending notification for alert ${alert.id}:`, notifError);
        }
      }
    } catch (error) {
      console.error('Error sending expiry notifications:', error);
    }
  }

  /**
   * Clean up old expired alerts
   */
  async cleanupOldAlerts(): Promise<number> {
    try {
      // Deactivate alerts older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const { data, error } = await this.supabase
        .from('hour_alerts')
        .update({ is_active: false })
        .eq('alert_type', 'expired')
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        console.error('Error cleaning up old alerts:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in cleanup process:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const hourExpiryCronService = new HourExpiryCronService();

// Function to be called by cron job
export async function runHourExpiryJob() {
  console.log('Starting hour expiry job at', new Date().toISOString());
  
  const service = new HourExpiryCronService();
  const results = await service.runExpiryProcess();
  
  // Also clean up old alerts
  const cleaned = await service.cleanupOldAlerts();
  console.log(`Cleaned up ${cleaned} old alerts`);
  
  return results;
}