'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { HourPackage } from '@/types/hours';

interface PackagesTabProps {
  packages: HourPackage[];
  onCreatePackage: (packageData: Partial<HourPackage>) => void;
  onUpdatePackage: (packageId: string, packageData: Partial<HourPackage>) => void;
}

export const PackagesTab: React.FC<PackagesTabProps> = ({
  packages,
  onCreatePackage,
  onUpdatePackage,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Hour Packages</h3>
        <Button onClick={() => onCreatePackage({})}>
          <Plus className="h-4 w-4 mr-2" />
          Add Package
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={pkg.isFeatured ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pkg.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                </div>
                {pkg.isFeatured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{pkg.hoursIncluded} hours</span>
                  <span className="text-xl font-semibold">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Valid for {pkg.validityDays} days
                </div>

                {pkg.features && pkg.features.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {pkg.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => onUpdatePackage(pkg.id, pkg)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onUpdatePackage(pkg.id, { ...pkg, isActive: !pkg.isActive })}
                  >
                    {pkg.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};