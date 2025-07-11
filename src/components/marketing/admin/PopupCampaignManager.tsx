'use client';

import { logger } from '@/lib/services';

// ========================================
// Popup Campaign Manager
// Admin dashboard for managing popup campaigns and variations
// ========================================

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Copy, 
  BarChart3, 
  Users, 
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignForm } from './CampaignForm';
import { VariationForm } from './VariationForm';
import { PopupPreview } from './PopupPreview';
import { popupMarketingService } from '@/lib/services/popup-marketing-service';
import { cn } from '@/lib/utils';
import type {
  PopupCampaign,
  PopupVariation,
  CampaignStatus,
  CampaignType,
  CampaignPerformance
} from '@/types/popup-marketing';

interface CampaignManagerState {
  campaigns: PopupCampaign[];
  selectedCampaign: PopupCampaign | null;
  variations: PopupVariation[];
  performance: CampaignPerformance[];
  loading: boolean;
  searchTerm: string;
  statusFilter: CampaignStatus | 'all';
  typeFilter: CampaignType | 'all';
}

export function PopupCampaignManager() {
  const [state, setState] = useState<CampaignManagerState>({
    campaigns: [],
    selectedCampaign: null,
    variations: [],
    performance: [],
    loading: true,
    searchTerm: '',
    statusFilter: 'all',
    typeFilter: 'all'
  });

  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PopupCampaign | null>(null);
  const [editingVariation, setEditingVariation] = useState<PopupVariation | null>(null);
  const [previewVariation, setPreviewVariation] = useState<PopupVariation | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (state.selectedCampaign) {
      loadCampaignVariations(state.selectedCampaign.id);
    }
  }, [state.selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const [campaignsResult, performanceData] = await Promise.all([
        popupMarketingService.getCampaigns(),
        popupMarketingService.getCampaignPerformance()
      ]);

      setState(prev => ({
        ...prev,
        campaigns: campaignsResult.campaigns,
        performance: performanceData,
        loading: false
      }));

    } catch (error) {
      logger.error('Error loading campaigns:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const loadCampaignVariations = async (campaignId: string) => {
    try {
      const variations = await popupMarketingService.getCampaignVariations(campaignId);
      setState(prev => ({ ...prev, variations }));
    } catch (error) {
      logger.error('Error loading variations:', error);
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setShowCampaignForm(true);
  };

  const handleEditCampaign = (campaign: PopupCampaign) => {
    setEditingCampaign(campaign);
    setShowCampaignForm(true);
  };

  const handleCampaignSaved = (campaign: PopupCampaign) => {
    setShowCampaignForm(false);
    setEditingCampaign(null);
    loadCampaigns();
  };

  const handleCreateVariation = () => {
    if (!state.selectedCampaign) return;
    setEditingVariation(null);
    setShowVariationForm(true);
  };

  const handleEditVariation = (variation: PopupVariation) => {
    setEditingVariation(variation);
    setShowVariationForm(true);
  };

  const handleVariationSaved = (variation: PopupVariation) => {
    setShowVariationForm(false);
    setEditingVariation(null);
    if (state.selectedCampaign) {
      loadCampaignVariations(state.selectedCampaign.id);
    }
  };

  const handlePreviewVariation = (variation: PopupVariation) => {
    setPreviewVariation(variation);
    setShowPreview(true);
  };

  const handleToggleCampaignStatus = async (campaign: PopupCampaign) => {
    try {
      const newStatus: CampaignStatus = campaign.status === 'active' ? 'paused' : 'active';
      await popupMarketingService.updateCampaign(campaign.id, { status: newStatus });
      loadCampaigns();
    } catch (error) {
      logger.error('Error toggling campaign status:', error);
    }
  };

  const handleDeleteCampaign = async (campaign: PopupCampaign) => {
    try {
      await popupMarketingService.deleteCampaign(campaign.id);
      setState(prev => ({
        ...prev,
        selectedCampaign: prev.selectedCampaign?.id === campaign.id ? null : prev.selectedCampaign
      }));
      loadCampaigns();
    } catch (error) {
      logger.error('Error deleting campaign:', error);
    }
  };

  const handleDuplicateCampaign = async (campaign: PopupCampaign) => {
    try {
      const duplicateData = {
        ...campaign,
        name: `${campaign.name} (Copy)`,
        status: 'draft' as CampaignStatus
      };
      delete (duplicateData as any).id;
      delete (duplicateData as any).created_at;
      delete (duplicateData as any).updated_at;
      
      await popupMarketingService.createCampaign(duplicateData);
      loadCampaigns();
    } catch (error) {
      logger.error('Error duplicating campaign:', error);
    }
  };

  // Filter campaigns
  const filteredCampaigns = state.campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesStatus = state.statusFilter === 'all' || campaign.status === state.statusFilter;
    const matchesType = state.typeFilter === 'all' || campaign.campaign_type === state.typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getCampaignPerformance = (campaignId: string) => {
    return state.performance.find(p => p.id === campaignId);
  };

  const getStatusBadgeVariant = (status: CampaignStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'draft': return 'outline';
      case 'archived': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeBadgeColor = (type: CampaignType) => {
    switch (type) {
      case 'lead_capture': return 'bg-blue-100 text-blue-800';
      case 'course_promotion': return 'bg-green-100 text-green-800';
      case 'discount_offer': return 'bg-orange-100 text-orange-800';
      case 'newsletter_signup': return 'bg-purple-100 text-purple-800';
      case 'exit_intent': return 'bg-red-100 text-red-800';
      case 'welcome': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Popup Campaign Manager</h1>
          <p className="text-gray-600">
            Create, manage, and optimize your popup marketing campaigns
          </p>
        </div>
        
        <Button onClick={handleCreateCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={state.searchTerm}
                  onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select
              value={state.statusFilter}
              onValueChange={(value: CampaignStatus | 'all') => 
                setState(prev => ({ ...prev, statusFilter: value }))
              }
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={state.typeFilter}
              onValueChange={(value: CampaignType | 'all') => 
                setState(prev => ({ ...prev, typeFilter: value }))
              }
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lead_capture">Lead Capture</SelectItem>
                <SelectItem value="course_promotion">Course Promotion</SelectItem>
                <SelectItem value="discount_offer">Discount Offer</SelectItem>
                <SelectItem value="newsletter_signup">Newsletter</SelectItem>
                <SelectItem value="exit_intent">Exit Intent</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns ({filteredCampaigns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {state.loading ? (
                <div className="text-center py-8">Loading campaigns...</div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first popup campaign to get started
                  </p>
                  <Button onClick={handleCreateCampaign}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign) => {
                    const performance = getCampaignPerformance(campaign.id);
                    const isSelected = state.selectedCampaign?.id === campaign.id;
                    
                    return (
                      <div
                        key={campaign.id}
                        className={cn(
                          'border rounded-lg p-4 cursor-pointer transition-colors',
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => setState(prev => ({ 
                          ...prev, 
                          selectedCampaign: campaign 
                        }))}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{campaign.name}</h3>
                              <Badge variant={getStatusBadgeVariant(campaign.status)}>
                                {campaign.status}
                              </Badge>
                              <Badge className={getTypeBadgeColor(campaign.campaign_type)}>
                                {campaign.campaign_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {campaign.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {campaign.description}
                              </p>
                            )}
                            
                            {performance && (
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Impressions</span>
                                  <div className="font-medium">{performance.total_impressions.toLocaleString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">CTR</span>
                                  <div className="font-medium">{performance.ctr_percentage.toFixed(2)}%</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Conversions</span>
                                  <div className="font-medium">{performance.total_conversions.toLocaleString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Revenue</span>
                                  <div className="font-medium">${performance.total_revenue.toLocaleString()}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditCampaign(campaign);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCampaignStatus(campaign);
                              }}>
                                {campaign.status === 'active' ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateCampaign(campaign);
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteCampaign(campaign)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaign Details */}
        <div>
          {state.selectedCampaign ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Variations</span>
                  <Button size="sm" onClick={handleCreateVariation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variation
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage A/B test variations for {state.selectedCampaign.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {state.variations.length === 0 ? (
                  <div className="text-center py-6">
                    <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      No variations created yet
                    </p>
                    <Button size="sm" onClick={handleCreateVariation}>
                      Create First Variation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {state.variations.map((variation) => (
                      <div
                        key={variation.id}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{variation.variation_name}</span>
                            {variation.is_control && (
                              <Badge variant="outline" className="text-xs">Control</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePreviewVariation(variation)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditVariation(variation)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <div>Traffic: {variation.traffic_percentage}%</div>
                          <div>Template: {variation.template_type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Campaign</h3>
                <p className="text-gray-600">
                  Choose a campaign from the list to manage its variations
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription>
              Configure your popup campaign settings and targeting options
            </DialogDescription>
          </DialogHeader>
          <CampaignForm
            campaign={editingCampaign}
            onSave={handleCampaignSaved}
            onCancel={() => setShowCampaignForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showVariationForm} onOpenChange={setShowVariationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariation ? 'Edit Variation' : 'Create New Variation'}
            </DialogTitle>
            <DialogDescription>
              Design your popup variation for A/B testing
            </DialogDescription>
          </DialogHeader>
          {state.selectedCampaign && (
            <VariationForm
              campaignId={state.selectedCampaign.id}
              variation={editingVariation}
              onSave={handleVariationSaved}
              onCancel={() => setShowVariationForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Popup Preview</DialogTitle>
            <DialogDescription>
              Preview how your popup will appear to visitors
            </DialogDescription>
          </DialogHeader>
          {previewVariation && (
            <PopupPreview variation={previewVariation} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PopupCampaignManager;