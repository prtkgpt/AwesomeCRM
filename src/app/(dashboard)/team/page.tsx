'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, UserPlus, DollarSign, Trash2, Edit, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
  hourlyRate: number | null;
  employeeId: string | null;
  hireDate: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  specialties: string[];
  isActive: boolean;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'CLEANER'>('CLEANER');
  const [submitting, setSubmitting] = useState(false);

  // Check if current user is OWNER (can see all hourly rates and pay logs)
  const isOwner = (session?.user as any)?.role === 'OWNER';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTeamData();
    }
  }, [status, router]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      // Fetch team members
      const teamRes = await fetch('/api/team/members');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData.data || []);
      }

      // Fetch pending invitations
      const inviteRes = await fetch('/api/team/invitations');
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json();
        setInvitations(inviteData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Invitation sent successfully!');
        setInviteEmail('');
        setShowInviteForm(false);
        fetchTeamData(); // Refresh the lists
      } else {
        alert(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Invite error:', error);
      alert('Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Are you sure you want to deactivate this team member?')) {
      return;
    }

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      if (res.ok) {
        alert('Team member deactivated');
        fetchTeamData();
      } else {
        alert('Failed to deactivate team member');
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      alert('Failed to deactivate team member');
    }
  };

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the invitation for ${email}?`)) {
      return;
    }

    try {
      console.log(`Deleting invitation: ${invitationId} for ${email}`);
      const res = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      console.log('Delete response:', { status: res.status, data });

      if (res.ok && data.success) {
        alert('Invitation deleted successfully');
        fetchTeamData(); // Refresh the lists
      } else {
        const errorMsg = data.error || 'Failed to delete invitation';
        const details = data.details ? ` (${data.details})` : '';
        console.error('Delete failed:', data);
        alert(errorMsg + details);
      }
    } catch (error) {
      console.error('Delete invitation error:', error);
      alert('Network error: Failed to delete invitation. Please check your connection.');
    }
  };

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      console.log(`Resending invitation: ${invitationId} for ${email}`);
      const res = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'PATCH',
      });

      const data = await res.json();
      console.log('Resend response:', { status: res.status, data });

      if (res.ok && data.success) {
        alert('Invitation email resent successfully!');
        fetchTeamData(); // Refresh to show updated expiration
      } else {
        const errorMsg = data.error || 'Failed to resend invitation';
        const details = data.details ? `\n${data.details}` : '';
        const link = data.inviteLink ? `\n\nManual invite link: ${data.inviteLink}` : '';
        console.error('Resend failed:', data);
        alert(errorMsg + details + link);
      }
    } catch (error) {
      console.error('Resend invitation error:', error);
      alert('Network error: Failed to resend invitation. Please check your connection.');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Team Members</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
            Manage your team and send invitations
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/team/deactivated">
            <Button variant="outline">
              <UserPlus className="h-4 w-4" />
              Deactivated
            </Button>
          </Link>
          <Link href="/team/add-cleaner">
            <Button variant="default">
              <Plus className="h-4 w-4" />
              Add Cleaner
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowInviteForm(!showInviteForm)}>
            <UserPlus className="h-4 w-4" />
            {showInviteForm ? 'Cancel' : 'Invite'}
          </Button>
        </div>
      </div>

      {showInviteForm && (
        <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border-2 border-blue-200 dark:border-blue-900">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Send Invitation</h2>
          <form onSubmit={handleInvite} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="team@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Role</label>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'CLEANER')}
              >
                <option value="CLEANER">Cleaner</option>
                <option value="ADMIN">Admin / Office Staff</option>
              </Select>
            </div>
            <Button type="submit" disabled={submitting}>
              <Mail className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </Card>
      )}

      {/* Active Team Members */}
      <Card>
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Active Team Members</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {teamMembers.filter((m) => m.isActive).length} active member{teamMembers.filter((m) => m.isActive).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {teamMembers.filter((m) => m.isActive).length === 0 ? (
            <div className="p-8 md:p-12 text-center">
              <div className="text-gray-400 mb-4">
                <UserPlus className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No active team members. Invite your first team member to get started!
              </p>
            </div>
          ) : (
            teamMembers
              .filter((m) => m.isActive)
              .map((member) => (
                <div key={member.id} className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-gray-100">
                          {member.user.name || member.user.email}
                        </h3>
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {member.user.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {member.user.email}
                        </p>
                        {member.user.phone && (
                          <p className="flex items-center gap-2">
                            <span className="h-4 w-4">📱</span>
                            {member.user.phone}
                          </p>
                        )}
                        {member.employeeId && <p>Employee ID: {member.employeeId}</p>}
                        {isOwner && member.hourlyRate && (
                          <p className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                            <DollarSign className="h-4 w-4" />
                            ${member.hourlyRate}/hr
                          </p>
                        )}
                        {member.specialties.length > 0 && (
                          <p>Specialties: {member.specialties.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/team/${member.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      {isOwner && (
                        <Link href={`/team/${member.id}/pay-logs`}>
                          <Button variant="outline" size="sm">
                            <DollarSign className="h-4 w-4" />
                            Pay Logs
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(member.id)}
                        className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Pending Invitations</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invite) => {
              const isExpired = new Date(invite.expiresAt) < new Date();
              return (
                <div key={invite.id} className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{invite.email}</p>
                        {isExpired && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Role: {invite.role} • Status: {invite.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invite.id, invite.email)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Resend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invite.id, invite.email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
