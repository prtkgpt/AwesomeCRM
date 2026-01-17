'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Search, Phone, Mail, MessageSquare, User, ChevronLeft, MoreVertical, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  type: 'CLIENT' | 'CLEANER';
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  type: 'SMS' | 'EMAIL' | 'INTERNAL';
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
  sender: { id: string; name: string };
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

const templates: MessageTemplate[] = [
  { id: '1', name: 'Booking Confirmation', content: 'Hi {name}, your cleaning is confirmed for {date} at {time}. See you then!', category: 'Booking' },
  { id: '2', name: 'On My Way', content: 'Hi {name}, your cleaner is on the way and will arrive in approximately {time} minutes.', category: 'Status' },
  { id: '3', name: 'Job Complete', content: 'Hi {name}, your cleaning is complete! We hope everything looks great. Please let us know if you have any feedback.', category: 'Status' },
  { id: '4', name: 'Payment Reminder', content: 'Hi {name}, this is a friendly reminder that your payment of ${amount} is due. Please let us know if you have any questions.', category: 'Payment' },
  { id: '5', name: 'Review Request', content: 'Hi {name}, thank you for choosing us! We\'d love your feedback. Please take a moment to leave us a review: {link}', category: 'Marketing' },
];

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'SMS' | 'EMAIL'>('SMS');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Fetch both clients and cleaners
      const [clientsRes, teamRes] = await Promise.all([
        fetch('/api/clients?limit=50'),
        fetch('/api/team?role=CLEANER'),
      ]);
      const clientsData = await clientsRes.json();
      const teamData = await teamRes.json();

      const contactList: Contact[] = [
        ...(clientsData.data || []).map((c: any) => ({
          id: c.id,
          type: 'CLIENT' as const,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          phone: c.phone,
          unreadCount: Math.floor(Math.random() * 3), // Mock data
          lastMessage: 'Thanks for the great service!',
          lastMessageAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        })),
        ...(teamData.data || []).map((t: any) => ({
          id: t.id,
          type: 'CLEANER' as const,
          name: `${t.firstName} ${t.lastName}`,
          email: t.email,
          phone: t.phone,
          unreadCount: 0,
          lastMessage: 'Job completed',
          lastMessageAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        })),
      ];

      setContacts(contactList.sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      ));
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await fetch(`/api/notifications?recipientId=${contactId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Mock some messages for demo
      setMessages([
        {
          id: '1',
          content: 'Hi! Your cleaning is scheduled for tomorrow at 9am.',
          type: 'SMS',
          direction: 'OUTBOUND',
          status: 'DELIVERED',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          sender: { id: 'system', name: 'System' },
        },
        {
          id: '2',
          content: 'Thanks! Looking forward to it.',
          type: 'SMS',
          direction: 'INBOUND',
          status: 'READ',
          createdAt: new Date(Date.now() - 82800000).toISOString(),
          sender: { id: contactId, name: selectedContact?.name || 'Contact' },
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedContact.id,
          type: messageType,
          content: messageText,
        }),
      });

      if (res.ok) {
        const newMessage: Message = {
          id: Date.now().toString(),
          content: messageText,
          type: messageType,
          direction: 'OUTBOUND',
          status: 'SENT',
          createdAt: new Date().toISOString(),
          sender: { id: 'me', name: 'You' },
        };
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: MessageTemplate) => {
    let content = template.content;
    if (selectedContact) {
      content = content.replace('{name}', selectedContact.name.split(' ')[0]);
    }
    setMessageText(content);
    setShowTemplates(false);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Contacts Sidebar */}
      <div className={cn(
        'w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col',
        selectedContact && 'hidden md:flex'
      )}>
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No contacts found</div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-left',
                  selectedContact?.id === contact.id && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
                    {contact.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
                    {contact.lastMessageAt && (
                      <span className="text-xs text-gray-400 ml-2">
                        {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <Badge variant={contact.type === 'CLIENT' ? 'info' : 'success'} size="sm" className="mt-1">
                    {contact.type}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className={cn(
        'flex-1 flex flex-col',
        !selectedContact && 'hidden md:flex'
      )}>
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedContact(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{selectedContact.name}</p>
                <p className="text-sm text-gray-500">{selectedContact.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedContact.phone && (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </a>
                )}
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </a>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2',
                      message.direction === 'OUTBOUND'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={cn(
                      'flex items-center gap-2 mt-1 text-xs',
                      message.direction === 'OUTBOUND' ? 'text-blue-200' : 'text-gray-500'
                    )}>
                      <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
                      <span className="uppercase">{message.type}</span>
                      {message.direction === 'OUTBOUND' && (
                        <span className="capitalize">{message.status.toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Templates */}
              {showTemplates && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Templates</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message type selector */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setMessageType('SMS')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg',
                    messageType === 'SMS'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </button>
                <button
                  onClick={() => setMessageType('EMAIL')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg',
                    messageType === 'EMAIL'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                >
                  {showTemplates ? 'Hide' : 'Templates'}
                </button>
              </div>

              {/* Input */}
              <div className="flex items-end gap-3">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Type your ${messageType.toLowerCase()} message...`}
                  rows={2}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
