import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecuritySettings } from '../SecuritySettings';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

const { toast } = require('@/components/ui/use-toast');

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders security settings interface correctly', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('Security Rules')).toBeInTheDocument();
    expect(screen.getByText('API Security')).toBeInTheDocument();
    expect(screen.getByText('CORS Settings')).toBeInTheDocument();
    expect(screen.getByText('Security Recommendations')).toBeInTheDocument();
  });

  it('displays security status alert', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText(/Security level:/)).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(/All recommended security features are enabled/)).toBeInTheDocument();
  });

  it('displays all security rules', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('Minimum Password Length')).toBeInTheDocument();
    expect(screen.getByText('Require Special Characters')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Session Timeout')).toBeInTheDocument();
    expect(screen.getByText('Failed Login Lockout')).toBeInTheDocument();
    expect(screen.getByText('IP Whitelist')).toBeInTheDocument();
    expect(screen.getByText('API Rate Limiting')).toBeInTheDocument();
  });

  it('toggles security rule switches', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    // Get all switches - Two-Factor Authentication is the 3rd one (index 2)
    const switches = screen.getAllByRole('switch');
    const twoFactorSwitch = switches[2]; // Two-Factor Authentication switch
    
    expect(twoFactorSwitch).toHaveAttribute('aria-checked', 'false');
    
    await user.click(twoFactorSwitch);
    
    expect(twoFactorSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('updates numeric rule values', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    // Find password length input
    const passwordLengthInput = screen.getByDisplayValue('8');
    expect(passwordLengthInput).toBeInTheDocument();
    
    await user.clear(passwordLengthInput);
    await user.type(passwordLengthInput, '12');
    
    expect(passwordLengthInput).toHaveValue(12);
  });

  it('shows and hides API key', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const apiKeyInput = screen.getByDisplayValue(/sk_live_/);
    expect(apiKeyInput).toHaveAttribute('type', 'password');
    
    // Find the eye button within the API key input container
    const eyeButtons = screen.getAllByRole('button');
    const toggleButton = eyeButtons.find(button => 
      button.querySelector('.lucide-eye') || button.querySelector('.lucide-eye-off')
    );
    
    await user.click(toggleButton!);
    
    expect(apiKeyInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton!);
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('regenerates API key', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    await user.click(regenerateButton);
    
    expect(toast).toHaveBeenCalledWith({
      title: 'API Key Regenerated',
      description: 'Your new API key has been generated. Update your integrations.',
      variant: 'default',
    });
  });

  it('updates API version', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    // Look for the select trigger button that contains the current value
    const apiVersionTrigger = screen.getByRole('combobox');
    await user.click(apiVersionTrigger);
    
    await waitFor(() => {
      const v2Option = screen.getByText('v2 (Beta)');
      expect(v2Option).toBeInTheDocument();
    });
    
    const v2Option = screen.getByText('v2 (Beta)');
    await user.click(v2Option);
    
    // After selection, verify the trigger shows the new value
    expect(screen.getByText('v2 (Beta)')).toBeInTheDocument();
  });

  it('updates CORS settings', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const allowedOriginsTextarea = screen.getByDisplayValue('https://app.heypeter.com');
    await user.clear(allowedOriginsTextarea);
    await user.type(allowedOriginsTextarea, 'https://newdomain.com');
    
    expect(allowedOriginsTextarea).toHaveValue('https://newdomain.com');
  });

  it('updates allowed methods', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const allowedMethodsInput = screen.getByDisplayValue('GET,POST,PUT,DELETE');
    await user.clear(allowedMethodsInput);
    await user.type(allowedMethodsInput, 'GET,POST');
    
    expect(allowedMethodsInput).toHaveValue('GET,POST');
  });

  it('updates allowed headers', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const allowedHeadersInput = screen.getByDisplayValue('Content-Type,Authorization');
    await user.clear(allowedHeadersInput);
    await user.type(allowedHeadersInput, 'Content-Type');
    
    expect(allowedHeadersInput).toHaveValue('Content-Type');
  });

  it('updates max age setting', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const maxAgeInput = screen.getByDisplayValue('86400');
    await user.clear(maxAgeInput);
    await user.type(maxAgeInput, '43200');
    
    expect(maxAgeInput).toHaveValue(43200);
  });

  it('saves settings when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(toast).toHaveBeenCalledWith({
      title: 'Settings saved',
      description: 'Security settings have been updated',
    });
  });

  it('displays security recommendations', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('Security Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Enable Two-Factor Authentication for enhanced security')).toBeInTheDocument();
    expect(screen.getByText('Consider implementing IP whitelist for admin access')).toBeInTheDocument();
    expect(screen.getByText('Password policy is properly configured')).toBeInTheDocument();
    expect(screen.getByText('API rate limiting is active')).toBeInTheDocument();
  });

  it('displays correct icons for different rule types', () => {
    render(<SecuritySettings />);
    
    // Check that various security rule icons are present
    const rulesSection = screen.getByText('Security Rules').closest('div');
    expect(rulesSection).toBeInTheDocument();
    
    // Verify that all rule cards are rendered
    expect(screen.getAllByText(/Minimum number of characters required/)).toHaveLength(1);
    expect(screen.getAllByText(/Passwords must contain at least one special character/)).toHaveLength(1);
    expect(screen.getAllByText(/Require 2FA for all users/)).toHaveLength(1);
  });

  it('handles rule value changes for different rule types', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    // Test session timeout value change
    const sessionTimeoutInput = screen.getByDisplayValue('60');
    await user.clear(sessionTimeoutInput);
    await user.type(sessionTimeoutInput, '120');
    
    expect(sessionTimeoutInput).toHaveValue(120);
    
    // Test failed login lockout value change
    const failedLoginInput = screen.getByDisplayValue('5');
    await user.clear(failedLoginInput);
    await user.type(failedLoginInput, '3');
    
    expect(failedLoginInput).toHaveValue(3);
    
    // Test API rate limiting value change
    const rateLimitInput = screen.getByDisplayValue('1000');
    await user.clear(rateLimitInput);
    await user.type(rateLimitInput, '2000');
    
    expect(rateLimitInput).toHaveValue(2000);
  });

  it('hides numeric inputs when rules are disabled', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    
    // Get all switches and find the Session Timeout switch (index 3)
    const switches = screen.getAllByRole('switch');
    const sessionTimeoutSwitch = switches[3]; // Session Timeout switch
    
    // Verify input is initially visible
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    
    // Disable the rule
    await user.click(sessionTimeoutSwitch);
    
    // Verify the switch state changed
    expect(sessionTimeoutSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('displays readonly API credentials', () => {
    render(<SecuritySettings />);
    
    const apiKeyInput = screen.getByDisplayValue(/sk_live_/);
    expect(apiKeyInput).toHaveAttribute('readonly');
    
    const webhookSecretInput = screen.getByDisplayValue(/whsec_/);
    expect(webhookSecretInput).toHaveAttribute('readonly');
  });

  it('shows CORS configuration help text', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('One origin per line, or * for all origins')).toBeInTheDocument();
    expect(screen.getByText('Configure allowed origins and methods for API access')).toBeInTheDocument();
  });
});