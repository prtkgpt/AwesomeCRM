'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type PricingRule = {
  id: string;
  type: 'BEDROOM' | 'BATHROOM' | 'ADDON' | 'CUSTOM';
  name: string;
  price: number;
  duration: number;
  display: 'BOTH' | 'BOOKING' | 'ESTIMATE' | 'HIDDEN';
  sortOrder: number;
  quantity: number | null;
  serviceType: string | null;
  frequency: string | null;
  description: string | null;
  isActive: boolean;
};

type EditingRule = Partial<PricingRule> & { id?: string };

export default function PricingSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [bedroomRules, setBedroomRules] = useState<PricingRule[]>([]);
  const [bathroomRules, setBathroomRules] = useState<PricingRule[]>([]);
  const [addonRules, setAddonRules] = useState<PricingRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRule>({});
  const [isAddingBedroom, setIsAddingBedroom] = useState(false);
  const [isAddingBathroom, setIsAddingBathroom] = useState(false);
  const [isAddingAddon, setIsAddingAddon] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingRules();
  }, []);

  const fetchPricingRules = async () => {
    try {
      const response = await fetch('/api/pricing/rules');
      const data = await response.json();

      if (data.success) {
        const bedrooms = data.data.filter((r: PricingRule) => r.type === 'BEDROOM');
        const bathrooms = data.data.filter((r: PricingRule) => r.type === 'BATHROOM');
        const addons = data.data.filter((r: PricingRule) => r.type === 'ADDON' || r.type === 'CUSTOM');

        setBedroomRules(bedrooms);
        setBathroomRules(bathrooms);
        setAddonRules(addons);
      }
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error);
      alert('Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: PricingRule) => {
    setEditingId(rule.id);
    setEditForm(rule);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setIsAddingBedroom(false);
    setIsAddingBathroom(false);
    setIsAddingAddon(false);
  };

  const handleSave = async () => {
    if (!editForm.name || editForm.price === undefined || editForm.duration === undefined) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      let response;

      if (editingId) {
        // Update existing rule
        response = await fetch(`/api/pricing/rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      } else {
        // Create new rule
        response = await fetch('/api/pricing/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }

      const data = await response.json();

      if (data.success) {
        await fetchPricingRules();
        handleCancelEdit();
      } else {
        alert(data.error || 'Failed to save pricing rule');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/pricing/rules/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchPricingRules();
      } else {
        alert(data.error || 'Failed to delete pricing rule');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  const startAddingBedroom = () => {
    setIsAddingBedroom(true);
    setEditForm({
      type: 'BEDROOM',
      name: '',
      price: 0,
      duration: 120,
      display: 'BOTH',
      sortOrder: bedroomRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const startAddingBathroom = () => {
    setIsAddingBathroom(true);
    setEditForm({
      type: 'BATHROOM',
      name: '',
      price: 0,
      duration: 40,
      display: 'BOTH',
      sortOrder: bathroomRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const startAddingAddon = () => {
    setIsAddingAddon(true);
    setEditForm({
      type: 'ADDON',
      name: '',
      price: 0,
      duration: 30,
      display: 'BOTH',
      sortOrder: addonRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}Min`;
    if (mins === 0) return `${hours}Hr`;
    return `${hours}Hr ${mins}Min`;
  };

  const renderTable = (rules: PricingRule[], type: string, isAdding: boolean, startAdding: () => void) => {
    const isEditing = (isAdding && editForm.type === type) || editingId;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{type === 'BEDROOM' ? 'Bedrooms' : type === 'BATHROOM' ? 'Bathrooms' : 'Add-ons'}</h2>
          <Button onClick={startAdding} size="sm" disabled={!!isEditing}>
            <Plus className="h-4 w-4 mr-2" />
            Add {type === 'BEDROOM' ? 'Bedroom' : type === 'BATHROOM' ? 'Bathroom' : 'Add-on'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Display</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Service Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</th>
                {type !== 'ADDON' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isAdding && editForm.type === type && (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="e.g., Studio Apartment"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={editForm.price || 0}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={editForm.duration || 0}
                      onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                      className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Minutes"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.display || 'BOTH'}
                      onChange={(e) => setEditForm({ ...editForm, display: e.target.value as any })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="BOTH">Both</option>
                      <option value="BOOKING">Booking</option>
                      <option value="ESTIMATE">Estimate</option>
                      <option value="HIDDEN">Hidden</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.serviceType || ''}
                      onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value || null })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">-NA-</option>
                      <option value="STANDARD">Standard</option>
                      <option value="DEEP">Deep</option>
                      <option value="MOVE_OUT">Move-Out</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.frequency || ''}
                      onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value || null })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">-NA-</option>
                      <option value="ONE_TIME">One Time</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </td>
                  {type !== 'ADDON' && (
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.quantity ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        step="0.5"
                        placeholder="e.g., 1"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleCancelEdit} size="sm" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
              {rules.map((rule) => (
                editingId === rule.id ? (
                  <tr key={rule.id} className="bg-blue-50 dark:bg-blue-900/20">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.price ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.duration ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.display || 'BOTH'}
                        onChange={(e) => setEditForm({ ...editForm, display: e.target.value as any })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="BOTH">Both</option>
                        <option value="BOOKING">Booking</option>
                        <option value="ESTIMATE">Estimate</option>
                        <option value="HIDDEN">Hidden</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.serviceType || ''}
                        onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value || null })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">-NA-</option>
                        <option value="STANDARD">Standard</option>
                        <option value="DEEP">Deep</option>
                        <option value="MOVE_OUT">Move-Out</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.frequency || ''}
                        onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value || null })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">-NA-</option>
                        <option value="ONE_TIME">One Time</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Biweekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </td>
                    {type !== 'ADDON' && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.quantity ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                          step="0.5"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm">{rule.name}</td>
                    <td className="px-4 py-3 text-sm">${rule.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{formatDuration(rule.duration)}</td>
                    <td className="px-4 py-3 text-sm">{rule.display}</td>
                    <td className="px-4 py-3 text-sm">{rule.serviceType || '-NA-'}</td>
                    <td className="px-4 py-3 text-sm">{rule.frequency || '-NA-'}</td>
                    {type !== 'ADDON' && (
                      <td className="px-4 py-3 text-sm">{rule.quantity !== null ? rule.quantity : '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(rule)} size="sm" variant="outline" disabled={!!isEditing}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(rule.id)} size="sm" variant="outline" disabled={!!isEditing}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {rules.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={type !== 'ADDON' ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    No pricing rules configured. Click "Add {type === 'BEDROOM' ? 'Bedroom' : type === 'BATHROOM' ? 'Bathroom' : 'Add-on'}" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading pricing settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure your pricing for bedrooms, bathrooms, and add-on services
          </p>
        </div>
      </div>

      {/* Bedrooms Section */}
      {renderTable(bedroomRules, 'BEDROOM', isAddingBedroom, startAddingBedroom)}

      {/* Bathrooms Section */}
      {renderTable(bathroomRules, 'BATHROOM', isAddingBathroom, startAddingBathroom)}

      {/* Add-ons Section */}
      {renderTable(addonRules, 'ADDON', isAddingAddon, startAddingAddon)}
    </div>
  );
}
