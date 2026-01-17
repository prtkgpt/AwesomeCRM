'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, TrendingDown, TrendingUp, Search, Filter, Edit, Trash2, History } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, ConfirmDialog } from '@/components/ui/dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  costPerUnit: number;
  supplier?: string;
  location?: string;
  lastRestocked?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'RESTOCK' | 'USAGE' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  notes?: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

const categories = ['Cleaning Supplies', 'Equipment', 'Disposables', 'Chemicals', 'Tools', 'PPE'];
const units = ['units', 'bottles', 'boxes', 'gallons', 'pairs', 'rolls'];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Cleaning Supplies',
    quantity: 0,
    minQuantity: 5,
    unit: 'units',
    costPerUnit: 0,
    supplier: '',
    location: '',
  });

  const [restockData, setRestockData] = useState({
    quantity: 0,
    notes: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/inventory/transactions?limit=50');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddDialog(false);
        fetchInventory();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add:', error);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowEditDialog(false);
        fetchInventory();
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleRestock = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: selectedItem.quantity + restockData.quantity,
          transactionType: 'RESTOCK',
          transactionNotes: restockData.notes,
        }),
      });
      if (res.ok) {
        setShowRestockDialog(false);
        fetchInventory();
        fetchTransactions();
        setRestockData({ quantity: 0, notes: '' });
      }
    } catch (error) {
      console.error('Failed to restock:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setShowDeleteDialog(false);
        fetchInventory();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: 'Cleaning Supplies',
      quantity: 0,
      minQuantity: 5,
      unit: 'units',
      costPerUnit: 0,
      supplier: '',
      location: '',
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      supplier: item.supplier || '',
      location: item.location || '',
    });
    setShowEditDialog(true);
  };

  const itemColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (item) => (
        <Badge variant="outline">{item.category}</Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Level',
      sortable: true,
      render: (item) => {
        const percentage = (item.quantity / (item.minQuantity * 3)) * 100;
        return (
          <div className="w-32">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-900 dark:text-white">{item.quantity} {item.unit}</span>
            </div>
            <Progress
              value={item.quantity}
              max={item.minQuantity * 3}
              size="sm"
              variant={item.status === 'OUT_OF_STOCK' ? 'error' : item.status === 'LOW_STOCK' ? 'warning' : 'success'}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <StatusBadge
          status={item.status === 'IN_STOCK' ? 'active' : item.status === 'LOW_STOCK' ? 'pending' : 'error'}
          label={item.status.replace('_', ' ')}
        />
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (item) => (
        <span className="text-gray-900 dark:text-white">${item.costPerUnit.toFixed(2)}/{item.unit.slice(0, -1)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '150px',
      render: (item) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowRestockDialog(true); }}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
          >
            Restock
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowDeleteDialog(true); }}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const transactionColumns: Column<Transaction>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (t) => format(new Date(t.createdAt), 'MMM d, yyyy h:mm a'),
    },
    {
      key: 'itemName',
      header: 'Item',
      render: (t) => <span className="font-medium">{t.itemName}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (t) => (
        <Badge
          variant={
            t.type === 'RESTOCK' ? 'success' :
            t.type === 'USAGE' ? 'warning' :
            t.type === 'RETURN' ? 'info' : 'default'
          }
        >
          {t.type}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (t) => (
        <span className={cn(
          'flex items-center gap-1',
          t.type === 'RESTOCK' || t.type === 'RETURN' ? 'text-green-600' : 'text-red-600'
        )}>
          {t.type === 'RESTOCK' || t.type === 'RETURN' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {t.type === 'RESTOCK' || t.type === 'RETURN' ? '+' : '-'}{Math.abs(t.quantity)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'By',
      render: (t) => `${t.user.firstName} ${t.user.lastName}`,
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (t) => t.notes || '-',
    },
  ];

  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.status === 'LOW_STOCK').length,
    outOfStock: items.filter(i => i.status === 'OUT_OF_STOCK').length,
    totalValue: items.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage cleaning supplies and equipment</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-xl font-bold text-green-600">${stats.totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <DataTable
            data={items}
            columns={itemColumns}
            keyField="id"
            searchable
            searchPlaceholder="Search items..."
            searchFields={['name', 'sku', 'category']}
            loading={loading}
            emptyMessage="No inventory items found"
          />
        </TabsContent>

        <TabsContent value="transactions">
          <DataTable
            data={transactions}
            columns={transactionColumns}
            keyField="id"
            searchable
            searchPlaceholder="Search transactions..."
            emptyMessage="No transactions found"
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onClose={() => { setShowAddDialog(false); setShowEditDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Qty</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost per Unit ($)</label>
                <input
                  type="number"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.01}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Warehouse A, Shelf 3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setShowAddDialog(false); setShowEditDialog(false); resetForm(); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
              Cancel
            </button>
            <button onClick={showEditDialog ? handleEdit : handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {showEditDialog ? 'Update' : 'Add Item'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onClose={() => setShowRestockDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Current stock: {selectedItem?.quantity} {selectedItem?.unit}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
              <input
                type="number"
                value={restockData.quantity}
                onChange={(e) => setRestockData({ ...restockData, quantity: parseInt(e.target.value) || 0 })}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={restockData.notes}
                onChange={(e) => setRestockData({ ...restockData, notes: e.target.value })}
                placeholder="e.g., PO #12345"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowRestockDialog(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
              Cancel
            </button>
            <button onClick={handleRestock} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Restock
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
