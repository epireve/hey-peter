# Hour Management System Documentation

## Overview

The Hour Management System is a comprehensive solution for managing student hour packages, purchases, usage tracking, and balance management in the HeyPeter Academy LMS. This system handles the complete lifecycle of hour management from purchase to expiration.

## Features

### 1. Hour Package Management
- **Pre-defined Packages**: Various package types (Standard, Premium, Corporate, Trial)
- **Flexible Pricing**: Support for different currencies and discount percentages
- **Validity Periods**: Configurable validity days for each package
- **Class Type Restrictions**: Packages can be limited to specific class types
- **Corporate Packages**: Special packages for bulk purchases by organizations

### 2. Hour Purchase System
- **Online Purchase Flow**: Integration-ready for payment gateways
- **Payment Tracking**: Complete payment status and reference tracking
- **Invoice Support**: Corporate invoice generation capability
- **Automatic Validity**: Validity period calculated from purchase date

### 3. Hour Tracking and Deduction
- **Automatic Deduction**: Hours deducted when students attend classes
- **FIFO Deduction**: Uses oldest purchases first to minimize expiration
- **Deduction Rates**: Different rates for different class types (e.g., 1.5x for premium)
- **Transaction History**: Complete audit trail of all hour movements

### 4. Hour Transfer System
- **Family Accounts**: Transfer hours between family members
- **Transfer Limits**: Configurable limits on transfers
- **Approval Workflow**: Admin approval for non-family transfers
- **Transfer Logging**: Complete tracking of all transfers

### 5. Manual Adjustments
- **Admin Adjustments**: Add or subtract hours with reason tracking
- **Approval Workflow**: Multi-level approval for adjustments
- **Supporting Documents**: Attach documents to justify adjustments
- **Impact Tracking**: Track affected classes and bookings

### 6. Alert System
- **Low Balance Alerts**: Notify when hours drop below threshold
- **Expiry Warnings**: Alert before hours expire (7, 14, 30 days)
- **No Hours Alert**: Immediate notification when balance reaches zero
- **Customizable Thresholds**: Configure alert triggers per student

### 7. Reporting and Analytics
- **Usage Statistics**: Track usage patterns and trends
- **Package Performance**: Analyze package popularity and revenue
- **Student Analytics**: Individual usage patterns and preferences
- **Revenue Tracking**: Monthly revenue and purchase trends

## Database Schema

### Core Tables

#### `hour_packages`
Defines available hour packages with pricing and features.

#### `hour_purchases`
Records of student package purchases with payment information.

#### `hour_transactions`
All hour movements (purchases, deductions, transfers, adjustments).

#### `hour_adjustments`
Manual adjustment records with approval workflow.

#### `hour_alerts`
System-generated alerts for various conditions.

#### `hour_transfer_logs`
Detailed logs of hour transfers between students.

## API Usage

### Hour Management Service

```typescript
import { hourManagementService } from '@/lib/services/hour-management-service';

// Get available packages
const packages = await hourManagementService.getHourPackages({ 
  isActive: true,
  isFeatured: true 
});

// Purchase hours
const purchase = await hourManagementService.purchaseHours({
  studentId: 'student-123',
  packageId: 'pkg-456',
  paymentMethod: 'credit_card',
  paymentDetails: { /* payment gateway response */ }
});

// Get student balance
const balance = await hourManagementService.getStudentHourBalance('student-123');

// Deduct hours for class
const deduction = await hourManagementService.deductClassHours({
  studentId: 'student-123',
  classId: 'class-789',
  bookingId: 'booking-012',
  hours: 1,
  classType: 'individual',
  deductionRate: 1.0
});

// Transfer hours
const transfer = await hourManagementService.transferHours({
  fromStudentId: 'student-123',
  toStudentId: 'student-456',
  hoursToTransfer: 5,
  reason: 'Family transfer - siblings',
  isFamilyTransfer: true,
  familyRelationship: 'siblings'
});

// Create adjustment
const adjustment = await hourManagementService.createHourAdjustment({
  studentId: 'student-123',
  adjustmentType: 'add',
  hoursToAdjust: 3,
  reason: 'Compensation for technical issues',
  supportingDocuments: [{ name: 'report.pdf', url: '...' }]
});
```

## Components

### Admin Components

#### `HourManagementDashboard`
Complete admin interface for managing all aspects of the hour system.

Features:
- Overview tab with key metrics and alerts
- Package management with CRUD operations
- Transaction history with filtering and export
- Student balance management
- Manual adjustment interface
- Hour transfer management

### Student Components

#### `StudentHourDashboard`
Student-facing interface for hour management.

Features:
- Hour balance display
- Active packages view
- Package purchase interface
- Transaction history
- Usage statistics and trends
- Expiry warnings

## Business Rules

### Hour Expiration
- Hours expire based on package validity period
- Expired hours cannot be used or transferred
- Students receive alerts at 30, 14, and 7 days before expiry
- Automatic expiry process runs daily via cron job

### Deduction Rules
- Standard classes: 1 hour per hour
- Premium classes: Configurable rate (e.g., 1.5 hours per hour)
- Group classes: Same rate as individual unless specified
- Failed attendance: No deduction
- Cancelled classes: No deduction

### Transfer Rules
- Only active, non-expired hours can be transferred
- Family transfers allowed between verified family accounts
- Non-family transfers require admin approval
- Transfer limits can be set per package
- Transfers are irreversible

### Alert Rules
- Low balance: Triggered at 5 hours remaining (configurable)
- Expiry warnings: 30, 14, and 7 days before expiry
- No hours: Immediate alert when balance reaches zero
- Alerts can be acknowledged but remain visible

## Cron Jobs

### Daily Hour Expiry Job
Runs daily at 2 AM to:
1. Expire old hour purchases
2. Create expiry alerts
3. Send notification emails/SMS
4. Clean up old alerts

```typescript
import { runHourExpiryJob } from '@/lib/services/hour-expiry-cron';

// Run the job
const results = await runHourExpiryJob();
console.log(`Expired: ${results.expired}, Alerts: ${results.alerts}`);
```

## Security Considerations

### Row Level Security (RLS)
- Students can only view their own data
- Teachers can view student balances for their classes
- Only admins can create packages and adjustments
- Transfer logs restricted to involved parties and admins

### Approval Workflows
- Manual adjustments require admin approval
- Large transfers may require additional verification
- Package modifications logged with user tracking

### Payment Security
- Payment details stored securely
- Integration with PCI-compliant payment gateways
- Audit trail for all financial transactions

## Performance Optimizations

### Database Indexes
- Student ID indexes on all tables
- Composite indexes for common queries
- Partial indexes for active/expired filters

### Caching Strategy
- Package details cached for 1 hour
- Student balances calculated on-demand
- Transaction history paginated

### Query Optimization
- FIFO deduction uses efficient window functions
- Batch operations for bulk updates
- Materialized views for analytics

## Integration Points

### Payment Gateways
- Stripe integration ready
- PayPal support
- Corporate invoicing system
- Webhook handlers for payment status

### Notification Systems
- Email notifications via SendGrid/SES
- SMS alerts via Twilio
- In-app notifications
- Push notifications

### Analytics Platforms
- Google Analytics events
- Mixpanel user properties
- Custom analytics dashboard
- Export to data warehouse

## Testing

### Unit Tests
Comprehensive test coverage for:
- Hour calculation logic
- Deduction algorithms
- Transfer validations
- Expiry processes

### Integration Tests
- Payment flow testing
- Alert generation
- Cron job execution
- API endpoint testing

## Maintenance

### Regular Tasks
1. Monitor expiry job execution
2. Review pending adjustments
3. Check alert delivery rates
4. Analyze usage patterns
5. Update package offerings

### Troubleshooting
- Check hour_transactions for deduction issues
- Verify payment_status for purchase problems
- Review hour_alerts for notification failures
- Examine transfer_logs for transfer issues

## Future Enhancements

1. **Subscription Model**: Recurring monthly hour packages
2. **Hour Sharing**: Share hours with non-family members
3. **Loyalty Program**: Bonus hours for regular customers
4. **Dynamic Pricing**: Time-based pricing adjustments
5. **Mobile App Integration**: Native mobile hour management
6. **Advanced Analytics**: ML-based usage predictions
7. **Automated Refunds**: Self-service refund system
8. **Gift Hours**: Purchase hours as gifts for others