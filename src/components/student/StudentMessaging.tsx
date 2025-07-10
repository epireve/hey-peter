'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import {
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Users,
  Archive,
  Trash2,
  Flag,
  Reply,
  Smile,
  X,
  Plus,
  Eye,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface AppUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
  is_online?: boolean;
}

interface Participant {
  user_id: string;
  user: AppUser;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_group?: boolean;
  name?: string;
  participants: Participant[];
}

interface MessageAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

interface MessageReaction {
  id: string;
  user_id: string;
  emoji: string;
  user?: AppUser;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  status: 'sent' | 'delivered' | 'read';
  reply_to_id?: string;
  reply_to?: Message;
  sender: AppUser;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
}

interface TypingUser {
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_MESSAGE_LENGTH = 1000;

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😢', '😮', '😡', '💯', '🎉'];

export function StudentMessaging() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || '',
          avatar_url: user.user_metadata?.avatar_url,
          role: 'student',
        });
      }
    };
    getUser();
  }, [supabase]);

  // Fetch conversations
  const { 
    data: conversations = [], 
    isLoading: loadingConversations, 
    error: conversationsError, 
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            user:users(
              id,
              full_name,
              avatar_url,
              role,
              is_online
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(*),
          reply_to:messages(
            id,
            content,
            sender:users(full_name)
          ),
          reactions:message_reactions(
            id,
            user_id,
            emoji,
            user:users(full_name)
          ),
          attachments:message_attachments(*)
        `)
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConversation?.id,
  });

  // Fetch available users for new conversations
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['available-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .in('role', ['teacher', 'admin']);

      if (error) throw error;
      return data || [];
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments: files }: { content: string; attachments?: File[] }) => {
      if (!selectedConversation?.id || !currentUser?.id) {
        throw new Error('No conversation selected');
      }

      // Upload attachments if any
      const uploadedAttachments = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          uploadedAttachments.push({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: uploadData.path,
          });
        }
      }

      const messageData = {
        content,
        sender_id: currentUser.id,
        conversation_id: selectedConversation.id,
        status: 'sent',
        reply_to_id: replyingTo?.id,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*')
        .single();

      if (error) throw error;

      // Insert attachments if any
      if (uploadedAttachments.length > 0) {
        const attachmentData = uploadedAttachments.map(att => ({
          ...att,
          message_id: data.id,
        }));

        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert(attachmentData);

        if (attachmentError) throw attachmentError;
      }

      return data;
    },
    onSuccess: () => {
      setMessageInput('');
      setAttachments([]);
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          created_by: currentUser?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Add participants
      const participants = [
        { conversation_id: data.id, user_id: currentUser?.id },
        { conversation_id: data.id, user_id: userId },
      ];

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantError) throw participantError;

      return data;
    },
    onSuccess: () => {
      setShowNewConversation(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Conversation created',
        description: 'You can now start messaging',
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_archived: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Conversation archived',
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Conversation deleted',
      });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUser?.id,
          emoji,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUser?.id)
        .eq('emoji', emoji);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
    },
  });

  // Report message mutation
  const reportMessageMutation = useMutation({
    mutationFn: async ({ messageId, reason, description }: { messageId: string; reason: string; description: string }) => {
      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: messageId,
          reporter_id: currentUser?.id,
          reason,
          description,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportingMessage(null);
      setReportReason('');
      setReportDescription('');
      toast({
        title: 'Message reported',
        description: 'Thank you for your report. We will review it.',
      });
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser?.id || !selectedConversation?.id) return;

    const channel = supabase.channel(`conversation-${selectedConversation.id}`);

    // Subscribe to new messages
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
          // Announce new messages for screen readers
          const announcement = `New message from ${(payload.new as any).sender?.full_name || 'someone'}`;
          setAnnouncements(prev => [...prev, announcement]);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const online = new Set(Object.keys(presenceState));
        setOnlineUsers(online);

        // Update typing indicators
        const typing = Object.entries(presenceState).reduce((acc: TypingUser[], [userId, presence]) => {
          const presenceData = (presence as any)[0];
          if (presenceData?.is_typing && userId !== currentUser.id) {
            acc.push({
              user_id: userId,
              user_name: presenceData.user_name || 'Someone',
              is_typing: true,
            });
          }
          return acc;
        }, []);
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Track user presence
        channel.track({
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          is_typing: false,
        });
      }
    });

    // Mark messages as read when conversation is selected
    if (selectedConversation.id) {
      markAsReadMutation.mutate(selectedConversation.id);
    }

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, currentUser?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!selectedConversation?.id || !currentUser?.id) return;

    const channel = supabase.channel(`conversation-${selectedConversation.id}`);
    channel.track({
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      is_typing: true,
    });

    // Clear typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.track({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        is_typing: false,
      });
    }, 3000);
  }, [selectedConversation?.id, currentUser, supabase]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'File type not allowed',
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  // Send message
  const handleSendMessage = () => {
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConversation) return;

    sendMessageMutation.mutate({
      content: messageInput.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    const truncatedValue = value.slice(0, MAX_MESSAGE_LENGTH);
    setMessageInput(truncatedValue);
    handleTyping();
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    
    if (conv.is_group && conv.name) {
      return conv.name.toLowerCase().includes(searchLower);
    }
    
    const otherParticipant = conv.participants.find(p => p.user_id !== currentUser?.id);
    return otherParticipant?.user.full_name.toLowerCase().includes(searchLower);
  });

  // Filter messages based on search
  const filteredMessages = messages.filter(msg => {
    if (!messageSearchQuery) return true;
    return msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  // Get conversation display name
  const getConversationName = (conversation: Conversation) => {
    if (conversation.is_group && conversation.name) {
      return conversation.name;
    }
    
    const otherParticipant = conversation.participants.find(p => p.user_id !== currentUser?.id);
    return otherParticipant?.user.full_name || 'Unknown';
  };

  // Get conversation avatar
  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.is_group) {
      return null;
    }
    
    const otherParticipant = conversation.participants.find(p => p.user_id !== currentUser?.id);
    return otherParticipant?.user.avatar_url;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get message status icon
  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3" />;
      case 'delivered':
        return <Check className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (conversationsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load conversations</h3>
          <Button onClick={() => refetchConversations()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background" aria-label="Messages">
      {/* Live region for announcements */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Message updates"
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Conversations Sidebar */}
      <div className="w-80 border-r flex flex-col" aria-label="Conversations">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Label>Select Teacher or Admin</Label>
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => createConversationMutation.mutate(user.id)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {user.full_name || 'Unknown User'}
                        <Badge variant="secondary" className="ml-auto">
                          {user.role}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setShowNewConversation(false)}
                    className="w-full"
                  >
                    Start Chat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search conversations"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => {
                const conversationName = getConversationName(conversation);
                const conversationAvatar = getConversationAvatar(conversation);
                const otherParticipant = conversation.participants.find(p => p.user_id !== currentUser?.id);
                
                return (
                  <Card
                    key={conversation.id}
                    className={cn(
                      'cursor-pointer hover:bg-accent transition-colors',
                      selectedConversation?.id === conversation.id && 'bg-accent'
                    )}
                    onClick={() => setSelectedConversation(conversation)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedConversation(conversation);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversationAvatar || undefined} />
                            <AvatarFallback>
                              {conversation.is_group ? (
                                <Users className="h-5 w-5" />
                              ) : (
                                conversationName.charAt(0)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {!conversation.is_group && otherParticipant && (
                            <div
                              className={cn(
                                'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background',
                                onlineUsers.has(otherParticipant.user_id) || otherParticipant.user.is_online
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                              )}
                              data-testid={`online-status-${otherParticipant.user_id}`}
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">{conversationName}</h3>
                            <div className="flex items-center gap-1">
                              {conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    data-testid="conversation-more"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      archiveConversationMutation.mutate(conversation.id);
                                    }}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteConversationMutation.mutate(conversation.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          {conversation.is_group && (
                            <p className="text-sm text-muted-foreground">
                              {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
                            </p>
                          )}
                          
                          {conversation.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message}
                            </p>
                          )}
                          
                          {conversation.last_message_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatTime(conversation.last_message_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getConversationAvatar(selectedConversation) || undefined} />
                    <AvatarFallback>
                      {selectedConversation.is_group ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        getConversationName(selectedConversation).charAt(0)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation.is_group ? 'Group Chat' : getConversationName(selectedConversation)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.is_group
                        ? `${selectedConversation.participants.length} participant${selectedConversation.participants.length !== 1 ? 's' : ''}`
                        : onlineUsers.has(selectedConversation.participants.find(p => p.user_id !== currentUser?.id)?.user_id || '')
                        ? 'Online'
                        : 'Offline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    data-testid="search-messages-btn"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  
                  {selectedConversation.is_group && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowParticipants(true)}
                    >
                      View Participants
                    </Button>
                  )}
                </div>
              </div>

              {showMessageSearch && (
                <div className="mt-3">
                  <Input
                    placeholder="Search messages..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="text-center text-muted-foreground">
                  Loading messages...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  {messageSearchQuery ? 'No messages found' : 'No messages yet'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUser?.id;
                    const userReactions = message.reactions.filter(r => r.user_id === currentUser?.id);
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3',
                          isOwnMessage ? 'justify-end' : 'justify-start'
                        )}
                        data-message-id={message.id}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender.avatar_url || undefined} />
                            <AvatarFallback>
                              {message.sender.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={cn('max-w-xs lg:max-w-md', isOwnMessage && 'order-first')}>
                          {message.reply_to && (
                            <div className="mb-2 p-2 bg-muted/50 rounded text-sm">
                              <p className="text-xs text-muted-foreground">
                                Replying to: {message.reply_to.content}
                              </p>
                            </div>
                          )}

                          <Card className={cn(
                            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-card'
                          )}>
                            <CardContent className="p-3">
                              {!isOwnMessage && (
                                <p className="text-xs font-medium mb-1">
                                  {message.sender.full_name}
                                </p>
                              )}
                              
                              <p className="text-sm">{message.content}</p>

                              {/* Attachments */}
                              {message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex items-center gap-2">
                                      {attachment.file_type.startsWith('image/') ? (
                                        <img
                                          src={attachment.file_url}
                                          alt={attachment.file_name}
                                          className="max-w-xs rounded"
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                          <Paperclip className="h-4 w-4" />
                                          <div>
                                            <p className="text-xs font-medium">{attachment.file_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatFileSize(attachment.file_size)}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(message.created_at)}
                                  </span>
                                  {isOwnMessage && (
                                    <span
                                      data-testid={`message-status-${message.id}`}
                                      title={message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                                    >
                                      {getMessageStatusIcon(message.status)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        data-testid="reaction-btn"
                                      >
                                        <Smile className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <div className="grid grid-cols-4 gap-1 p-2">
                                        {EMOJI_OPTIONS.map((emoji) => (
                                          <Button
                                            key={emoji}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              const hasReaction = userReactions.find(r => r.emoji === emoji);
                                              if (hasReaction) {
                                                removeReactionMutation.mutate({
                                                  messageId: message.id,
                                                  emoji,
                                                });
                                              } else {
                                                addReactionMutation.mutate({
                                                  messageId: message.id,
                                                  emoji,
                                                });
                                              }
                                            }}
                                          >
                                            {emoji}
                                          </Button>
                                        ))}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setReplyingTo(message)}
                                    data-testid="reply-btn"
                                  >
                                    <Reply className="h-3 w-3" />
                                  </Button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        data-testid="message-more-btn"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setReportingMessage(message);
                                          setShowReportDialog(true);
                                        }}
                                      >
                                        <Flag className="h-4 w-4 mr-2" />
                                        Report
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Reactions */}
                          {message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([emoji, count]) => {
                                const hasUserReaction = userReactions.find(r => r.emoji === emoji);
                                return (
                                  <Button
                                    key={emoji}
                                    variant={hasUserReaction ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => {
                                      if (hasUserReaction) {
                                        removeReactionMutation.mutate({
                                          messageId: message.id,
                                          emoji,
                                        });
                                      } else {
                                        addReactionMutation.mutate({
                                          messageId: message.id,
                                          emoji,
                                        });
                                      }
                                    }}
                                    data-testid={`reaction-${emoji}-${message.id}`}
                                  >
                                    {emoji} {count}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing indicators */}
                  {typingUsers.length > 0 && (
                    <div className="text-sm text-muted-foreground italic">
                      {typingUsers.map(user => user.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              {replyingTo && (
                <div className="mb-3 p-2 bg-muted rounded flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Replying to: {replyingTo.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[40px] max-h-32 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        onChange={handleFileUpload}
                        data-testid="file-input"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {messageInput.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() && attachments.length === 0}
                  data-testid="send-message-btn"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Please provide more details..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReportDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (reportingMessage) {
                    reportMessageMutation.mutate({
                      messageId: reportingMessage.id,
                      reason: reportReason,
                      description: reportDescription,
                    });
                  }
                }}
                disabled={!reportReason}
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedConversation?.participants.map((participant) => (
              <div key={participant.user_id} className="flex items-center gap-3 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={participant.user.avatar_url || undefined} />
                  <AvatarFallback>
                    {participant.user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{participant.user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{participant.user.role}</p>
                </div>
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    onlineUsers.has(participant.user_id) || participant.user.is_online
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  )}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive">Yes, delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}