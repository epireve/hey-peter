import { loggingService, LogCategory } from './logging-service';
import { errorTrackingService } from './error-tracking-service';

export interface UserAction {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: string;
  type: UserActionType;
  component?: string;
  element?: string;
  page: string;
  action: string;
  data?: Record<string, any>;
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    url: string;
    referrer?: string;
    deviceType: 'desktop' | 'tablet' | 'mobile';
    os?: string;
    browser?: string;
  };
  performance?: {
    timestamp: number;
    duration?: number;
  };
  sequence: number;
}

export enum UserActionType {
  CLICK = 'click',
  INPUT = 'input',
  SUBMIT = 'submit',
  NAVIGATION = 'navigation',
  SCROLL = 'scroll',
  RESIZE = 'resize',
  FOCUS = 'focus',
  BLUR = 'blur',
  HOVER = 'hover',
  KEY_PRESS = 'key_press',
  FORM_INTERACTION = 'form_interaction',
  MODAL_INTERACTION = 'modal_interaction',
  API_CALL = 'api_call',
  ERROR = 'error',
  CUSTOM = 'custom'
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  actionsCount: number;
  errorCount: number;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  referrer?: string;
  exitPage?: string;
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  steps: Array<{
    page: string;
    timestamp: string;
    duration: number;
    actions: UserAction[];
    errors: number;
  }>;
  totalDuration: number;
  conversionPoints: string[];
  dropOffPoint?: string;
}

class UserActionTrackingService {
  private actions: UserAction[] = [];
  private currentSession: UserSession | null = null;
  private actionSequence = 0;
  private bufferSize = 100;
  private flushInterval = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;
  private isTracking = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSession();
      this.setupEventListeners();
      this.startAutoFlush();
    }
  }

  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    const userAgent = navigator.userAgent;
    const deviceType = this.detectDeviceType();
    const browserInfo = this.parseBrowserInfo(userAgent);

    this.currentSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      pageViews: 1,
      actionsCount: 0,
      errorCount: 0,
      browser: browserInfo.browser,
      os: browserInfo.os,
      deviceType,
      referrer: document.referrer || undefined
    };

    // Store session ID for cross-tab consistency
    sessionStorage.setItem('user_tracking_session_id', sessionId);

    // Track session start
    this.trackAction(UserActionType.NAVIGATION, 'session_start', undefined, undefined, {
      isNewSession: true
    });
  }

  private generateSessionId(): string {
    const existing = sessionStorage.getItem('user_tracking_session_id');
    if (existing) return existing;
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  private parseBrowserInfo(userAgent: string): { browser: string; os: string } {
    const browser = this.getBrowserName(userAgent);
    const os = this.getOSName(userAgent);
    return { browser, os };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getOSName(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Macintosh')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private setupEventListeners(): void {
    // Click tracking
    document.addEventListener('click', this.handleClick.bind(this), { capture: true });

    // Form interactions
    document.addEventListener('submit', this.handleSubmit.bind(this), { capture: true });
    document.addEventListener('input', this.handleInput.bind(this), { capture: true });
    document.addEventListener('change', this.handleChange.bind(this), { capture: true });

    // Navigation
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('popstate', this.handlePopState.bind(this));

    // Scroll tracking (throttled)
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.handleScroll();
      }, 150);
    });

    // Resize tracking
    window.addEventListener('resize', this.handleResize.bind(this));

    // Focus and blur
    window.addEventListener('focus', () => this.trackAction(UserActionType.FOCUS, 'window_focus'));
    window.addEventListener('blur', () => this.trackAction(UserActionType.BLUR, 'window_blur'));

    // Key press tracking (for important keys)
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Error tracking
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const elementInfo = this.getElementInfo(target);
    
    this.trackAction(UserActionType.CLICK, 'element_click', elementInfo.component, elementInfo.element, {
      coordinates: { x: event.clientX, y: event.clientY },
      button: event.button,
      ...elementInfo.data
    });
  }

  private handleSubmit(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;
    const formInfo = this.getFormInfo(form);
    
    this.trackAction(UserActionType.SUBMIT, 'form_submit', 'form', formInfo.name || formInfo.id, {
      formData: formInfo.data,
      fieldCount: formInfo.fieldCount
    });
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.name && !target.id) return; // Skip unnamed inputs

    const elementInfo = this.getElementInfo(target);
    
    // Don't log actual input values for privacy
    this.trackAction(UserActionType.INPUT, 'input_change', elementInfo.component, elementInfo.element, {
      inputType: target.type,
      inputLength: target.value.length,
      hasValue: target.value.length > 0
    });
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement | HTMLInputElement;
    const elementInfo = this.getElementInfo(target);
    
    this.trackAction(UserActionType.FORM_INTERACTION, 'input_change', elementInfo.component, elementInfo.element, {
      inputType: (target as HTMLInputElement).type || 'select',
      hasValue: target.value.length > 0
    });
  }

  private handleBeforeUnload(): void {
    this.flushBuffer();
    this.endSession();
  }

  private handlePopState(): void {
    this.trackAction(UserActionType.NAVIGATION, 'browser_navigation', undefined, undefined, {
      url: window.location.href,
      method: 'popstate'
    });
  }

  private handleScroll(): void {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    
    this.trackAction(UserActionType.SCROLL, 'page_scroll', undefined, undefined, {
      scrollTop: window.scrollY,
      scrollPercent: Math.min(scrollPercent, 100),
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight
    });
  }

  private handleResize(): void {
    this.trackAction(UserActionType.RESIZE, 'window_resize', undefined, undefined, {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      deviceType: this.detectDeviceType()
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Only track important keys
    const importantKeys = ['Enter', 'Escape', 'Tab', 'Space'];
    if (importantKeys.includes(event.key)) {
      this.trackAction(UserActionType.KEY_PRESS, 'key_press', undefined, undefined, {
        key: event.key,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey
      });
    }
  }

  private handleError(event: ErrorEvent): void {
    this.trackAction(UserActionType.ERROR, 'javascript_error', undefined, undefined, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });

    if (this.currentSession) {
      this.currentSession.errorCount++;
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.trackAction(UserActionType.ERROR, 'unhandled_promise_rejection', undefined, undefined, {
      reason: String(event.reason)
    });

    if (this.currentSession) {
      this.currentSession.errorCount++;
    }
  }

  private getElementInfo(element: HTMLElement): { component?: string; element?: string; data?: Record<string, any> } {
    // Extract component info from data attributes or class names
    const component = element.getAttribute('data-component') || 
                     element.closest('[data-component]')?.getAttribute('data-component');
    
    const elementId = element.id || element.getAttribute('data-testid') || element.className.split(' ')[0];
    
    const data: Record<string, any> = {};
    
    // Extract relevant attributes
    if (element.tagName === 'BUTTON') {
      data.buttonType = element.getAttribute('type') || 'button';
      data.disabled = element.hasAttribute('disabled');
    }
    
    if (element.tagName === 'A') {
      data.href = element.getAttribute('href');
      data.target = element.getAttribute('target');
    }

    // Extract data attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-track-')) {
        data[attr.name.replace('data-track-', '')] = attr.value;
      }
    });

    return { component, element: elementId, data };
  }

  private getFormInfo(form: HTMLFormElement): { name?: string; id?: string; data: Record<string, any>; fieldCount: number } {
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    let fieldCount = 0;

    // Don't log actual form values, just field names and types
    for (const [key] of formData.entries()) {
      const field = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
      data[key] = {
        type: field?.type || 'unknown',
        required: field?.required || false,
        hasValue: field?.value.length > 0
      };
      fieldCount++;
    }

    return {
      name: form.getAttribute('name') || undefined,
      id: form.id || undefined,
      data,
      fieldCount
    };
  }

  // Public methods for tracking custom actions
  trackAction(
    type: UserActionType,
    action: string,
    component?: string,
    element?: string,
    data?: Record<string, any>
  ): void {
    if (!this.isTracking || !this.currentSession) return;

    const actionId = this.generateActionId();
    const timestamp = new Date().toISOString();
    
    const userAction: UserAction = {
      id: actionId,
      sessionId: this.currentSession.id,
      userId: this.getCurrentUserId(),
      timestamp,
      type,
      component,
      element,
      page: this.getCurrentPage(),
      action,
      data,
      metadata: {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        url: window.location.href,
        referrer: document.referrer || undefined,
        deviceType: this.detectDeviceType(),
        os: this.currentSession.os,
        browser: this.currentSession.browser
      },
      performance: {
        timestamp: performance.now()
      },
      sequence: ++this.actionSequence
    };

    this.actions.push(userAction);
    this.currentSession.actionsCount++;

    // Add to error tracking breadcrumbs
    errorTrackingService.addBreadcrumb(
      'User Action',
      `${type}: ${action}`,
      {
        component,
        element,
        page: userAction.page,
        sequence: userAction.sequence
      }
    );

    // Log user action
    loggingService.logUserAction(
      `${type}: ${action}`,
      {
        actionId,
        sessionId: this.currentSession.id,
        component,
        element,
        sequence: userAction.sequence
      }
    );

    // Auto-flush if buffer is full
    if (this.actions.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    return localStorage.getItem('user_id') || undefined;
  }

  private getCurrentPage(): string {
    return window.location.pathname;
  }

  // Track page navigation
  trackPageView(page?: string): void {
    const pageName = page || this.getCurrentPage();
    
    this.trackAction(UserActionType.NAVIGATION, 'page_view', undefined, undefined, {
      page: pageName,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });

    if (this.currentSession) {
      this.currentSession.pageViews++;
    }
  }

  // Track API calls
  trackAPICall(method: string, endpoint: string, statusCode: number, duration: number, data?: Record<string, any>): void {
    this.trackAction(UserActionType.API_CALL, 'api_request', 'api', endpoint, {
      method,
      statusCode,
      duration,
      success: statusCode < 400,
      ...data
    });
  }

  // Track custom events
  trackCustomEvent(name: string, data?: Record<string, any>): void {
    this.trackAction(UserActionType.CUSTOM, name, undefined, undefined, data);
  }

  // Flush actions to server
  private async flushBuffer(): Promise<void> {
    if (this.actions.length === 0) return;

    const actionsToFlush = [...this.actions];
    this.actions = [];

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { error } = await supabase
        .from('user_actions')
        .insert(actionsToFlush);

      if (error) {
        console.error('Failed to flush user actions:', error);
        // Re-add actions to buffer if flush failed
        this.actions.unshift(...actionsToFlush);
      }
    } catch (error) {
      console.error('Error flushing user actions:', error);
      // Re-add actions to buffer if flush failed
      this.actions.unshift(...actionsToFlush);
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  private endSession(): void {
    if (!this.currentSession) return;

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(this.currentSession.startTime).getTime();

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.exitPage = this.getCurrentPage();

    // Store session data
    this.storeSession(this.currentSession);
  }

  private async storeSession(session: UserSession): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      await supabase
        .from('user_sessions')
        .insert(session);
    } catch (error) {
      console.error('Failed to store user session:', error);
    }
  }

  // Control tracking
  enableTracking(): void {
    this.isTracking = true;
  }

  disableTracking(): void {
    this.isTracking = false;
  }

  // Get current session info
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  // Get user journey
  async getUserJourney(sessionId: string): Promise<UserJourney | null> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: actions } = await supabase
        .from('user_actions')
        .select('*')
        .eq('sessionId', sessionId)
        .order('sequence');

      if (!actions || actions.length === 0) return null;

      // Group actions by page
      const pageGroups = new Map<string, UserAction[]>();
      actions.forEach(action => {
        const page = action.page;
        if (!pageGroups.has(page)) {
          pageGroups.set(page, []);
        }
        pageGroups.get(page)!.push(action);
      });

      // Create journey steps
      const steps = Array.from(pageGroups.entries()).map(([page, pageActions]) => {
        const firstAction = pageActions[0];
        const lastAction = pageActions[pageActions.length - 1];
        const duration = new Date(lastAction.timestamp).getTime() - new Date(firstAction.timestamp).getTime();
        const errors = pageActions.filter(a => a.type === UserActionType.ERROR).length;

        return {
          page,
          timestamp: firstAction.timestamp,
          duration,
          actions: pageActions,
          errors
        };
      });

      const totalDuration = new Date(actions[actions.length - 1].timestamp).getTime() - 
                           new Date(actions[0].timestamp).getTime();

      // Identify conversion points (form submissions, purchases, etc.)
      const conversionPoints = actions
        .filter(a => a.type === UserActionType.SUBMIT || a.action.includes('purchase') || a.action.includes('signup'))
        .map(a => a.page);

      return {
        sessionId,
        userId: actions[0].userId,
        steps,
        totalDuration,
        conversionPoints,
        dropOffPoint: this.identifyDropOffPoint(steps)
      };
    } catch (error) {
      console.error('Failed to get user journey:', error);
      return null;
    }
  }

  private identifyDropOffPoint(steps: UserJourney['steps']): string | undefined {
    // Simple heuristic: if the user spent less than 10 seconds on a page and it's not the last page
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].duration < 10000 && steps[i].errors > 0) {
        return steps[i].page;
      }
    }
    return undefined;
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
    this.endSession();
  }
}

// Export singleton instance
export const userActionTrackingService = new UserActionTrackingService();
export default userActionTrackingService;