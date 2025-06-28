'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Save, Edit, Trash2, Users, Percent } from 'lucide-react';
import type { FeatureFlag } from '@/types/settings';

export function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([
    {
      id: '1',
      name: 'AI-Powered Scheduling',
      key: 'ai_scheduling',
      enabled: true,
      description: 'Enable AI algorithm for automatic class scheduling',
      rollout_percentage: 100,
      updated_by: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Video Conferencing',
      key: 'video_conferencing',
      enabled: true,
      description: 'Enable integrated video conferencing for online classes',
      rollout_percentage: 100,
      updated_by: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Advanced Analytics Dashboard',
      key: 'advanced_analytics',
      enabled: false,
      description: 'Show advanced analytics and insights in dashboard',
      rollout_percentage: 0,
      user_groups: ['admin', 'teacher'],
      updated_by: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Mobile App API',
      key: 'mobile_api',
      enabled: true,
      description: 'Enable API endpoints for mobile applications',
      rollout_percentage: 50,
      updated_by: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    rollout_percentage: 0,
    user_groups: [] as string[],
  });

  const handleToggle = (flagId: string) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
    ));
    toast({
      title: 'Feature flag updated',
      description: 'The feature flag has been toggled successfully',
    });
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormData({
      name: flag.name,
      key: flag.key,
      description: flag.description || '',
      rollout_percentage: flag.rollout_percentage || 0,
      user_groups: flag.user_groups || [],
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editingFlag) {
      setFlags(prev => prev.map(flag => 
        flag.id === editingFlag.id 
          ? {
              ...flag,
              ...formData,
              updated_at: new Date().toISOString(),
            }
          : flag
      ));
    } else {
      const newFlag: FeatureFlag = {
        id: `flag-${Date.now()}`,
        ...formData,
        enabled: false,
        updated_by: 'admin',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setFlags(prev => [...prev, newFlag]);
    }
    
    setShowDialog(false);
    setEditingFlag(null);
    setFormData({
      name: '',
      key: '',
      description: '',
      rollout_percentage: 0,
      user_groups: [],
    });
    
    toast({
      title: editingFlag ? 'Flag updated' : 'Flag created',
      description: 'Feature flag has been saved successfully',
    });
  };

  const handleDelete = (flagId: string) => {
    setFlags(prev => prev.filter(flag => flag.id !== flagId));
    toast({
      title: 'Flag deleted',
      description: 'Feature flag has been removed',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Control feature availability across the platform
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature Flag
        </Button>
      </div>

      <div className="space-y-4">
        {flags.map((flag) => (
          <Card key={flag.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{flag.name}</h4>
                  <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {flag.rollout_percentage && flag.rollout_percentage < 100 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {flag.rollout_percentage}%
                    </Badge>
                  )}
                  {flag.user_groups && flag.user_groups.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {flag.user_groups.join(', ')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
                <p className="text-xs text-muted-foreground">Key: {flag.key}</p>
                {flag.rollout_percentage !== undefined && flag.rollout_percentage < 100 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={flag.rollout_percentage} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">
                      {flag.rollout_percentage}% rollout
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => handleToggle(flag.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(flag)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(flag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </DialogTitle>
            <DialogDescription>
              Configure feature flag settings and rollout strategy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Feature name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="feature_key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-description">Description</Label>
              <Input
                id="flag-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this feature do?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-rollout">Rollout Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="flag-rollout"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.rollout_percentage}
                  onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) || 0 })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}