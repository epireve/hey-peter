'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Clock, 
  Star, 
  Package, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { hourTrackingService } from '@/lib/services';
import { HourPurchaseForm, HourPackage } from '@/types/hour-management';

interface HourPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  onSuccess?: () => void;
}

const PREDEFINED_PACKAGES: HourPackage[] = [
  {
    id: 'basic-10',
    name: 'Basic Package',
    hours: 10,
    price: 300,
    price_per_hour: 30,
    expiration_months: 3,
    course_types: ['Basic', 'Everyday A', 'Everyday B'],
    description: 'Perfect for getting started',
    is_active: true
  },
  {
    id: 'standard-20',
    name: 'Standard Package',
    hours: 20,
    price: 560,
    price_per_hour: 28,
    expiration_months: 6,
    course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up'],
    description: 'Most popular choice',
    is_active: true,
    popular: true
  },
  {
    id: 'premium-40',
    name: 'Premium Package',
    hours: 40,
    price: 1040,
    price_per_hour: 26,
    expiration_months: 12,
    course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English'],
    description: 'Best value for committed learners',
    is_active: true
  },
  {
    id: 'intensive-60',
    name: 'Intensive Package',
    hours: 60,
    price: 1440,
    price_per_hour: 24,
    expiration_months: 12,
    course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1'],
    description: 'Complete learning solution',
    is_active: true
  }
];

export function HourPurchaseDialog({ 
  open, 
  onClose, 
  studentId, 
  onSuccess 
}: HourPurchaseDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null);
  const [customPurchase, setCustomPurchase] = useState(false);
  const [purchaseData, setPurchaseData] = useState<Partial<HourPurchaseForm>>({
    student_id: studentId,
    currency: 'USD',
    payment_method: 'credit_card'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setSelectedPackage(null);
      setCustomPurchase(false);
      setPurchaseData({
        student_id: studentId,
        currency: 'USD',
        payment_method: 'credit_card'
      });
      setError(null);
      setSuccess(false);
    }
  }, [open, studentId]);

  const handlePackageSelect = (pkg: HourPackage) => {
    setSelectedPackage(pkg);
    setCustomPurchase(false);
    
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + pkg.expiration_months);
    
    setPurchaseData({
      student_id: studentId,
      package_name: pkg.name,
      hours_purchased: pkg.hours,
      price_per_hour: pkg.price_per_hour,
      total_amount: pkg.price,
      currency: 'USD',
      payment_method: 'credit_card',
      expiration_date: expirationDate.toISOString().split('T')[0]
    });
  };

  const handleCustomPurchase = () => {
    setCustomPurchase(true);
    setSelectedPackage(null);
    setPurchaseData({
      student_id: studentId,
      package_name: 'Custom Package',
      currency: 'USD',
      payment_method: 'credit_card'
    });
  };

  const handleInputChange = (field: keyof HourPurchaseForm, value: string | number) => {
    setPurchaseData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total when hours or price per hour changes
      if (field === 'hours_purchased' || field === 'price_per_hour') {
        const hours = field === 'hours_purchased' ? Number(value) : (updated.hours_purchased || 0);
        const pricePerHour = field === 'price_per_hour' ? Number(value) : (updated.price_per_hour || 0);
        updated.total_amount = hours * pricePerHour;
      }
      
      return updated;
    });
  };

  const validateForm = (): string | null => {
    if (!purchaseData.package_name) return 'Package name is required';
    if (!purchaseData.hours_purchased || purchaseData.hours_purchased <= 0) return 'Hours must be greater than 0';
    if (!purchaseData.price_per_hour || purchaseData.price_per_hour <= 0) return 'Price per hour must be greater than 0';
    if (!purchaseData.total_amount || purchaseData.total_amount <= 0) return 'Total amount must be greater than 0';
    if (!purchaseData.payment_method) return 'Payment method is required';
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await hourTrackingService.purchaseHours(
        purchaseData as HourPurchaseForm
      );
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(response.error || 'Failed to purchase hours');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      logger.error('Error purchasing hours:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Purchase Successful!
            </h3>
            <p className="text-green-700 mb-4">
              Your hours have been added to your account and are ready to use.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>{purchaseData.hours_purchased} hours</strong> purchased for{' '}
                <strong>{formatCurrency(purchaseData.total_amount || 0)}</strong>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-blue-500" />
            Purchase Hours
          </DialogTitle>
          <DialogDescription>
            Choose a package or create a custom purchase to add hours to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Package Selection */}
          {!customPurchase && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose a Package</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_PACKAGES.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        {pkg.name}
                        {pkg.popular && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-semibold">{pkg.hours} hours</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(pkg.price)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(pkg.price_per_hour)}/hour
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Expires in {pkg.expiration_months} months
                      </div>
                      
                      <p className="text-sm text-gray-600">{pkg.description}</p>
                      
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-1">Valid for courses:</p>
                        <div className="flex flex-wrap gap-1">
                          {pkg.course_types.map((course) => (
                            <Badge key={course} variant="outline" className="text-xs">
                              {course}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="text-center">
                <Button variant="outline" onClick={handleCustomPurchase}>
                  Create Custom Purchase
                </Button>
              </div>
            </div>
          )}

          {/* Custom Purchase Form */}
          {customPurchase && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Custom Purchase</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCustomPurchase(false)}
                >
                  Back to Packages
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_name">Package Name</Label>
                  <Input
                    id="package_name"
                    value={purchaseData.package_name || ''}
                    onChange={(e) => handleInputChange('package_name', e.target.value)}
                    placeholder="e.g., Custom 15-hour package"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hours_purchased">Hours</Label>
                  <Input
                    id="hours_purchased"
                    type="number"
                    min="1"
                    step="0.5"
                    value={purchaseData.hours_purchased || ''}
                    onChange={(e) => handleInputChange('hours_purchased', Number(e.target.value))}
                    placeholder="10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Price per Hour</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={purchaseData.price_per_hour || ''}
                    onChange={(e) => handleInputChange('price_per_hour', Number(e.target.value))}
                    placeholder="30.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={purchaseData.total_amount || ''}
                    onChange={(e) => handleInputChange('total_amount', Number(e.target.value))}
                    placeholder="300.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Expiration Date (Optional)</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={purchaseData.expiration_date || ''}
                    onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          {(selectedPackage || customPurchase) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={purchaseData.payment_method || ''}
                    onValueChange={(value) => handleInputChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Payment Reference (Optional)</Label>
                  <Input
                    id="payment_reference"
                    value={purchaseData.payment_reference || ''}
                    onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                    placeholder="Transaction ID, receipt number, etc."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={purchaseData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this purchase..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Purchase Summary */}
          {(selectedPackage || customPurchase) && purchaseData.hours_purchased && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base text-blue-900">Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Package:</span>
                  <span className="font-semibold">{purchaseData.package_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours:</span>
                  <span className="font-semibold">{purchaseData.hours_purchased}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per hour:</span>
                  <span>{formatCurrency(purchaseData.price_per_hour || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-blue-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(purchaseData.total_amount || 0)}</span>
                </div>
                {purchaseData.expiration_date && (
                  <div className="flex justify-between text-sm text-gray-600 pt-1">
                    <span>Expires:</span>
                    <span>{new Date(purchaseData.expiration_date).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (!selectedPackage && !customPurchase)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Purchase Hours
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HourPurchaseDialog;