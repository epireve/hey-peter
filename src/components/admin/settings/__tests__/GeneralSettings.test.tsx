import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneralSettings } from '../GeneralSettings';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

const { toast } = require('@/components/ui/use-toast');

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders general settings interface correctly', () => {
    render(<GeneralSettings />);
    
    expect(screen.getByText('Site Information')).toBeInTheDocument();
    expect(screen.getByText('Regional Settings')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('displays default site information values', () => {
    render(<GeneralSettings />);
    
    expect(screen.getByDisplayValue('HeyPeter Academy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Premium English learning platform for professionals')).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin@heypeter.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('support@heypeter.com')).toBeInTheDocument();
  });

  it('updates site name', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const siteNameInput = screen.getByDisplayValue('HeyPeter Academy');
    await user.clear(siteNameInput);
    await user.type(siteNameInput, 'New Academy Name');
    
    expect(siteNameInput).toHaveValue('New Academy Name');
  });

  it('updates site description', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const siteDescriptionTextarea = screen.getByDisplayValue('Premium English learning platform for professionals');
    await user.clear(siteDescriptionTextarea);
    await user.type(siteDescriptionTextarea, 'Updated description');
    
    expect(siteDescriptionTextarea).toHaveValue('Updated description');
  });

  it('updates contact email', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const contactEmailInput = screen.getByDisplayValue('admin@heypeter.com');
    await user.clear(contactEmailInput);
    await user.type(contactEmailInput, 'newadmin@heypeter.com');
    
    expect(contactEmailInput).toHaveValue('newadmin@heypeter.com');
  });

  it('updates support email', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const supportEmailInput = screen.getByDisplayValue('support@heypeter.com');
    await user.clear(supportEmailInput);
    await user.type(supportEmailInput, 'newsupport@heypeter.com');
    
    expect(supportEmailInput).toHaveValue('newsupport@heypeter.com');
  });

  it('changes timezone setting', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    // Find timezone select trigger
    const timezoneSelects = screen.getAllByRole('combobox');
    const timezoneSelect = timezoneSelects[0]; // First select is timezone
    
    await user.click(timezoneSelect);
    
    await waitFor(() => {
      const singaporeOption = screen.getByText('Singapore (GMT+8)');
      expect(singaporeOption).toBeInTheDocument();
    });
    
    const singaporeOption = screen.getByText('Singapore (GMT+8)');
    await user.click(singaporeOption);
    
    expect(screen.getByText('Singapore (GMT+8)')).toBeInTheDocument();
  });

  it('changes language setting', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    // Find language select (second select)
    const selects = screen.getAllByRole('combobox');
    const languageSelect = selects[1];
    
    await user.click(languageSelect);
    
    await waitFor(() => {
      const malayOption = screen.getByText('Bahasa Malaysia');
      expect(malayOption).toBeInTheDocument();
    });
    
    const malayOption = screen.getByText('Bahasa Malaysia');
    await user.click(malayOption);
    
    expect(screen.getByText('Bahasa Malaysia')).toBeInTheDocument();
  });

  it('changes date format setting', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    // Find date format select (third select)
    const selects = screen.getAllByRole('combobox');
    const dateFormatSelect = selects[2];
    
    await user.click(dateFormatSelect);
    
    await waitFor(() => {
      const usFormatOption = screen.getByText('MM/DD/YYYY');
      expect(usFormatOption).toBeInTheDocument();
    });
    
    const usFormatOption = screen.getByText('MM/DD/YYYY');
    await user.click(usFormatOption);
    
    expect(screen.getByText('MM/DD/YYYY')).toBeInTheDocument();
  });

  it('changes currency setting', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    // Find currency select (fourth select)
    const selects = screen.getAllByRole('combobox');
    const currencySelect = selects[3];
    
    await user.click(currencySelect);
    
    await waitFor(() => {
      const usdOption = screen.getByText('USD (US Dollar)');
      expect(usdOption).toBeInTheDocument();
    });
    
    const usdOption = screen.getByText('USD (US Dollar)');
    await user.click(usdOption);
    
    expect(screen.getByText('USD (US Dollar)')).toBeInTheDocument();
  });

  it('toggles maintenance mode', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const maintenanceSwitch = screen.getAllByRole('switch')[0]; // First switch is maintenance mode
    
    expect(maintenanceSwitch).toHaveAttribute('aria-checked', 'false');
    
    await user.click(maintenanceSwitch);
    
    expect(maintenanceSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles registration enabled', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const registrationSwitch = screen.getAllByRole('switch')[1]; // Second switch is registration
    
    expect(registrationSwitch).toHaveAttribute('aria-checked', 'true');
    
    await user.click(registrationSwitch);
    
    expect(registrationSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles email verification required', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const emailVerificationSwitch = screen.getAllByRole('switch')[2]; // Third switch is email verification
    
    expect(emailVerificationSwitch).toHaveAttribute('aria-checked', 'true');
    
    await user.click(emailVerificationSwitch);
    
    expect(emailVerificationSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('updates max upload size', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const maxUploadInput = screen.getByDisplayValue('10');
    await user.clear(maxUploadInput);
    await user.type(maxUploadInput, '20');
    
    expect(maxUploadInput).toHaveValue(20);
  });

  it('updates session timeout', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const sessionTimeoutInput = screen.getByDisplayValue('60');
    await user.clear(sessionTimeoutInput);
    await user.type(sessionTimeoutInput, '120');
    
    expect(sessionTimeoutInput).toHaveValue(120);
  });

  it('saves settings when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(toast).toHaveBeenCalledWith({
      title: 'Settings saved',
      description: 'General settings have been updated successfully',
    });
  });

  it('displays system settings descriptions', () => {
    render(<GeneralSettings />);
    
    expect(screen.getByText('Enable maintenance mode to prevent user access')).toBeInTheDocument();
    expect(screen.getByText('Allow new users to register')).toBeInTheDocument();
    expect(screen.getByText('Require email verification for new accounts')).toBeInTheDocument();
  });

  it('has correct input types for email fields', () => {
    render(<GeneralSettings />);
    
    const contactEmailInput = screen.getByDisplayValue('admin@heypeter.com');
    const supportEmailInput = screen.getByDisplayValue('support@heypeter.com');
    
    expect(contactEmailInput).toHaveAttribute('type', 'email');
    expect(supportEmailInput).toHaveAttribute('type', 'email');
  });

  it('has correct input types for number fields', () => {
    render(<GeneralSettings />);
    
    const maxUploadInput = screen.getByDisplayValue('10');
    const sessionTimeoutInput = screen.getByDisplayValue('60');
    
    expect(maxUploadInput).toHaveAttribute('type', 'number');
    expect(sessionTimeoutInput).toHaveAttribute('type', 'number');
  });

  it('displays proper labels for all form fields', () => {
    render(<GeneralSettings />);
    
    expect(screen.getByText('Site Name')).toBeInTheDocument();
    expect(screen.getByText('Site Description')).toBeInTheDocument();
    expect(screen.getByText('Contact Email')).toBeInTheDocument();
    expect(screen.getByText('Support Email')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('Default Language')).toBeInTheDocument();
    expect(screen.getByText('Date Format')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Mode')).toBeInTheDocument();
    expect(screen.getByText('Registration Enabled')).toBeInTheDocument();
    expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
    expect(screen.getByText('Max Upload Size (MB)')).toBeInTheDocument();
    expect(screen.getByText('Session Timeout (minutes)')).toBeInTheDocument();
  });

  it('organizes settings into proper sections with separators', () => {
    render(<GeneralSettings />);
    
    const siteInfoSection = screen.getByText('Site Information');
    const regionalSection = screen.getByText('Regional Settings');
    const systemSection = screen.getByText('System Settings');
    
    expect(siteInfoSection).toBeInTheDocument();
    expect(regionalSection).toBeInTheDocument();
    expect(systemSection).toBeInTheDocument();
    
    // Verify sections are in the correct order
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Site Information');
    expect(headings[1]).toHaveTextContent('Regional Settings');
    expect(headings[2]).toHaveTextContent('System Settings');
  });
});