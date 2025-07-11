import { supabase } from "@/lib/supabase";
import { contentSynchronizationService } from "./content-synchronization-service";
import { logger } from '@/lib/services';
import { 
  ContentSyncConfig, 
  ContentSyncStatus, 
  SchedulingApiResponse 
} from "@/types/scheduling";

/**
 * Content Synchronization Scheduler
 * 
 * This service handles automated and scheduled synchronization operations:
 * - Scheduled synchronization based on time intervals
 * - Selective synchronization with filters
 * - Batch processing automation
 * - Synchronization job management
 */

export interface SyncSchedule {
  id: string;
  name: string;
  description: string;
  scheduleType: 'interval' | 'cron' | 'event_driven';
  scheduleConfig: {
    interval?: number; // minutes
    cronExpression?: string;
    eventTriggers?: string[];
  };
  filters: SyncFilter[];
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  weight: number;
}

export interface SyncJob {
  id: string;
  scheduleId: string;
  jobType: 'scheduled' | 'manual' | 'triggered';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceGroupId: string;
  targetGroupIds: string[];
  contentIds: string[];
  filters: SyncFilter[];
  startedAt?: string;
  completedAt?: string;
  duration?: number; // milliseconds
  itemsProcessed: number;
  itemsSuccessful: number;
  itemsFailed: number;
  error?: string;
  logs: string[];
  metadata?: Record<string, any>;
}

export interface SelectiveSyncOptions {
  groupIds?: string[];
  contentTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  priorities?: ('low' | 'medium' | 'high' | 'urgent')[];
  maxItems?: number;
  skipConflicts?: boolean;
  dryRun?: boolean;
}

export class ContentSyncScheduler {
  private schedules: Map<string, SyncSchedule> = new Map();
  private activeJobs: Map<string, SyncJob> = new Map();
  private jobQueue: SyncJob[] = [];
  private isProcessing: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.initializeScheduler();
  }

  /**
   * Initialize the scheduler
   */
  private initializeScheduler(): void {
    // Load existing schedules
    this.loadSchedules();
    
    // Start job processor
    this.startJobProcessor();
    
    // Start schedule checker
    this.startScheduleChecker();
  }

  /**
   * Create a new synchronization schedule
   */
  async createSchedule(scheduleData: Omit<SyncSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SchedulingApiResponse<SyncSchedule>> {
    try {
      const schedule: SyncSchedule = {
        ...scheduleData,
        id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Calculate next run time
      if (schedule.isActive) {
        schedule.nextRun = this.calculateNextRun(schedule);
      }

      // Store in database
      const { data, error } = await supabase
        .from('content_sync_schedules')
        .insert([schedule])
        .select()
        .single();

      if (error) throw error;

      // Cache locally
      this.schedules.set(schedule.id, schedule);

      return {
        success: true,
        data: schedule,
        metadata: {
          requestId: `create_schedule_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULE_CREATION_FAILED',
          message: `Failed to create schedule: ${error.message}`,
          category: 'validation',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Perform selective synchronization
   */
  async selectiveSync(
    sourceGroupId: string,
    options: SelectiveSyncOptions
  ): Promise<SchedulingApiResponse<SyncJob>> {
    try {
      // Apply filters to determine what to sync
      const filteredContent = await this.applyFilters(sourceGroupId, options);
      
      if (filteredContent.length === 0) {
        return {
          success: true,
          data: null as any,
          metadata: {
            requestId: `selective_sync_${Date.now()}`,
            timestamp: new Date().toISOString(),
            processingTime: 0,
            version: '1.0'
          }
        };
      }

      // Create sync job
      const job: SyncJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scheduleId: '', // Manual job
        jobType: 'manual',
        status: 'pending',
        priority: 'medium',
        sourceGroupId,
        targetGroupIds: options.groupIds || [],
        contentIds: filteredContent.map(c => c.id),
        filters: this.convertOptionsToFilters(options),
        itemsProcessed: 0,
        itemsSuccessful: 0,
        itemsFailed: 0,
        logs: [],
        metadata: {
          selectiveSync: true,
          dryRun: options.dryRun || false
        }
      };

      // Add to queue
      this.jobQueue.push(job);
      this.activeJobs.set(job.id, job);

      // Process immediately if not a dry run
      if (!options.dryRun) {
        this.processJobQueue();
      }

      return {
        success: true,
        data: job,
        metadata: {
          requestId: `selective_sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SELECTIVE_SYNC_FAILED',
          message: `Selective sync failed: ${error.message}`,
          category: 'algorithm',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Schedule batch synchronization
   */
  async scheduleBatchSync(
    groupIds: string[],
    contentIds: string[],
    scheduledTime: string
  ): Promise<SchedulingApiResponse<SyncJob>> {
    try {
      const job: SyncJob = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scheduleId: '',
        jobType: 'scheduled',
        status: 'pending',
        priority: 'medium',
        sourceGroupId: groupIds[0], // First group as source
        targetGroupIds: groupIds.slice(1),
        contentIds,
        filters: [],
        itemsProcessed: 0,
        itemsSuccessful: 0,
        itemsFailed: 0,
        logs: [],
        metadata: {
          batchSync: true,
          scheduledTime
        }
      };

      // Store in database for persistence
      const { data, error } = await supabase
        .from('content_sync_jobs')
        .insert([job])
        .select()
        .single();

      if (error) throw error;

      // Add to queue if time is now, otherwise it will be picked up by scheduler
      if (new Date(scheduledTime) <= new Date()) {
        this.jobQueue.push(job);
        this.activeJobs.set(job.id, job);
      }

      return {
        success: true,
        data: job,
        metadata: {
          requestId: `batch_schedule_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_SCHEDULE_FAILED',
          message: `Batch scheduling failed: ${error.message}`,
          category: 'system',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<SyncJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<SchedulingApiResponse<boolean>> {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === 'running') {
        job.status = 'cancelled';
        job.completedAt = new Date().toISOString();
        job.logs.push(`Job cancelled at ${new Date().toISOString()}`);
      } else if (job.status === 'pending') {
        // Remove from queue
        const queueIndex = this.jobQueue.findIndex(j => j.id === jobId);
        if (queueIndex > -1) {
          this.jobQueue.splice(queueIndex, 1);
        }
        job.status = 'cancelled';
      }

      return {
        success: true,
        data: true,
        metadata: {
          requestId: `cancel_job_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JOB_CANCEL_FAILED',
          message: `Job cancellation failed: ${error.message}`,
          category: 'system',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get sync automation statistics
   */
  getAutomationStats(): {
    totalSchedules: number;
    activeSchedules: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageJobDuration: number;
  } {
    const jobs = Array.from(this.activeJobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');
    
    const totalDuration = completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
    const averageJobDuration = completedJobs.length > 0 ? totalDuration / completedJobs.length : 0;

    return {
      totalSchedules: this.schedules.size,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.isActive).length,
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageJobDuration
    };
  }

  // Private methods

  private async loadSchedules(): Promise<void> {
    const { data: schedules } = await supabase
      .from('content_sync_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedules) {
      schedules.forEach(schedule => {
        this.schedules.set(schedule.id, schedule);
      });
    }
  }

  private startJobProcessor(): void {
    // Process jobs every 30 seconds
    this.intervalId = setInterval(() => {
      this.processJobQueue();
    }, 30000);
  }

  private startScheduleChecker(): void {
    // Check schedules every minute
    setInterval(() => {
      this.checkSchedules();
    }, 60000);
  }

  private async processJobQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Process jobs in priority order
      this.jobQueue.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const job = this.jobQueue.shift();
      if (!job) return;

      await this.processJob(job);
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more jobs exist
      if (this.jobQueue.length > 0) {
        setTimeout(() => this.processJobQueue(), 1000);
      }
    }
  }

  private async processJob(job: SyncJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.logs.push(`Job started at ${job.startedAt}`);

    try {
      const startTime = Date.now();

      // Process content synchronization
      for (const contentId of job.contentIds) {
        if (job.status === 'cancelled') break;

        try {
          const result = await contentSynchronizationService.synchronizeContent(
            job.sourceGroupId,
            contentId,
            job.targetGroupIds
          );

          if (result.success) {
            job.itemsSuccessful++;
            job.logs.push(`Successfully synced content ${contentId}`);
          } else {
            job.itemsFailed++;
            job.logs.push(`Failed to sync content ${contentId}: ${result.error?.message}`);
          }
        } catch (error) {
          job.itemsFailed++;
          job.logs.push(`Error syncing content ${contentId}: ${error.message}`);
        }

        job.itemsProcessed++;
      }

      // Job completion
      job.completedAt = new Date().toISOString();
      job.duration = Date.now() - startTime;
      job.status = job.itemsFailed === 0 ? 'completed' : 'failed';
      job.logs.push(`Job ${job.status} at ${job.completedAt}`);

      // Update database
      await this.updateJobInDatabase(job);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
      job.logs.push(`Job failed: ${error.message}`);
      
      await this.updateJobInDatabase(job);
    }
  }

  private async updateJobInDatabase(job: SyncJob): Promise<void> {
    await supabase
      .from('content_sync_jobs')
      .upsert([job]);
  }

  private async checkSchedules(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.isActive || !schedule.nextRun) continue;

      const nextRun = new Date(schedule.nextRun);
      if (nextRun <= now) {
        await this.executeSchedule(schedule);
      }
    }
  }

  private async executeSchedule(schedule: SyncSchedule): Promise<void> {
    try {
      // Create job from schedule
      const job: SyncJob = {
        id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scheduleId: schedule.id,
        jobType: 'scheduled',
        status: 'pending',
        priority: 'medium',
        sourceGroupId: '', // This would be determined by schedule config
        targetGroupIds: [],
        contentIds: [],
        filters: schedule.filters,
        itemsProcessed: 0,
        itemsSuccessful: 0,
        itemsFailed: 0,
        logs: [`Schedule executed: ${schedule.name}`],
        metadata: {
          scheduleId: schedule.id,
          scheduleName: schedule.name
        }
      };

      // Add to queue
      this.jobQueue.push(job);
      this.activeJobs.set(job.id, job);

      // Update schedule
      schedule.lastRun = new Date().toISOString();
      schedule.nextRun = this.calculateNextRun(schedule);
      schedule.updatedAt = new Date().toISOString();

      await supabase
        .from('content_sync_schedules')
        .update({
          last_run: schedule.lastRun,
          next_run: schedule.nextRun,
          updated_at: schedule.updatedAt
        })
        .eq('id', schedule.id);

    } catch (error) {
      logger.error(`Failed to execute schedule ${schedule.id}:`, error);
    }
  }

  private calculateNextRun(schedule: SyncSchedule): string {
    const now = new Date();
    
    switch (schedule.scheduleType) {
      case 'interval':
        if (schedule.scheduleConfig.interval) {
          return new Date(now.getTime() + schedule.scheduleConfig.interval * 60000).toISOString();
        }
        break;
      case 'cron':
        // This would require a cron parser library
        // For now, return daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'event_driven':
        // Event-driven schedules don't have fixed next run times
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }

  private async applyFilters(sourceGroupId: string, options: SelectiveSyncOptions): Promise<any[]> {
    let query = supabase
      .from('contents')
      .select('*');

    // Apply content type filter
    if (options.contentTypes && options.contentTypes.length > 0) {
      query = query.in('category', options.contentTypes);
    }

    // Apply date range filter
    if (options.dateRange) {
      query = query
        .gte('updated_at', options.dateRange.start)
        .lte('updated_at', options.dateRange.end);
    }

    // Apply limit
    if (options.maxItems) {
      query = query.limit(options.maxItems);
    }

    const { data: contents } = await query;
    return contents || [];
  }

  private convertOptionsToFilters(options: SelectiveSyncOptions): SyncFilter[] {
    const filters: SyncFilter[] = [];

    if (options.contentTypes) {
      filters.push({
        field: 'category',
        operator: 'in',
        value: options.contentTypes,
        weight: 1.0
      });
    }

    if (options.dateRange) {
      filters.push({
        field: 'updated_at',
        operator: 'greater_than',
        value: options.dateRange.start,
        weight: 0.8
      });
    }

    if (options.priorities) {
      filters.push({
        field: 'priority',
        operator: 'in',
        value: options.priorities,
        weight: 1.0
      });
    }

    return filters;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Export singleton instance
export const contentSyncScheduler = new ContentSyncScheduler();