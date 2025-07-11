// ========================================
// Popup Trigger Engine
// Intelligent popup trigger system based on user behavior
// ========================================

import type {
  TriggerType,
  TriggerRule,
  TriggerConfig,
  DeviceInfo,
  GeoInfo,
  PopupVariation
} from '@/types/popup-marketing';

interface VisitorSession {
  sessionId: string;
  visitorId: string;
  startTime: number;
  pageViews: number;
  timeOnPage: number;
  scrollProgress: number;
  mouseMovements: number;
  keystrokes: number;
  idleTime: number;
  referrer?: string;
  deviceInfo: DeviceInfo;
  geoInfo?: GeoInfo;
  isReturningVisitor: boolean;
  previousSessions: number;
  lastVisit?: number;
}

interface TriggerState {
  triggered: boolean;
  triggerTime?: number;
  triggerValue?: any;
  conditions: Record<string, boolean>;
}

export class PopupTriggerEngine {
  private session: VisitorSession;
  private triggerStates: Map<string, TriggerState> = new Map();
  private observers: Set<() => void> = new Set();
  private intervalId?: NodeJS.Timeout;
  private scrollListener?: () => void;
  private mouseListener?: () => void;
  private keyListener?: () => void;
  private idleTimeout?: NodeJS.Timeout;
  private exitIntentListener?: (e: MouseEvent) => void;

  constructor(session: VisitorSession) {
    this.session = session;
    this.initializeListeners();
  }

  // ========================================
  // Initialization and Cleanup
  // ========================================

  private initializeListeners(): void {
    // Scroll tracking
    this.scrollListener = this.throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.session.scrollProgress = Math.round((scrollTop / documentHeight) * 100);
    }, 100);

    // Mouse movement tracking
    this.mouseListener = this.throttle(() => {
      this.session.mouseMovements++;
      this.resetIdleTimer();
    }, 500);

    // Keystroke tracking
    this.keyListener = () => {
      this.session.keystrokes++;
      this.resetIdleTimer();
    };

    // Exit intent detection
    this.exitIntentListener = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        this.checkTrigger('exit_intent', { mouseY: e.clientY });
      }
    };

    // Add event listeners
    window.addEventListener('scroll', this.scrollListener);
    document.addEventListener('mousemove', this.mouseListener);
    document.addEventListener('keydown', this.keyListener);
    document.addEventListener('mouseleave', this.exitIntentListener);

    // Start session timer
    this.intervalId = setInterval(() => {
      this.session.timeOnPage += 1000;
      this.checkTimeBased Triggers();
    }, 1000);

    // Initialize idle timer
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    
    this.session.idleTime = 0;
    this.idleTimeout = setTimeout(() => {
      this.session.idleTime += 30000; // 30 seconds idle
    }, 30000);
  }

  private throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function(this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  public cleanup(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.mouseListener) {
      document.removeEventListener('mousemove', this.mouseListener);
    }
    if (this.keyListener) {
      document.removeEventListener('keydown', this.keyListener);
    }
    if (this.exitIntentListener) {
      document.removeEventListener('mouseleave', this.exitIntentListener);
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
  }

  // ========================================
  // Trigger Registration and Management
  // ========================================

  public registerTrigger(
    triggerId: string,
    rules: TriggerRule[],
    callback: (triggerData: any) => void
  ): void {
    this.triggerStates.set(triggerId, {
      triggered: false,
      conditions: {}
    });

    // Subscribe to trigger events
    this.observers.add(() => {
      const shouldTrigger = this.evaluateTriggerRules(triggerId, rules);
      if (shouldTrigger && !this.triggerStates.get(triggerId)?.triggered) {
        const state = this.triggerStates.get(triggerId)!;
        state.triggered = true;
        state.triggerTime = Date.now();
        callback(state.triggerValue);
      }
    });
  }

  public unregisterTrigger(triggerId: string): void {
    this.triggerStates.delete(triggerId);
  }

  // ========================================
  // Trigger Evaluation Logic
  // ========================================

  private evaluateTriggerRules(triggerId: string, rules: TriggerRule[]): boolean {
    const state = this.triggerStates.get(triggerId);
    if (!state || state.triggered) return false;

    let allConditionsMet = true;

    for (const rule of rules) {
      const conditionMet = this.evaluateTriggerRule(rule);
      state.conditions[rule.type] = conditionMet;
      
      if (!conditionMet) {
        allConditionsMet = false;
      }
    }

    return allConditionsMet;
  }

  private evaluateTriggerRule(rule: TriggerRule): boolean {
    switch (rule.type) {
      case 'time_delay':
        return this.checkTimeDelay(rule.config);
      
      case 'scroll_percentage':
        return this.checkScrollPercentage(rule.config);
      
      case 'exit_intent':
        return this.checkExitIntent(rule.config);
      
      case 'page_visit_count':
        return this.checkPageVisitCount(rule.config);
      
      case 'session_duration':
        return this.checkSessionDuration(rule.config);
      
      case 'specific_page':
        return this.checkSpecificPage(rule.config);
      
      case 'referrer_source':
        return this.checkReferrerSource(rule.config);
      
      case 'device_type':
        return this.checkDeviceType(rule.config);
      
      case 'returning_visitor':
        return this.checkReturningVisitor(rule.config);
      
      case 'first_time_visitor':
        return this.checkFirstTimeVisitor(rule.config);
      
      case 'geographic_location':
        return this.checkGeographicLocation(rule.config);
      
      default:
        return false;
    }
  }

  // ========================================
  // Individual Trigger Checks
  // ========================================

  private checkTimeDelay(config: TriggerConfig): boolean {
    const delay = config.delay || 5000;
    return this.session.timeOnPage >= delay;
  }

  private checkScrollPercentage(config: TriggerConfig): boolean {
    const percentage = config.percentage || 50;
    return this.session.scrollProgress >= percentage;
  }

  private checkExitIntent(config: TriggerConfig): boolean {
    // Exit intent is triggered via mouse leave event
    return false; // Will be set via checkTrigger method
  }

  private checkPageVisitCount(config: TriggerConfig): boolean {
    const count = config.count || 3;
    return this.session.pageViews >= count;
  }

  private checkSessionDuration(config: TriggerConfig): boolean {
    const duration = config.duration || 120000; // 2 minutes
    return this.session.timeOnPage >= duration;
  }

  private checkSpecificPage(config: TriggerConfig): boolean {
    const currentUrl = window.location.href;
    
    if (config.pageUrls && config.pageUrls.length > 0) {
      return config.pageUrls.some(url => currentUrl.includes(url));
    }
    
    if (config.urlPattern) {
      const regex = new RegExp(config.urlPattern);
      return regex.test(currentUrl);
    }
    
    return false;
  }

  private checkReferrerSource(config: TriggerConfig): boolean {
    const referrer = this.session.referrer || document.referrer;
    
    if (config.referrerUrls && config.referrerUrls.length > 0) {
      return config.referrerUrls.some(url => referrer.includes(url));
    }
    
    if (config.referrerDomains && config.referrerDomains.length > 0) {
      try {
        const referrerDomain = new URL(referrer).hostname;
        return config.referrerDomains.includes(referrerDomain);
      } catch {
        return false;
      }
    }
    
    return false;
  }

  private checkDeviceType(config: TriggerConfig): boolean {
    const deviceTypes = config.deviceTypes || [];
    return deviceTypes.includes(this.session.deviceInfo.type);
  }

  private checkReturningVisitor(config: TriggerConfig): boolean {
    if (config.excludeFirstTime) {
      return this.session.isReturningVisitor;
    }
    return true;
  }

  private checkFirstTimeVisitor(config: TriggerConfig): boolean {
    if (config.excludeReturning) {
      return !this.session.isReturningVisitor;
    }
    return true;
  }

  private checkGeographicLocation(config: TriggerConfig): boolean {
    if (!this.session.geoInfo) return false;
    
    const geo = this.session.geoInfo;
    
    if (config.countries && config.countries.length > 0) {
      return config.countries.includes(geo.country || '');
    }
    
    if (config.regions && config.regions.length > 0) {
      return config.regions.includes(geo.region || '');
    }
    
    return false;
  }

  // ========================================
  // Event Handlers
  // ========================================

  private checkTimeBased Triggers(): void {
    this.notifyObservers();
  }

  private checkTrigger(type: TriggerType, data: any): void {
    // Find triggers that match this type and update their state
    for (const [triggerId, state] of this.triggerStates) {
      if (!state.triggered) {
        state.triggerValue = data;
        this.notifyObservers();
      }
    }
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer());
  }

  // ========================================
  // Session Management
  // ========================================

  public updatePageView(): void {
    this.session.pageViews++;
    this.session.timeOnPage = 0; // Reset time on page for new page
    this.notifyObservers();
  }

  public updateSession(updates: Partial<VisitorSession>): void {
    Object.assign(this.session, updates);
    this.notifyObservers();
  }

  public getSessionData(): VisitorSession {
    return { ...this.session };
  }

  // ========================================
  // Advanced Trigger Logic
  // ========================================

  /**
   * Check if variation should be shown based on trigger rules
   */
  public shouldShowVariation(variation: PopupVariation): boolean {
    if (variation.trigger_rules.length === 0) return true;

    // Evaluate all trigger rules for this variation
    return variation.trigger_rules.every(rule => this.evaluateTriggerRule(rule));
  }

  /**
   * Get the most appropriate trigger type for current session
   */
  public getRecommendedTrigger(): TriggerType {
    const timeOnPage = this.session.timeOnPage;
    const scrollProgress = this.session.scrollProgress;
    const isReturning = this.session.isReturningVisitor;
    const pageViews = this.session.pageViews;

    // Logic to recommend best trigger based on behavior
    if (timeOnPage < 5000) {
      return 'time_delay';
    } else if (scrollProgress > 70) {
      return 'scroll_percentage';
    } else if (pageViews > 2) {
      return 'page_visit_count';
    } else if (isReturning) {
      return 'returning_visitor';
    } else {
      return 'exit_intent';
    }
  }

  /**
   * Calculate engagement score for targeting
   */
  public calculateEngagementScore(): number {
    let score = 0;

    // Time on page (max 25 points)
    score += Math.min(this.session.timeOnPage / 1000 / 60 * 5, 25);

    // Scroll progress (max 20 points)
    score += (this.session.scrollProgress / 100) * 20;

    // Mouse movements (max 15 points)
    score += Math.min(this.session.mouseMovements / 100 * 15, 15);

    // Keystrokes (max 15 points)
    score += Math.min(this.session.keystrokes / 50 * 15, 15);

    // Page views (max 15 points)
    score += Math.min(this.session.pageViews * 3, 15);

    // Returning visitor bonus (10 points)
    if (this.session.isReturningVisitor) {
      score += 10;
    }

    return Math.round(score);
  }

  /**
   * Check if user is likely to convert based on behavior
   */
  public isHighConversionProbability(): boolean {
    const engagementScore = this.calculateEngagementScore();
    const timeOnPage = this.session.timeOnPage;
    const scrollProgress = this.session.scrollProgress;

    return (
      engagementScore > 50 ||
      (timeOnPage > 60000 && scrollProgress > 50) ||
      (this.session.isReturningVisitor && timeOnPage > 30000)
    );
  }

  // ========================================
  // Frequency Capping
  // ========================================

  /**
   * Check if frequency cap allows showing popup
   */
  public checkFrequencyCap(
    campaignId: string,
    maxPerDay: number = 1,
    maxPerWeek: number = 3
  ): boolean {
    const storageKey = `popup_frequency_${campaignId}`;
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    try {
      const stored = localStorage.getItem(storageKey);
      const data = stored ? JSON.parse(stored) : { daily: {}, weekly: {} };

      // Check daily cap
      const dailyCount = data.daily[today] || 0;
      if (dailyCount >= maxPerDay) return false;

      // Check weekly cap
      const weekKey = weekStart.toISOString();
      const weeklyCount = data.weekly[weekKey] || 0;
      if (weeklyCount >= maxPerWeek) return false;

      // Update counts
      data.daily[today] = dailyCount + 1;
      data.weekly[weekKey] = weeklyCount + 1;

      // Clean old data
      Object.keys(data.daily).forEach(date => {
        if (new Date(date).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) {
          delete data.daily[date];
        }
      });

      Object.keys(data.weekly).forEach(week => {
        if (new Date(week).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
          delete data.weekly[week];
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch {
      return true; // Allow if localStorage fails
    }
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create visitor session from browser data
 */
export function createVisitorSession(
  sessionId: string,
  visitorId: string
): VisitorSession {
  // Detect device type
  const userAgent = navigator.userAgent;
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'mobile';
  }

  const deviceInfo: DeviceInfo = {
    type: deviceType,
    os: getOS(),
    browser: getBrowser(),
    screenWidth: screen.width,
    screenHeight: screen.height,
    userAgent
  };

  // Check if returning visitor
  const lastVisit = localStorage.getItem('last_visit');
  const isReturning = !!lastVisit;
  const previousSessions = parseInt(localStorage.getItem('session_count') || '0');

  // Update session count
  localStorage.setItem('session_count', String(previousSessions + 1));
  localStorage.setItem('last_visit', new Date().toISOString());

  return {
    sessionId,
    visitorId,
    startTime: Date.now(),
    pageViews: 1,
    timeOnPage: 0,
    scrollProgress: 0,
    mouseMovements: 0,
    keystrokes: 0,
    idleTime: 0,
    referrer: document.referrer,
    deviceInfo,
    isReturningVisitor: isReturning,
    previousSessions,
    lastVisit: lastVisit ? new Date(lastVisit).getTime() : undefined
  };
}

function getOS(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('Win') !== -1) return 'Windows';
  if (userAgent.indexOf('Mac') !== -1) return 'macOS';
  if (userAgent.indexOf('Linux') !== -1) return 'Linux';
  if (userAgent.indexOf('Android') !== -1) return 'Android';
  if (userAgent.indexOf('iOS') !== -1) return 'iOS';
  return 'Unknown';
}

function getBrowser(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
  if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
  if (userAgent.indexOf('Safari') !== -1) return 'Safari';
  if (userAgent.indexOf('Edge') !== -1) return 'Edge';
  if (userAgent.indexOf('Opera') !== -1) return 'Opera';
  return 'Unknown';
}