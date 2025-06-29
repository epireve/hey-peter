'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Ban, 
  CheckCircle,
  AlertCircle,
  Mail,
  Key,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  user_metadata: {
    full_name?: string;
    role?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  banned?: boolean;
}

interface UserManagementWorkflowProps {
  users: User[];
  onRefresh: () => void;
}

export function UserManagementWorkflow({ users, onRefresh }: UserManagementWorkflowProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'change-role' | 'reset-password' | 'resend-invite' | null;
  }>({ open: false, action: null });
  const [loading, setLoading] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  const { toast } = useToast();
  // supabase instance is already imported

  const getUserStatus = (user: User) => {
    if (user.banned) return { label: 'Banned', variant: 'destructive' as const };
    if (!user.email_confirmed_at) return { label: 'Pending', variant: 'secondary' as const };
    if (user.last_sign_in_at) return { label: 'Active', variant: 'default' as const };
    return { label: 'Invited', variant: 'outline' as const };
  };

  const handleAction = async () => {
    if (!selectedUser || !actionDialog.action) return;

    setLoading(true);
    try {
      switch (actionDialog.action) {
        case 'activate':
          await supabase.auth.admin.updateUserById(selectedUser.id, {
            ban_duration: 'none',
          });
          toast({
            title: 'User activated',
            description: `${selectedUser.email} has been activated successfully.`,
          });
          break;

        case 'deactivate':
          await supabase.auth.admin.updateUserById(selectedUser.id, {
            ban_duration: '876600h', // 100 years
          });
          toast({
            title: 'User deactivated',
            description: `${selectedUser.email} has been deactivated.`,
          });
          break;

        case 'change-role':
          await supabase.auth.admin.updateUserById(selectedUser.id, {
            user_metadata: {
              ...selectedUser.user_metadata,
              role: newRole,
            },
          });
          toast({
            title: 'Role updated',
            description: `Role changed to ${newRole} for ${selectedUser.email}.`,
          });
          break;

        case 'reset-password':
          await supabase.auth.resetPasswordForEmail(selectedUser.email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });
          toast({
            title: 'Password reset sent',
            description: `Password reset email sent to ${selectedUser.email}.`,
          });
          break;

        case 'resend-invite':
          await supabase.auth.admin.inviteUserByEmail(selectedUser.email, {
            data: selectedUser.user_metadata,
          });
          toast({
            title: 'Invitation resent',
            description: `Invitation email resent to ${selectedUser.email}.`,
          });
          break;
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: selectedUser.id,
        action: actionDialog.action,
        resource_type: 'user',
        resource_id: selectedUser.id,
        details: {
          email: selectedUser.email,
          notes,
          ...(actionDialog.action === 'change-role' ? { new_role: newRole } : {}),
        },
      });

      onRefresh();
      setActionDialog({ open: false, action: null });
      setSelectedUser(null);
      setNotes('');
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (user: User, action: typeof actionDialog.action) => {
    setSelectedUser(user);
    setActionDialog({ open: true, action });
    if (action === 'change-role') {
      setNewRole(user.user_metadata.role || 'student');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management Workflow
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              const status = getUserStatus(user);
              const role = user.user_metadata.role || 'student';

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{user.user_metadata.full_name || 'No name'}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Badge variant="outline" className="capitalize">{role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                      {user.last_sign_in_at && (
                        <span>Last sign in: {format(new Date(user.last_sign_in_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status.label === 'Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, 'resend-invite')}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Resend Invite
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openActionDialog(user, 'reset-password')}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Reset Password
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openActionDialog(user, 'change-role')}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Change Role
                    </Button>

                    {user.banned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, 'activate')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, 'deactivate')}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => {
          setActionDialog({ open, action: null });
          setSelectedUser(null);
          setNotes('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'activate' && 'Activate User'}
              {actionDialog.action === 'deactivate' && 'Deactivate User'}
              {actionDialog.action === 'change-role' && 'Change User Role'}
              {actionDialog.action === 'reset-password' && 'Reset Password'}
              {actionDialog.action === 'resend-invite' && 'Resend Invitation'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <div className="space-y-2 mt-2">
                  <p>User: <strong>{selectedUser.email}</strong></p>
                  <p>Name: <strong>{selectedUser.user_metadata.full_name || 'No name'}</strong></p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionDialog.action === 'change-role' && (
              <div className="space-y-2">
                <Label htmlFor="role">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionDialog.action === 'deactivate' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will prevent the user from accessing the system. They can be reactivated later.
                </AlertDescription>
              </Alert>
            )}

            {actionDialog.action === 'reset-password' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A password reset email will be sent to the user's email address.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this action..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ open: false, action: null });
                setSelectedUser(null);
                setNotes('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}