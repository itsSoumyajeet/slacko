'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Send, Calendar, Trash2, ExternalLink, CheckCircle, AlertCircle, Hash, Users, MessageSquare, Clock, Settings, Slack, Home as HomeIcon, Zap, Shield, Check } from 'lucide-react';

interface SlackWorkspace {
  id: string;
  teamId: string;
  teamName: string;
  tokens: Array<{
    id: string;
    expiresAt: string;
    scope: string;
  }>;
  _count: {
    scheduledMessages: number;
  };
}

interface SlackChannel {
  id: string;
  name?: string;
  user?: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_member: boolean;
}

interface ScheduledMessage {
  id: string;
  channelId: string;
  message: string;
  scheduledFor: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  workspace: {
    id: string;
    teamId: string;
    teamName: string;
  };
}

export default function Home() {
  const [userId] = useState('user-123');
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([]);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('workspaces');

  useEffect(() => {
    loadWorkspaces();
    loadScheduledMessages();
  }, [userId]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadChannels();
    }
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const response = await fetch(`/api/slack/workspaces?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await fetch(`/api/slack/channels?workspaceId=${selectedWorkspace}`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadScheduledMessages = async () => {
    try {
      const response = await fetch(`/api/slack/messages?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setScheduledMessages(data);
      }
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
    }
  };

  const connectSlack = () => {
    window.location.href = `/api/slack/auth?userId=${userId}`;
  };

  const sendMessage = async (isScheduled = false) => {
    if (!selectedWorkspace || !selectedChannel || !message) {
      setError('Please select a workspace, channel, and enter a message');
      return;
    }

    if (isScheduled && !scheduledFor) {
      setError('Please select a date and time for scheduled messages');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let scheduledForUTC: string | undefined = undefined;
      
      if (isScheduled && scheduledFor) {
        const localDate = new Date(scheduledFor);
        const [datePart, timePart] = scheduledFor.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        const correctLocalDate = new Date(year, month - 1, day, hour, minute);
        scheduledForUTC = correctLocalDate.toISOString();
      }

      const response = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: selectedWorkspace,
          channelId: selectedChannel,
          message,
          scheduledFor: scheduledForUTC,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(isScheduled ? 'Message scheduled successfully!' : 'Message sent successfully!');
        setMessage('');
        setScheduledFor('');
        if (isScheduled) {
          loadScheduledMessages();
        }
        
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send message');
        setTimeout(() => {
          setError('');
        }, 5000);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message');
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const cancelScheduledMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/slack/messages?messageId=${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Scheduled message cancelled successfully');
        loadScheduledMessages();
      } else {
        setError('Failed to cancel scheduled message');
      }
    } catch (error) {
      setError('Failed to cancel scheduled message');
    }
  };

  const disconnectWorkspace = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/slack/workspaces?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Workspace disconnected successfully');
        loadWorkspaces();
        loadScheduledMessages();
      } else {
        setError('Failed to disconnect workspace');
      }
    } catch (error) {
      setError('Failed to disconnect workspace');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return `Channel (${channelId})`;
    
    if (channel.is_im) {
      return `DM ${channel.user ? `with ${channel.user}` : ''}`.trim();
    } else if (channel.name) {
      return `#${channel.name}`;
    } else if (channel.is_group) {
      return `Private Group`;
    } else if (channel.is_mpim) {
      return `Group DM`;
    } else {
      return `Channel (${channelId})`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="brutalist-badge brutalist-badge-warning">Pending</Badge>;
      case 'SENT':
        return <Badge className="brutalist-badge brutalist-badge-success">Sent</Badge>;
      case 'CANCELLED':
        return <Badge className="brutalist-badge brutalist-badge-info">Cancelled</Badge>;
      case 'FAILED':
        return <Badge className="brutalist-badge brutalist-badge-error">Failed</Badge>;
      default:
        return <Badge className="brutalist-badge brutalist-badge-info">{status}</Badge>;
    }
  };

  const sidebarItems = [
    { id: 'workspaces', label: 'Workspaces', icon: Settings, description: 'Manage your Slack connections' },
    { id: 'messages', label: 'Send Message', icon: MessageSquare, description: 'Compose and send messages' },
    { id: 'scheduled', label: 'Scheduled', icon: Clock, description: 'View scheduled messages' },
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="bg-white flex flex-col w-80">
        {/* Header */}
        <div className="p-8 border-b border-black">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-black border-4 border-black flex items-center justify-center shadow-brutalist">
              <span className="text-lg font-black text-white">SC</span>
            </div>
            <div>
              <h1 className="text-2xl text-brutalist-lg">Slack Connect</h1>
              <p className="text-xs text-brutalist-sm">Message Scheduler</p>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-4 bg-white border-2 border-black px-6 py-4">
            <div className="brutalist-status-dot brutalist-status-active"></div>
            <span className="text-sm text-brutalist">System Active</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <div className="space-y-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-4 px-6 py-4 border-2 border-black text-sm font-black uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all duration-200 ease-out shadow-brutalist-sm hover:shadow-brutalist hover:-translate-x-1 hover:-translate-y-1 w-full text-left ${isActive ? 'bg-black text-white shadow-brutalist' : 'bg-white'}`}
                >
                  <Icon className="h-6 w-6" />
                  <div>
                    <div className="font-black">{item.label}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-8 border-t border-black">
          <div className="bg-white border-2 border-black p-6 transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black border-4 border-black flex items-center justify-center">
                <span className="text-lg font-black text-white">SC</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-brutalist">Slack Connect</p>
                <p className="text-xs text-brutalist-sm">Professional Messaging</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-black px-12 py-8">
          <div className="flex items-center justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                {activeTab === 'workspaces' && <Settings className="h-10 w-10 text-black" />}
                {activeTab === 'messages' && <MessageSquare className="h-10 w-10 text-black" />}
                {activeTab === 'scheduled' && <Clock className="h-10 w-10 text-black" />}
                <h1 className="text-3xl text-brutalist-lg">
                  {activeTab === 'workspaces' && 'WORKSPACE MANAGEMENT'}
                  {activeTab === 'messages' && 'Message Composer'}
                  {activeTab === 'scheduled' && 'Scheduled Messages'}
                </h1>
              </div>
              <p className="text-sm text-brutalist-sm text-gray-500">
                {activeTab === 'workspaces' && 'MANAGE YOUR SLACK WORKSPACE CONNECTIONS AND VIEW THEIR AUTHENTICATION STATUS'}
                {activeTab === 'messages' && 'Send immediate messages or schedule them for future delivery'}
                {activeTab === 'scheduled' && 'View and manage all your scheduled messages'}
              </p>
            </div>
            
            {activeTab === 'workspaces' && (
              <Button 
                onClick={connectSlack}
                className="bg-black text-white border-4 border-black px-8 py-4 text-sm font-brutalist tracking-wider hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-4 transition-all duration-200 ease-out shadow-gray-brutalist hover:shadow-gray-brutalist-lg hover:-translate-x-1 hover:-translate-y-1 active:shadow-gray-brutalist-sm active:translate-x-0 active:translate-y-0"
              >
                <Plus className="h-6 w-6 mr-4" />
                Connect Workspace
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-8 max-w-7xl mx-auto">
            {error && (
              <Alert className="brutalist-alert brutalist-alert-error mb-8">
                <AlertCircle className="h-6 w-6" />
                <AlertDescription className="text-sm font-black tracking-wider">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="brutalist-alert brutalist-alert-success mb-8">
                <CheckCircle className="h-6 w-6" />
                <AlertDescription className="text-sm font-black tracking-wider">{success}</AlertDescription>
              </Alert>
            )}

            {/* Workspaces Tab */}
            {activeTab === 'workspaces' && (
              <div className="max-w-7xl mx-auto brutalist-section">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white border-2 border-black shadow-brutalist p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-brutalist-sm mb-1">Total Workspaces</p>
                        <p className="text-2xl text-brutalist">{workspaces.length}</p>
                      </div>
                      <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-brutalist-sm">
                        <Hash className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-black shadow-brutalist p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-brutalist-sm mb-1">Scheduled Messages</p>
                        <p className="text-2xl text-brutalist">
                          {scheduledMessages.filter(m => m.status === 'PENDING').length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-brutalist-sm">
                        <Clock className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-black shadow-brutalist p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-brutalist-sm mb-1">Active Connections</p>
                        <p className="text-2xl text-brutalist">
                          {workspaces.filter(w => w.tokens.length > 0).length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-brutalist-sm">
                        <Shield className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workspace List */}
                <div className="space-y-4">
                  {workspaces.length === 0 ? (
                    <div className="bg-white border-4 border-black shadow-brutalist p-8">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white border-4 border-black flex items-center justify-center shadow-brutalist mx-auto mb-6">
                          <Slack className="h-12 w-12 text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-wider mb-4">No Workspaces Connected</h3>
                        <p className="text-sm font-black tracking-wider mb-6">
                          Connect your first Slack workspace to start scheduling messages.
                        </p>
                        <Button onClick={connectSlack} className="brutalist-button">
                          <Plus className="h-6 w-6 mr-4" />
                          Connect Workspace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    workspaces.map((workspace) => (
                      <div key={workspace.id} className="bg-white border-4 border-black shadow-brutalist p-6 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-black border-4 border-black flex items-center justify-center shadow-brutalist">
                              <Settings className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black uppercase tracking-wider">{workspace.teamName}</h3>
                              <p className="text-sm font-black tracking-wider text-gray-700">
                                Team ID: {workspace.teamId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {workspace.tokens.length > 0 ? (
                              <Badge className="brutalist-badge brutalist-badge-success">Connected</Badge>
                            ) : (
                              <Badge className="brutalist-badge brutalist-badge-warning">Needs Auth</Badge>
                            )}
                            {workspace.tokens.length > 0 && (
                              <button
                                onClick={() => disconnectWorkspace(workspace.id)}
                                className="inline-flex items-center px-3 py-1 border-2 border-black text-xs font-brutalist font-bold tracking-wider shadow-brutalist-sm bg-red-500 text-white hover:bg-red-600"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-black tracking-wider">
                          <div className="flex items-center gap-6">
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="bg-gray-100 border border-gray-300 px-2 py-1 rounded">
                                {scheduledMessages.filter(m => m.workspace.id === workspace.id && m.status === 'PENDING').length} scheduled messages
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="bg-gray-100 border border-gray-300 px-2 py-1 rounded">
                                {workspace.tokens.length} active tokens
                              </span>
                            </span>
                          </div>
                          <span className="text-gray-600">ID: {workspace.id}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="max-w-5xl mx-auto brutalist-section">
                <Card className="border-4 border-black shadow-brutalist-lg bg-white mb-8">
                  <CardHeader>
                    <CardTitle className="text-2xl font-black tracking-wider flex items-center gap-3">
                      <MessageSquare className="h-6 w-6" />
                      Compose Message
                    </CardTitle>
                    <CardDescription className="text-sm font-black tracking-wider text-gray-500">SEND A MESSAGE IMMEDIATELY OR SCHEDULE IT FOR FUTURE DELIVERY TO ANY SLACK CHANNEL</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-black tracking-wider mb-3 flex items-center gap-3">
                          <Settings className="h-5 w-5" />
                          Workspace
                        </label>
                        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                          <SelectTrigger className="brutalist-select border-4 border-black">
                            <SelectValue placeholder="Select workspace" />
                          </SelectTrigger>
                          <SelectContent className="brutalist-select-content">
                            {workspaces.map((workspace) => (
                              <SelectItem key={workspace.id} value={workspace.id}>
                                {workspace.teamName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-black tracking-wider mb-3 flex items-center gap-3">
                          <Hash className="h-5 w-5" />
                          Channel
                        </label>
                        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                          <SelectTrigger className="brutalist-select border-4 border-black">
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent className="brutalist-select-content">
                            {channels.map((channel) => (
                              <SelectItem key={channel.id} value={channel.id}>
                                {formatChannelName(channel.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black tracking-wider mb-3 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5" />
                        Message Content
                      </label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="brutalist-textarea border-4 border-black"
                        rows={4}
                      />
                      <p className="text-xs text-brutalist-sm text-gray-600 mt-2">
                        {message.length} CHARACTERS . SUPPORTS MARKDOWN FORMATTING
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-black tracking-wider mb-3 flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        Schedule For (Optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="brutalist-input border-4 border-black h-14"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-brutalist-sm text-gray-600 mt-2">
                        LEAVE EMPTY TO SEND IMMEDIATELY. MESSAGES WILL BE SENT IN YOUR LOCAL TIMEZONE.
                      </p>
                    </div>
                    <div className="pt-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={() => sendMessage(false)}
                          disabled={loading}
                          className="w-full bg-black text-white border-4 border-black px-8 py-4 text-sm font-brutalist tracking-wider hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-4 transition-all duration-200 ease-out shadow-brutalist hover:shadow-brutalist-lg hover:-translate-x-1 hover:-translate-y-1 active:shadow-brutalist-sm active:translate-x-0 active:translate-y-0"
                        >
                          {loading ? (
                            <Loader2 className="h-6 w-6 mr-4 animate-spin" />
                          ) : (
                            <Send className="h-6 w-6 mr-4" />
                          )}
                          Send Now
                        </Button>
                        <Button
                          onClick={() => sendMessage(true)}
                          disabled={loading}
                          className="w-full bg-white text-black border-4 border-black px-8 py-4 text-sm font-brutalist tracking-wider hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-4 transition-all duration-200 ease-out shadow-brutalist hover:shadow-brutalist-lg hover:-translate-x-1 hover:-translate-y-1 active:shadow-brutalist-sm active:translate-x-0 active:translate-y-0"
                        >
                          {loading ? (
                            <Loader2 className="h-6 w-6 mr-4 animate-spin" />
                          ) : (
                            <Calendar className="h-6 w-6 mr-4" />
                          )}
                          Schedule Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scheduled Tab */}
            {activeTab === 'scheduled' && (
              <div className="max-w-7xl mx-auto brutalist-section">
                {/* Stats Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white border-2 border-black shadow-brutalist p-2 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-2xl text-brutalist text-gray-700 font-black mb-1">{scheduledMessages.length}</p>
                      <p className="text-xs text-brutalist-sm text-gray-600 font-black">Total Messages</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-black shadow-brutalist p-2 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-2xl text-brutalist text-gray-700 font-black mb-1">
                        {scheduledMessages.filter(m => m.status === 'PENDING').length}
                      </p>
                      <p className="text-xs text-brutalist-sm text-gray-600 font-black">Pending</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-black shadow-brutalist p-2 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-2xl text-brutalist text-gray-700 font-black mb-1">
                        {scheduledMessages.filter(m => m.status === 'SENT').length}
                      </p>
                      <p className="text-xs text-brutalist-sm text-gray-600 font-black">Sent</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-black shadow-brutalist p-2 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-2xl text-brutalist text-gray-700 font-black mb-1">
                        {scheduledMessages.filter(m => m.status === 'FAILED').length}
                      </p>
                      <p className="text-xs text-brutalist-sm text-gray-600 font-black">Failed</p>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                  {scheduledMessages.length === 0 ? (
                    <div className="bg-white border-4 border-black shadow-brutalist p-8">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white border-4 border-black flex items-center justify-center shadow-brutalist mx-auto mb-6">
                          <Clock className="h-12 w-12 text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-wider mb-4">No Scheduled Messages</h3>
                        <p className="text-sm font-black tracking-wider">
                          You don't have any scheduled messages yet.
                        </p>
                      </div>
                    </div>
                  ) : (
                    scheduledMessages.map((message) => (
                      <div key={message.id} className={`${message.status === 'SENT' ? 'bg-gray-100' : 'bg-white'} border-4 border-black shadow-brutalist p-6 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all duration-200`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-black border-4 border-black flex items-center justify-center shadow-brutalist">
                              <Slack className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black uppercase tracking-wider">{message.workspace.teamName}</h3>
                              <p className="text-sm font-black tracking-wider text-gray-700">
                                {formatChannelName(message.channelId)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getStatusBadge(message.status)}
                            {message.status === 'PENDING' && (
                              <Button
                                onClick={() => cancelScheduledMessage(message.id)}
                                className="brutalist-button-sm"
                              >
                                <Trash2 className="h-5 w-5 mr-3" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-black tracking-wider bg-gray-50 border-2 border-black p-4">
                            {message.message}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-black tracking-wider">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Scheduled for: {formatDate(message.scheduledFor)}
                            </span>
                          </div>
                          <span className="text-gray-600">ID: {message.id}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}