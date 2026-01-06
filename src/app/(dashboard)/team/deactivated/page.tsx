'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function DeactivatedTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deactivatedMembers, setDeactivatedMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDeactivatedMembers();
    }
  }, [status, router]);

  const fetchDeactivatedMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/team/members?status=inactive');
      if (res.ok) {
        const data = await res.json();
        setDeactivatedMembers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deactivated members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to reactivate ${memberName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        alert(`${memberName} has been reactivated successfully!`);
        fetchDeactivatedMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reactivate team member');
      }
    } catch (error) {
      console.error('Reactivate error:', error);
      alert('Failed to reactivate team member');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading deactivated team members...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/team">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Deactivated Team Members</h1>
        </div>
      </div>

      {deactivatedMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No deactivated team members</p>
          <p className="text-sm text-gray-400 mt-2">
            All your team members are currently active
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {deactivatedMembers.map((member) => (
            <Card key={member.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold">
                      {member.user.name || 'Unnamed'}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {member.user.role}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                      Deactivated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{member.user.email}</span>
                    </div>
                    {member.user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{member.user.phone}</span>
                      </div>
                    )}
                    {member.employeeId && (
                      <div>
                        <strong>Employee ID:</strong> {member.employeeId}
                      </div>
                    )}
                    {member.hourlyRate && (
                      <div>
                        <strong>Hourly Rate:</strong> ${member.hourlyRate.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {member.specialties && member.specialties.length > 0 && (
                    <div className="mt-3">
                      <strong className="text-sm">Specialties:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {member.specialties.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {member.emergencyContact && (
                    <div className="mt-3 text-sm text-gray-500">
                      <strong>Emergency Contact:</strong> {member.emergencyContact}
                      {member.emergencyPhone && ` - ${member.emergencyPhone}`}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() =>
                      handleReactivate(member.id, member.user.name || 'this member')
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
