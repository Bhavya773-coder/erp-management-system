import { useState, useEffect } from 'react';
import { fleetAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertCircle
} from 'lucide-react';

export default function AIAssetsView({ onBack }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'BARGE', 'TUG'

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

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.regNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || asset.classification === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: assets.length,
    barges: assets.filter(a => a.classification === 'BARGE').length,
    tugs: assets.filter(a => a.classification === 'TUG').length,
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
                <h1 className="text-2xl font-bold tracking-tight font-manrope">AI ASSET INTELLIGENCE</h1>
              </div>
              <p className="text-[#9E8E7E] text-xs font-medium uppercase tracking-widest">Autonomous Fleet Monitoring System</p>
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
            label="Barges" 
            value={stats.barges} 
            icon={<Anchor className="w-5 h-5 text-[#B7C8E1]" />} 
            color="secondary"
          />
          <MetricCard 
            label="Tugs" 
            value={stats.tugs} 
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
        <div className="max-w-6xl mx-auto flex items-center space-x-2">
          <FilterTab active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} label="ALL ASSETS" />
          <FilterTab active={filterType === 'BARGE'} onClick={() => setFilterType('BARGE')} label="BARGES" />
          <FilterTab active={filterType === 'TUG'} onClick={() => setFilterType('TUG')} label="TUGS" />
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
                  <th className="px-6 py-4">Reg No / Year</th>
                  <th className="px-6 py-4">Dimensions (m)</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303639]">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <LoadingRow key={i} />)
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-[#514537]">
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
                          <div className={`p-2 rounded-lg ${asset.classification === 'TUG' ? 'bg-[#00C5B1]/10 text-[#43E1CC]' : 'bg-[#E5A24A]/10 text-[#E5A24A]'}`}>
                            {asset.classification === 'TUG' ? <Activity className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#DEE3E7] uppercase">{asset.name || 'Unnamed Asset'}</p>
                            <p className="text-[10px] text-[#9E8E7E] uppercase tracking-tighter">{asset.type || 'Standard'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        <p className="text-[#DEE3E7]">{asset.regNo || 'N/A'}</p>
                        <p className="text-[#514537]">{asset.buildYear || 'Year Unknown'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#B7C8E1]">
                        {asset.length || '-'} x {asset.breadth || '-'} x {asset.depth || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusChip status={asset.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] text-[#9E8E7E] uppercase">{asset.location || 'Unknown Location'}</p>
                          <p className="text-[9px] text-[#514537] italic font-mono">{new Date(asset.updatedAt).toLocaleTimeString()}</p>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* AI Log / History */}
          <div className="mt-8">
            <div className="flex items-center space-x-3 mb-4">
              <History className="w-4 h-4 text-[#E5A24A]" />
              <h3 className="text-xs font-black text-[#9E8E7E] tracking-[0.3em] uppercase">Processing Intel</h3>
            </div>
            <div className="bg-[#090F12] rounded-2xl p-6 border border-[#303639] font-mono text-[11px] leading-relaxed">
              <p className="text-[#43E1CC] mb-1">[SYS] AI Engine version 2.4.0 active</p>
              <p className="text-[#9E8E7E] mb-1">[LOG] Last sync completed at {new Date().toLocaleTimeString()}</p>
              <p className="text-[#B7C8E1] mb-1">[INTEL] {stats.barges} Barges and {stats.tugs} Tugs verified against manifest</p>
              <p className="text-[#E5A24A]">[READY] System monitoring real-time fleet state</p>
            </div>
          </div>
        </div>
      </ScrollArea>
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
      className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
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
      <td className="px-6 py-4"><div className="h-4 bg-[#303639] rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-6 bg-[#303639] rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-[#303639] rounded w-16 ml-auto" /></td>
    </tr>
  );
}
