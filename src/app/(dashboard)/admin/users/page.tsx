'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Mail, Shield, UserCog, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, ConfirmDialog } from '@/components/ui/dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CLIENT';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
  lastLogin?: string;
}

const roleColors = {
  OWNER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  ADMIN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  CLEANER: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  CLIENT: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'staff' | 'clients'>('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inviteData, setInviteData] = useState({ email: '', role: 'ADMIN' as User['role'], firstName: '', lastName: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteDialog(false);
        setInviteData({ email: '', role: 'ADMIN', firstName: '', lastName: '' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to invite:', error);
    }
  };

  const handleUpdateRole = async (userId: string, role: User['role']) => {
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        fetchUsers();
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });
      if (res.ok) {
        fetchUsers();
        setShowDeleteDialog(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to deactivate:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (activeTab === 'staff') return ['OWNER', 'ADMIN', 'CLEANER'].includes(user.role);
    if (activeTab === 'clients') return user.role === 'CLIENT';
    return true;
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => (
        <span className={cn('px-2 py-1 text-xs font-medium rounded-full', roleColors[user.role])}>
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (user) => (
        <StatusBadge
          status={user.status === 'ACTIVE' ? 'active' : user.status === 'PENDING' ? 'pending' : 'inactive'}
          label={user.status}
        />
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-gray-500">
          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(user);
              setShowEditDialog(true);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Edit"
          >
            <UserCog className="w-4 h-4" />
          </button>
          {user.role !== 'OWNER' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setShowDeleteDialog(true);
              }}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
              title="Deactivate"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage team members and client accounts</p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
          <TabsTrigger value="staff">Staff ({users.filter(u => u.role !== 'CLIENT').length})</TabsTrigger>
          <TabsTrigger value="clients">Clients ({users.filter(u => u.role === 'CLIENT').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyField="id"
            searchable
            searchPlaceholder="Search users..."
            searchFields={['firstName', 'lastName', 'email']}
            loading={loading}
            emptyMessage="No users found"
          />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={inviteData.firstName}
                  onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as User['role'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="ADMIN">Admin</option>
                <option value="CLEANER">Cleaner</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowInviteDialog(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Update role for {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  defaultValue={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                  disabled={selectedUser.role === 'OWNER'}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CLEANER">Cleaner</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setShowEditDialog(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedUser && handleUpdateRole(selectedUser.id, selectedUser.role)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Role
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => selectedUser && handleDeactivate(selectedUser.id)}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${selectedUser?.firstName} ${selectedUser?.lastName}? They will no longer be able to access the system.`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}
