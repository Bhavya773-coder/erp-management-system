import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { fleetAPI, fileAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  ArrowLeft,
  Search,
  Plus,
  Loader2,
  FolderOpen,
  FileIcon,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function FleetView({ onBack }) {
  const { user } = useAuthStore();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fleetAPI.getFiles();
      if (response.data.success) {
        setFiles(response.data.data.files);
      }
    } catch (error) {
      console.error('Failed to fetch fleet files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !description.trim()) return;

    setUploading(true);
    try {
      // 1. Upload the physical file
      const uploadRes = await fileAPI.uploadFile(selectedFile);
      const { fileUrl } = uploadRes.data.data;

      // 2. Save metadata to Fleet collection
      const fleetRes = await fleetAPI.uploadFile({
        fileName: selectedFile.name,
        fileUrl,
        description: description.trim(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      if (fleetRes.data.success) {
        setFiles([fleetRes.data.data.file, ...files]);
        setSelectedFile(null);
        setDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const response = await fleetAPI.deleteFile(id);
      if (response.data.success) {
        setFiles(files.filter(f => f._id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    // Ensure baseUrl doesn't end with slash and url starts with slash
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${normalizedBase}${normalizedUrl}`;
  };

  const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'repository'
  const [showUpload, setShowUpload] = useState(false);

  const filteredFiles = files.filter(f => 
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeTab === 'hub') {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
        {/* Hub Header */}
        <div className="p-4 sm:p-8 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack} 
                className="md:hidden rounded-full hover:bg-gray-100 mr-1"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Button>
              <div>
                <div className="flex items-center space-x-3 mb-1 sm:mb-2">
                  <div className="p-2 bg-whatsapp-primary rounded-xl shadow-lg shadow-whatsapp-primary/20 shrink-0">
                    <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase truncate">Resource Hub</h1>
                </div>
                <p className="text-gray-500 text-xs sm:text-lg font-medium">The central intelligence core for Arcadian Works.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onBack} className="hidden md:flex rounded-full hover:bg-gray-100 h-12 w-12">
              <X className="h-6 w-6 text-gray-400" />
            </Button>
          </div>
        </div>

        {/* Hub Grid & Sections */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {/* Utilities Section - Simple Raw Name Layout */}
            <div className="mb-12">
              <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-sm font-black text-whatsapp-primary uppercase tracking-[0.3em]">Utilities</h2>
                <div className="h-px bg-whatsapp-primary/10 flex-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm opacity-50 cursor-not-allowed">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">AI Intelligence</h4>
                      <p className="text-xs text-gray-400">Automated vessel data extraction (LOCKED)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Core Section */}
            <div>
              <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Operational Data</h2>
                <div className="h-px bg-gray-100 flex-1" />
              </div>
              <button
                onClick={() => setActiveTab('repository')}
                className="group p-8 bg-white rounded-[2.5rem] border-2 border-transparent shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:border-whatsapp-primary transition-all text-left flex flex-col h-64 relative overflow-hidden w-full sm:w-[48%]"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-whatsapp-primary/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500" />
                <div className="p-4 rounded-2xl bg-whatsapp-primary w-fit mb-8 relative z-10 shadow-lg shadow-whatsapp-primary/20">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-2 relative z-10">Fleet Repository</h3>
                <p className="text-gray-500 font-medium relative z-10">Manage and distribute shared company resources.</p>
                <div className="mt-auto flex items-center text-xs font-black text-whatsapp-primary group-hover:translate-x-2 transition-transform relative z-10 uppercase tracking-widest">
                  Initialize Access →
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setActiveTab('hub')} className="mr-2 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 bg-whatsapp-primary/10 rounded-lg mr-3 shrink-0 hidden sm:block">
            <FolderOpen className="w-5 h-5 text-whatsapp-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Fleet Repository</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">Shared company resources</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative w-32 sm:w-64 hidden xs:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-gray-50 border-none"
            />
          </div>
          <Button 
            variant="default" 
            size="sm" 
            className="lg:hidden bg-whatsapp-primary hover:bg-whatsapp-dark"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4 mr-2" />}
            <span className="hidden sm:inline">{showUpload ? 'Close' : 'Upload'}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main List Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4 pb-20 lg:pb-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-sm">Syncing repository...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-[2rem] bg-white/50">
                  <FolderOpen className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-lg font-semibold text-gray-600">No files found</p>
                  <p className="text-sm px-6 text-center">Be the first to contribute to the fleet database.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredFiles.map((file) => (
                    <div 
                      key={file._id}
                      className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-whatsapp-primary/30 transition-all flex items-center space-x-3 sm:space-x-4"
                    >
                      <div className="p-3 bg-whatsapp-primary/10 rounded-xl shrink-0">
                        <FileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-whatsapp-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">{file.fileName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">{file.description}</p>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            {format(new Date(file.createdAt), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-blue-600 font-medium">
                            By: {file.uploadedBy?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 sm:h-9 sm:w-9 text-whatsapp-primary hover:bg-whatsapp-primary/10 rounded-full"
                          onClick={() => window.open(getFullUrl(file.fileUrl), '_blank')}
                        >
                          <Download className="h-4 w-4 sm:h-5 sm:h-5" />
                        </Button>
                        {(user.role === 'ADMIN' || file.uploadedBy?._id === user.id) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 sm:h-9 sm:w-9 text-red-500 hover:bg-red-50 rounded-full"
                            onClick={() => handleDelete(file._id)}
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:h-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Upload Sidebar Area - Responsive Design */}
        <div className={`
          ${showUpload ? 'translate-y-0 opacity-100' : 'translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100'}
          fixed inset-x-0 bottom-0 z-30 lg:relative lg:inset-auto
          w-full lg:w-[360px]
          bg-white border-t lg:border-t-0 lg:border-l border-gray-200
          p-6 lg:p-8
          transition-all duration-300 ease-in-out
          rounded-t-[2.5rem] lg:rounded-none
          shadow-[0_-10px_40px_rgba(0,0,0,0.05)] lg:shadow-none
          max-h-[90dvh] lg:max-h-none overflow-y-auto
        `}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 lg:hidden" onClick={() => setShowUpload(false)} />
          
          <h2 className="text-xl lg:text-2xl font-black text-gray-900 mb-6 lg:mb-8 flex items-center">
            <div className="p-2 bg-whatsapp-primary rounded-xl mr-3 shadow-lg shadow-whatsapp-primary/20">
              <Upload className="w-5 h-5 text-white" />
            </div>
            Push Data
          </h2>

          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300
                ${selectedFile ? 'border-whatsapp-primary bg-whatsapp-primary/5 scale-102 shadow-inner' : 'border-gray-200 hover:border-whatsapp-primary/30 hover:bg-gray-50/50'}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              {selectedFile ? (
                <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                  <div className="p-4 bg-whatsapp-primary rounded-2xl mb-4 shadow-xl shadow-whatsapp-primary/20">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm font-bold text-whatsapp-dark truncate w-full px-4 mb-2">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-whatsapp-primary font-bold uppercase tracking-widest mb-4">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-500 font-bold hover:text-red-600 flex items-center bg-red-50 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3 mr-1.5" /> REMOVE FILE
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400 group">
                  <div className="p-4 bg-gray-100 rounded-2xl mb-4 group-hover:bg-whatsapp-primary/10 group-hover:text-whatsapp-primary transition-colors">
                    <Plus className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-600 mb-1">Drop file here</p>
                  <p className="text-[10px] font-medium opacity-60">PDF, IMAGES, DOCS (MAX 10MB)</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Metadata / Description</label>
              <Input 
                placeholder="What is this file for?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-50 border-transparent focus:bg-white focus:border-whatsapp-primary/50 text-sm h-14 rounded-2xl px-6 transition-all shadow-sm"
              />
            </div>

            <Button 
              className="w-full h-14 bg-whatsapp-primary hover:bg-whatsapp-dark text-white rounded-2xl shadow-2xl shadow-whatsapp-primary/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:scale-100 font-bold text-base"
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !description.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-3" />
                  PUBLISH TO FLEET
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-[2rem] text-[10px] text-gray-400 leading-relaxed border border-gray-100/50 shadow-inner">
            <div className="flex items-center mb-2">
              <FolderOpen className="w-3 h-3 mr-2 opacity-50" />
              <strong className="uppercase tracking-widest text-[9px]">Repository Notice</strong>
            </div>
            Data published here is synchronized across all company devices. Please ensure compliance with Arcadian Works document policies.
          </div>
        </div>
      </div>
      
      {/* Mobile Backdrop for Upload Panel */}
      {showUpload && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-20" 
          onClick={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
