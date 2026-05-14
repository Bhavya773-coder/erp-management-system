import { useState, useEffect } from 'react';
import { fleetAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Search,
  RefreshCw,
  Ship,
  Anchor,
  Activity,
  History,
  LayoutDashboard,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit2,
  MapPin,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function AIAssetsView({ onBack }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'IV', 'IRS', 'ON_HIRE'
  
  // Edit State
  const [editingAsset, setEditingAsset] = useState(null);
  const [editForm, setEditForm] = useState({ location: '', remark: '', status: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fleetAPI.getAssets();
      if (response.data.success) {
        setAssets(response.data.data.assets);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setEditForm({
      location: asset.location || '',
      remark: asset.remark || '',
      status: asset.status || 'IDLE'
    });
  };

  const handleUpdate = async () => {
    if (!editingAsset) return;
    setIsUpdating(true);
    try {
      const response = await fleetAPI.updateAsset(editingAsset._id, editForm);
      if (response.data.success) {
        const updatedAsset = response.data.data.asset;
        setAssets(assets.map(a => a._id === updatedAsset._id ? updatedAsset : a));
        setEditingAsset(null);
      }
    } catch (error) {
      console.error('Failed to update asset:', error);
      alert('Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.regNo?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === 'IV') matchesFilter = asset.classification === 'IV';
    else if (filterType === 'IRS') matchesFilter = asset.classification === 'IRS';
    else if (filterType === 'ON_HIRE') matchesFilter = asset.status === 'ON_HIRE';
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: assets.length,
    iv: assets.filter(a => a.classification === 'IV').length,
    irs: assets.filter(a => a.classification === 'IRS').length,
    onHire: assets.filter(a => a.status === 'ON_HIRE').length
  };

  return (
    <div className="h-full flex flex-col bg-[#0E1417] text-[#DEE3E7] overflow-hidden">
      {/* Premium Header */}
      <div className="p-6 bg-[#161C20] border-b border-[#303639]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="rounded-full hover:bg-[#303639] text-[#DEE3E7]"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <div className="p-2 bg-[#E5A24A] rounded-lg shadow-lg shadow-[#E5A24A]/20">
                  <LayoutDashboard className="w-6 h-6 text-[#0E1417]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight font-manrope uppercase">Fleet Intelligence</h1>
              </div>
              <p className="text-[#9E8E7E] text-xs font-medium uppercase tracking-widest">Real-time Asset Monitoring & Deployment</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E8E7E]" />
              <Input 
                placeholder="Search Reg No or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-[#090F12] border-none text-[#DEE3E7] placeholder:text-[#514537] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E5A24A]"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={fetchAssets}
              disabled={loading}
              className="h-10 w-10 rounded-xl bg-[#1A2024] hover:bg-[#303639] text-[#E5A24A]"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="p-6 bg-[#0E1417]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            label="Total Fleet" 
            value={stats.total} 
            icon={<Ship className="w-5 h-5 text-[#E5A24A]" />} 
            color="primary"
          />
          <MetricCard 
            label="IV Assets" 
            value={stats.iv} 
            icon={<Anchor className="w-5 h-5 text-[#B7C8E1]" />} 
            color="secondary"
          />
          <MetricCard 
            label="IRS Assets" 
            value={stats.irs} 
            icon={<Activity className="w-5 h-5 text-[#43E1CC]" />} 
            color="tertiary"
          />
          <MetricCard 
            label="On Hire" 
            value={stats.onHire} 
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} 
            color="success"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 pb-4">
        <div className="max-w-6xl mx-auto flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <FilterTab active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} label="ALL ASSETS" />
          <FilterTab active={filterType === 'IV'} onClick={() => setFilterType('IV')} label="IV" />
          <FilterTab active={filterType === 'IRS'} onClick={() => setFilterType('IRS')} label="IRS" />
          <FilterTab active={filterType === 'ON_HIRE'} onClick={() => setFilterType('ON_HIRE')} label="ON HIRE" />
        </div>
      </div>

      {/* Asset Table */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#161C20] rounded-2xl overflow-hidden border border-[#303639]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#090F12] text-[#9E8E7E] text-[10px] font-black tracking-[0.2em] uppercase">
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Location / Remarks</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Audit Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303639]">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <LoadingRow key={i} />)
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center text-[#514537]">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-bold">No assets identified</p>
                      <p className="text-xs uppercase tracking-widest mt-1">Upload a Fleet Excel to initialize data</p>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-[#1A2024] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${asset.classification === 'IRS' ? 'bg-[#00C5B1]/10 text-[#43E1CC]' : 'bg-[#E5A24A]/10 text-[#E5A24A]'}`}>
                            {asset.classification === 'IRS' ? <Activity className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#DEE3E7] uppercase truncate max-w-[200px]">{asset.name || 'Unnamed Asset'}</p>
                            <div className="flex items-center space-x-2 text-[10px] text-[#9E8E7E] uppercase tracking-tighter">
                              <span>{asset.classification}</span>
                              <span className="opacity-20">•</span>
                              <span>{asset.regNo || 'NO REG'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs">
                            <MapPin className="w-3 h-3 text-[#E5A24A]" />
                            <span className="text-[#DEE3E7] font-medium">{asset.location || 'Unknown'}</span>
                          </div>
                          {asset.remark && (
                            <p className="text-[10px] text-[#9E8E7E] italic line-clamp-1">"{asset.remark}"</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <StatusChip status={asset.status} />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-[#E5A24A]/10 text-[#E5A24A] sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditClick(asset)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end space-y-0.5">
                          {asset.lastUpdatedBy && (
                            <div className="flex items-center space-x-1 text-[10px] text-[#B7C8E1] font-bold">
                              <UserIcon className="w-2.5 h-2.5" />
                              <span className="uppercase">{asset.lastUpdatedBy.name}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1 text-[9px] text-[#514537] italic font-mono">
                            <Clock className="w-2 h-2" />
                            <span>{format(new Date(asset.updatedAt), 'dd MMM, HH:mm')}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollArea>

      {/* Edit Modal */}
      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent className="bg-[#161C20] border-[#303639] text-[#DEE3E7] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[#E5A24A] uppercase tracking-widest font-black">Edit Asset State</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs uppercase font-bold text-[#9E8E7E]">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                className="bg-[#090F12] border-[#303639] text-[#DEE3E7]"
                placeholder="Enter current location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark" className="text-xs uppercase font-bold text-[#9E8E7E]">Remarks</Label>
              <Input
                id="remark"
                value={editForm.remark}
                onChange={(e) => setEditForm({...editForm, remark: e.target.value})}
                className="bg-[#090F12] border-[#303639] text-[#DEE3E7]"
                placeholder="Enter additional notes"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-[#9E8E7E]">Operational Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {['IDLE', 'ON_HIRE', 'MAINTENANCE'].map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className={`text-[10px] font-black transition-all ${
                      editForm.status === s 
                        ? 'bg-[#E5A24A] text-[#0E1417] border-[#E5A24A]' 
                        : 'bg-[#090F12] border-[#303639] text-[#9E8E7E] hover:text-[#DEE3E7]'
                    }`}
                    onClick={() => setEditForm({...editForm, status: s})}
                  >
                    {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setEditingAsset(null)} 
              className="text-[#9E8E7E] hover:text-[#DEE3E7] hover:bg-[#303639]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="bg-[#E5A24A] hover:bg-[#D49139] text-[#0E1417] font-bold"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Update State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, icon, color }) {
  const colorMap = {
    primary: 'border-[#E5A24A]/20 bg-[#E5A24A]/5',
    secondary: 'border-[#B7C8E1]/20 bg-[#B7C8E1]/5',
    tertiary: 'border-[#43E1CC]/20 bg-[#43E1CC]/5',
    success: 'border-green-400/20 bg-green-400/5'
  };

  return (
    <div className={`p-5 rounded-3xl border ${colorMap[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
        <Activity className="w-3 h-3 text-[#514537] opacity-20" />
      </div>
      <p className="text-2xl font-black text-[#DEE3E7] font-manrope">{value}</p>
      <p className="text-[10px] font-black text-[#9E8E7E] uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function FilterTab({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all shrink-0 ${
        active 
          ? 'bg-[#E5A24A] text-[#0E1417] shadow-lg shadow-[#E5A24A]/20' 
          : 'text-[#9E8E7E] hover:text-[#DEE3E7] bg-[#161C20]'
      }`}
    >
      {label}
    </button>
  );
}

function StatusChip({ status }) {
  const configs = {
    ON_HIRE: { text: 'ON HIRE', color: 'text-[#43E1CC] bg-[#00C5B1]/10 border-[#43E1CC]/20' },
    IDLE: { text: 'IDLE', color: 'text-[#B7C8E1] bg-[#3A4A5F]/20 border-[#B7C8E1]/20' },
    MAINTENANCE: { text: 'REPAIR', color: 'text-[#FFB4AB] bg-[#93000A]/10 border-[#FFB4AB]/20' },
    DEFAULT: { text: 'UNKNOWN', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
  };

  const config = configs[status] || configs.DEFAULT;

  return (
    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black border tracking-tighter ${config.color}`}>
      {config.text}
    </span>
  );
}

function LoadingRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-8 bg-[#303639] rounded-lg w-32" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-[#303639] rounded w-20 mb-2" /><div className="h-3 bg-[#303639] rounded w-12" /></td>
      <td className="px-6 py-4"><div className="h-6 bg-[#303639] rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-[#303639] rounded w-16 ml-auto" /></td>
    </tr>
  );
}
