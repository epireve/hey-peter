// ========================================
// Popup Email Integration Service
// Email integration for lead nurturing and automation
// ========================================

import type {
  PopupLead,
  PopupEmailIntegration,
  EmailProvider,
  EmailApiConfig,
  FollowUpConfig
} from '@/types/popup-marketing';

// Email service interfaces
interface EmailContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  templateId?: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  listId?: string;
  segmentId?: string;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  content: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

// Base email service interface
abstract class EmailService {
  protected config: EmailApiConfig;

  constructor(config: EmailApiConfig) {
    this.config = config;
  }

  abstract addContact(contact: EmailContact, listId?: string): Promise<string>;
  abstract updateContact(contactId: string, updates: Partial<EmailContact>): Promise<void>;
  abstract removeContact(contactId: string, listId?: string): Promise<void>;
  abstract sendEmail(request: SendEmailRequest): Promise<string>;
  abstract createList(name: string, description?: string): Promise<string>;
  abstract addToList(contactId: string, listId: string): Promise<void>;
  abstract removeFromList(contactId: string, listId: string): Promise<void>;
  abstract getTemplates(): Promise<EmailTemplate[]>;
  abstract createAutomation(config: FollowUpConfig, listId?: string): Promise<string>;
}

// ========================================
// Mailchimp Service Implementation
// ========================================
class MailchimpService extends EmailService {
  private baseUrl: string;

  constructor(config: EmailApiConfig) {
    super(config);
    this.baseUrl = `https://${config.serverPrefix}.api.mailchimp.com/3.0`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `apikey ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.statusText}`);
    }

    return response.json();
  }

  async addContact(contact: EmailContact, listId?: string): Promise<string> {
    const data = {
      email_address: contact.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: contact.firstName || '',
        LNAME: contact.lastName || '',
        PHONE: contact.phone || '',
        ...(contact.customFields || {})
      },
      tags: contact.tags || []
    };

    const result = await this.makeRequest(`/lists/${listId}/members`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.id;
  }

  async updateContact(contactId: string, updates: Partial<EmailContact>): Promise<void> {
    // Implementation for updating contact
    throw new Error('Method not implemented');
  }

  async removeContact(contactId: string, listId?: string): Promise<void> {
    await this.makeRequest(`/lists/${listId}/members/${contactId}`, {
      method: 'DELETE'
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<string> {
    // Mailchimp transactional emails (Mandrill)
    const data = {
      message: {
        to: [{ email: request.to }],
        subject: request.subject,
        html: request.content,
        from_email: 'noreply@heypeteracademy.com',
        from_name: 'HeyPeter Academy'
      }
    };

    // Note: This would use Mandrill API for transactional emails
    const result = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: this.config.apiKey,
        ...data
      })
    });

    const response = await result.json();
    return response[0]?._id || '';
  }

  async createList(name: string, description?: string): Promise<string> {
    const data = {
      name,
      contact: {
        company: 'HeyPeter Academy',
        address1: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      },
      permission_reminder: description || 'You subscribed to our marketing list',
      campaign_defaults: {
        from_name: 'HeyPeter Academy',
        from_email: 'noreply@heypeteracademy.com',
        subject: '',
        language: 'en'
      }
    };

    const result = await this.makeRequest('/lists', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.id;
  }

  async addToList(contactId: string, listId: string): Promise<void> {
    // Implementation for adding contact to list
    throw new Error('Method not implemented');
  }

  async removeFromList(contactId: string, listId: string): Promise<void> {
    // Implementation for removing contact from list
    throw new Error('Method not implemented');
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    const result = await this.makeRequest('/templates');
    return result.templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      subject: template.subject || '',
      content: template.source_code || '',
      templateId: template.id
    }));
  }

  async createAutomation(config: FollowUpConfig, listId?: string): Promise<string> {
    // Implementation for creating email automation
    throw new Error('Method not implemented');
  }
}

// ========================================
// SendGrid Service Implementation
// ========================================
class SendGridService extends EmailService {
  private baseUrl = 'https://api.sendgrid.com/v3';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.statusText}`);
    }

    return response.json();
  }

  async addContact(contact: EmailContact, listId?: string): Promise<string> {
    const data = {
      contacts: [{
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        phone_number: contact.phone,
        custom_fields: contact.customFields || {}
      }]
    };

    const result = await this.makeRequest('/marketing/contacts', {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    const contactId = result.job_id;

    // Add to list if specified
    if (listId && contactId) {
      await this.addToList(contactId, listId);
    }

    return contactId;
  }

  async updateContact(contactId: string, updates: Partial<EmailContact>): Promise<void> {
    const data = {
      contacts: [{
        id: contactId,
        email: updates.email,
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone_number: updates.phone,
        custom_fields: updates.customFields || {}
      }]
    };

    await this.makeRequest('/marketing/contacts', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async removeContact(contactId: string, listId?: string): Promise<void> {
    await this.makeRequest(`/marketing/contacts?ids=${contactId}`, {
      method: 'DELETE'
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<string> {
    const data = {
      personalizations: [{
        to: [{ email: request.to }],
        dynamic_template_data: request.templateData || {}
      }],
      from: {
        email: 'noreply@heypeteracademy.com',
        name: 'HeyPeter Academy'
      },
      subject: request.subject,
      content: [{
        type: 'text/html',
        value: request.content
      }],
      template_id: request.templateId
    };

    const result = await this.makeRequest('/mail/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.message_id || '';
  }

  async createList(name: string, description?: string): Promise<string> {
    const data = { name };
    const result = await this.makeRequest('/marketing/lists', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.id;
  }

  async addToList(contactId: string, listId: string): Promise<void> {
    const data = { list_ids: [listId] };
    await this.makeRequest(`/marketing/lists/${listId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async removeFromList(contactId: string, listId: string): Promise<void> {
    await this.makeRequest(`/marketing/lists/${listId}/contacts?contact_ids=${contactId}`, {
      method: 'DELETE'
    });
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    const result = await this.makeRequest('/templates');
    return result.templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      subject: template.subject || '',
      content: template.html_content || '',
      templateId: template.id
    }));
  }

  async createAutomation(config: FollowUpConfig, listId?: string): Promise<string> {
    // SendGrid automation implementation
    throw new Error('Method not implemented');
  }
}

// ========================================
// HubSpot Service Implementation
// ========================================
class HubSpotService extends EmailService {
  private baseUrl = 'https://api.hubapi.com';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }

    return response.json();
  }

  async addContact(contact: EmailContact, listId?: string): Promise<string> {
    const data = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        phone: contact.phone,
        company: contact.company,
        ...contact.customFields
      }
    };

    const result = await this.makeRequest('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.id;
  }

  async updateContact(contactId: string, updates: Partial<EmailContact>): Promise<void> {
    const data = {
      properties: {
        email: updates.email,
        firstname: updates.firstName,
        lastname: updates.lastName,
        phone: updates.phone,
        company: updates.company,
        ...updates.customFields
      }
    };

    await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async removeContact(contactId: string, listId?: string): Promise<void> {
    await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'DELETE'
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<string> {
    // HubSpot transactional email implementation
    throw new Error('Method not implemented');
  }

  async createList(name: string, description?: string): Promise<string> {
    const data = {
      name,
      dynamic: false,
      filters: []
    };

    const result = await this.makeRequest('/contacts/v1/lists', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return result.listId.toString();
  }

  async addToList(contactId: string, listId: string): Promise<void> {
    const data = { vids: [contactId] };
    await this.makeRequest(`/contacts/v1/lists/${listId}/add`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async removeFromList(contactId: string, listId: string): Promise<void> {
    const data = { vids: [contactId] };
    await this.makeRequest(`/contacts/v1/lists/${listId}/remove`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    // HubSpot template implementation
    throw new Error('Method not implemented');
  }

  async createAutomation(config: FollowUpConfig, listId?: string): Promise<string> {
    // HubSpot workflow implementation
    throw new Error('Method not implemented');
  }
}

// ========================================
// Email Integration Service
// ========================================
export class PopupEmailIntegrationService {
  private services: Map<EmailProvider, EmailService> = new Map();

  /**
   * Register email service
   */
  registerService(provider: EmailProvider, config: EmailApiConfig): void {
    let service: EmailService;

    switch (provider) {
      case 'mailchimp':
        service = new MailchimpService(config);
        break;
      case 'sendgrid':
        service = new SendGridService(config);
        break;
      case 'hubspot':
        service = new HubSpotService(config);
        break;
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }

    this.services.set(provider, service);
  }

  /**
   * Process lead submission with email integration
   */
  async processLead(
    lead: PopupLead,
    integration: PopupEmailIntegration
  ): Promise<void> {
    const service = this.services.get(integration.email_provider);
    if (!service) {
      throw new Error(`Email service not configured for ${integration.email_provider}`);
    }

    try {
      // Create contact
      const contact: EmailContact = {
        email: lead.email,
        firstName: lead.first_name,
        lastName: lead.last_name,
        phone: lead.phone,
        company: lead.company,
        tags: [
          `campaign_${integration.campaign_id}`,
          ...integration.segment_tags
        ],
        customFields: {
          lead_source: lead.lead_source,
          lead_score: lead.lead_score,
          interests: lead.interests.join(','),
          course_preferences: lead.course_preferences.join(','),
          marketing_consent: lead.marketing_consent
        }
      };

      const contactId = await service.addContact(contact, integration.mailing_list_id);

      // Send welcome email if enabled
      if (integration.welcome_email_enabled && integration.welcome_email_template_id) {
        await this.sendWelcomeEmail(service, lead, integration.welcome_email_template_id);
      }

      // Setup follow-up sequence if enabled
      if (integration.follow_up_sequence_enabled && integration.follow_up_config) {
        await this.setupFollowUpSequence(service, contactId, integration.follow_up_config);
      }

      // Update integration sync status
      await this.updateSyncStatus(integration.id, true);

    } catch (error) {
      console.error('Error processing lead with email integration:', error);
      await this.updateSyncStatus(integration.id, false, error.message);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(
    service: EmailService,
    lead: PopupLead,
    templateId: string
  ): Promise<void> {
    const templateData = {
      first_name: lead.first_name || 'Student',
      last_name: lead.last_name || '',
      interests: lead.interests,
      course_preferences: lead.course_preferences
    };

    await service.sendEmail({
      to: lead.email,
      subject: 'Welcome to HeyPeter Academy!',
      content: '', // Will use template
      templateId,
      templateData
    });
  }

  /**
   * Setup follow-up email sequence
   */
  private async setupFollowUpSequence(
    service: EmailService,
    contactId: string,
    config: FollowUpConfig
  ): Promise<void> {
    // Schedule follow-up emails based on configuration
    for (const [index, followUp] of config.sequence.entries()) {
      setTimeout(async () => {
        try {
          await service.sendEmail({
            to: '', // Will be resolved by service
            subject: followUp.subject,
            content: '',
            templateId: followUp.templateId
          });
        } catch (error) {
          console.error(`Error sending follow-up email ${index + 1}:`, error);
        }
      }, followUp.delay * 60 * 60 * 1000); // Convert hours to milliseconds
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    integrationId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    // Update database record
    // This would typically use your database service
    console.log(`Email sync ${success ? 'successful' : 'failed'} for integration ${integrationId}`, error);
  }

  /**
   * Sync all pending leads
   */
  async syncPendingLeads(): Promise<void> {
    // Implementation to sync leads that failed initial processing
    throw new Error('Method not implemented');
  }

  /**
   * Test email integration
   */
  async testIntegration(
    provider: EmailProvider,
    config: EmailApiConfig
  ): Promise<boolean> {
    try {
      this.registerService(provider, config);
      const service = this.services.get(provider);
      
      if (!service) {
        return false;
      }

      // Try to get templates as a simple test
      await service.getTemplates();
      return true;

    } catch (error) {
      console.error('Email integration test failed:', error);
      return false;
    }
  }

  /**
   * Get available templates
   */
  async getTemplates(provider: EmailProvider): Promise<EmailTemplate[]> {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Email service not configured for ${provider}`);
    }

    return service.getTemplates();
  }

  /**
   * Create mailing list
   */
  async createMailingList(
    provider: EmailProvider,
    name: string,
    description?: string
  ): Promise<string> {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Email service not configured for ${provider}`);
    }

    return service.createList(name, description);
  }
}

// Export singleton instance
export const popupEmailIntegrationService = new PopupEmailIntegrationService();