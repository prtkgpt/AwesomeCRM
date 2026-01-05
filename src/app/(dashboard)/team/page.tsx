'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Team Members</h1>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          {showInviteForm ? 'Cancel' : 'Invite Team Member'}
        </Button>
      </div>

      {showInviteForm && (
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Send Invitation</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="team@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'CLEANER')}
              >
                <option value="CLEANER">Cleaner</option>
                <option value="ADMIN">Admin / Office Staff</option>
              </Select>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </Card>
      )}

      {/* Active Team Members */}
      <Card className="mb-6">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Active Team Members</h2>
        </div>
        <div className="divide-y">
          {teamMembers.filter((m) => m.isActive).length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No active team members. Invite your first team member to get started!
            </div>
          ) : (
            teamMembers
              .filter((m) => m.isActive)
              .map((member) => (
                <div key={member.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {member.user.name || member.user.email}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {member.user.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Email: {member.user.email}</p>
                        {member.user.phone && <p>Phone: {member.user.phone}</p>}
                        {member.employeeId && <p>Employee ID: {member.employeeId}</p>}
                        {member.hourlyRate && <p>Hourly Rate: ${member.hourlyRate}/hr</p>}
                        {member.specialties.length > 0 && (
                          <p>Specialties: {member.specialties.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(member.id)}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
          </div>
          <div className="divide-y">
            {invitations.map((invite) => (
              <div key={invite.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-gray-600">
                      Role: {invite.role} • Status: {invite.status}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
