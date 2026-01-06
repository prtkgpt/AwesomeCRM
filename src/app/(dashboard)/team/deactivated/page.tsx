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

interface ReactivationModal {
  isOpen: boolean;
  member: TeamMember | null;
  newPassword: string;
}

export default function DeactivatedTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deactivatedMembers, setDeactivatedMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivationModal, setReactivationModal] = useState<ReactivationModal>({
    isOpen: false,
    member: null,
    newPassword: '',
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [reactivatedMember, setReactivatedMember] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

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

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const openReactivationModal = (member: TeamMember) => {
    const newPassword = generatePassword();
    setReactivationModal({
      isOpen: true,
      member,
      newPassword,
    });
    setGeneratedPassword(newPassword);
  };

  const closeReactivationModal = () => {
    setReactivationModal({
      isOpen: false,
      member: null,
      newPassword: '',
    });
    setGeneratedPassword('');
  };

  const handleReactivate = async () => {
    if (!reactivationModal.member) return;

    try {
      const res = await fetch(`/api/team/members/${reactivationModal.member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
          newPassword: reactivationModal.newPassword,
        }),
      });

      if (res.ok) {
        setReactivatedMember({
          email: reactivationModal.member.user.email,
          password: reactivationModal.newPassword,
          name: reactivationModal.member.user.name || 'Cleaner',
        });
        setShowCredentials(true);
        closeReactivationModal();
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
                    onClick={() => openReactivationModal(member)}
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

      {/* Reactivation Confirmation Modal */}
      {reactivationModal.isOpen && reactivationModal.member && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Reactivate Team Member</h2>
            <p className="mb-4">
              You are about to reactivate{' '}
              <strong>{reactivationModal.member.user.name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              A new password will be generated. You'll need to share the login
              credentials with them.
            </p>
            <div className="bg-gray-50 p-3 rounded mb-4">
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reactivationModal.newPassword}
                  onChange={(e) =>
                    setReactivationModal({
                      ...reactivationModal,
                      newPassword: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border rounded"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newPwd = generatePassword();
                    setReactivationModal({
                      ...reactivationModal,
                      newPassword: newPwd,
                    });
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeReactivationModal}>
                Cancel
              </Button>
              <Button
                onClick={handleReactivate}
                className="bg-green-600 hover:bg-green-700"
              >
                Reactivate
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Credentials Display Modal */}
      {showCredentials && reactivatedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-green-600">
              ✓ Account Reactivated Successfully!
            </h2>
            <p className="mb-4">
              <strong>{reactivatedMember.name}</strong> can now log in with these
              credentials:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reactivatedMember.email}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border rounded"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reactivatedMember.email)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reactivatedMember.password}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border rounded font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reactivatedMember.password)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Make sure to share these credentials with
                the cleaner before closing this dialog. You won't be able to see the
                password again.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowCredentials(false);
                  setReactivatedMember(null);
                }}
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
