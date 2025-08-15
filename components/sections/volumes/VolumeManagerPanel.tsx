
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchVolumes, fetchInstances,
    createVolumeAPI, deleteVolumeAPI, attachVolumeAPI, detachVolumeAPI
} from '../../../services/OpenStackAPIService';
import { Volume, Instance } from '../../../types';
import Button from '../../common/Button';
import CreateVolumeModal from './CreateVolumeModal';
import VolumeDetail from './VolumeDetail';
import Spinner from '../../common/Spinner';
import { PlusCircle, RefreshCw, Database, ChevronRight, Server } from 'lucide-react';
import Card from '../../common/Card';
import { useToast } from '../../../hooks/useToast';


const VolumeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let colorClasses = 'bg-slate-500 text-slate-100'; // Default
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'available') colorClasses = 'bg-green-500 text-green-100';
  else if (lowerStatus === 'in-use') colorClasses = 'bg-blue-500 text-blue-100';
  else if (lowerStatus.includes('creat') || lowerStatus.includes('attach') || lowerStatus.includes('detach') || lowerStatus.includes('downloading') || lowerStatus.includes('uploading')) colorClasses = 'bg-yellow-500 text-yellow-100 animate-pulse';
  else if (lowerStatus.includes('error')) colorClasses = 'bg-red-600 text-red-100';

  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>{status}</span>;
};

const VolumeManagerPanel: React.FC = () => {
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchData = useCallback(async (keepSelection = false) => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');

    if (!volumeUrl || !computeUrl) {
        const errorMsg = "Volume or Compute service endpoint not found in catalog.";
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsLoading(false);
        return;
    }

    try {
      const [volumeData, instanceData] = await Promise.all([
        fetchVolumes(authToken, volumeUrl),
        fetchInstances(authToken, computeUrl)
      ]);
      const formattedVolumes = volumeData.map(v => ({...v, type: v.type || v['volume_type'] }));
      setVolumes(formattedVolumes); 
      setInstances(instanceData);

      if (keepSelection && selectedVolume) {
          const updatedSelected = formattedVolumes.find(v => v.id === selectedVolume.id);
          setSelectedVolume(updatedSelected || null);
      } else if (!selectedVolume && formattedVolumes.length > 0) {
        //   setSelectedVolume(formattedVolumes[0]);
      } else if (formattedVolumes.length === 0) {
          setSelectedVolume(null);
      }

    } catch (err) {
      console.error("Error fetching volume data:", err);
      const errorMsg = `Failed to load volume data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, serviceCatalog, addToast, selectedVolume]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, serviceCatalog]);

  const handleCreateVolume = async (params: { name: string; size: number; type?: string, availabilityZone?: string }) => {
    if (!authToken || !serviceCatalog) { addToast("Cannot create: Not authenticated.", 'error'); return; }
    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    if (!volumeUrl) { addToast("Cannot create: Volume service endpoint not found.", 'error'); return; }
    
    setIsLoading(true);
    try {
      await createVolumeAPI(authToken, volumeUrl, { ...params });
      addToast(`Volume '${params.name}' creation initiated.`, 'success');
      setIsCreateModalOpen(false);
      setTimeout(() => fetchData(true), 3000); 
    } catch (err) {
      console.error("Error creating volume:", err);
      addToast(`Failed to create volume: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeAction = async (volumeId: string, action: 'delete' | 'attach' | 'detach', instanceId?: string) => {
    if (!authToken || !serviceCatalog) { addToast("Cannot perform action: Not authenticated.", 'error'); return; }
    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!volumeUrl || !computeUrl) { addToast("Service endpoint not found.", 'error'); return; }

    setIsLoading(true);
    try {
      if (action === 'delete') {
        if (!window.confirm("Are you sure you want to delete this volume?")) { setIsLoading(false); return; }
        await deleteVolumeAPI(authToken, volumeUrl, volumeId);
        addToast(`Volume ${volumeId} deletion initiated.`, 'success');
        setSelectedVolume(null);
      } else if (action === 'attach' && instanceId) {
        await attachVolumeAPI(authToken, computeUrl, instanceId, volumeId);
        addToast(`Attaching volume ${volumeId} to instance ${instanceId}.`, 'success');
      } else if (action === 'detach') {
        if (!window.confirm("Are you sure you want to detach this volume?")) { setIsLoading(false); return; }
        const volume = volumes.find(v => v.id === volumeId);
        const currentAttachment = volume?.attachments?.find(att => att.volume_id === volumeId);
        if (volume && currentAttachment?.server_id) {
          await detachVolumeAPI(authToken, computeUrl, currentAttachment.server_id, volumeId); 
          addToast(`Detaching volume ${volumeId}.`, 'success');
        } else {
          throw new Error("Volume not attached or attachment details missing.");
        }
      }
      setTimeout(() => fetchData(true), 3000); 
    } catch (err) {
       addToast(`Failed to ${action} volume: ${(err as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
    }
  };


  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to manage volumes.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-100">Volume Management</h2>
        <div className="space-x-2">
          <Button onClick={() => fetchData(true)} variant="outline" isLoading={isLoading} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading}>
            <PlusCircle size={18} className="mr-2" />
            <span className="hidden sm:inline">Create Volume</span>
          </Button>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Volume List */}
          <Card className="md:col-span-2 lg:col-span-2" contentClassName="p-2">
            <h3 className="text-lg font-medium text-slate-100 mb-3 px-2">Volumes ({volumes.length})</h3>
            {isLoading && volumes.length === 0 ? <Spinner text="Loading..."/> :
            <div className="space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
                {volumes.length > 0 ? volumes.map(vol => (
                    <button key={vol.id} onClick={() => setSelectedVolume(vol)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start space-x-3
                            ${selectedVolume?.id === vol.id ? 'bg-teal-500/20 ring-2 ring-teal-500 shadow-lg' : 'bg-slate-700 hover:bg-slate-600/70'}`}
                    >
                       <Database className={`mt-1 h-5 w-5 flex-shrink-0 ${selectedVolume?.id === vol.id ? 'text-teal-400' : 'text-slate-400'}`} />
                       <div className="flex-1 overflow-hidden">
                           <p className={`font-semibold truncate ${selectedVolume?.id === vol.id ? 'text-slate-100' : 'text-slate-200'}`}>{vol.name}</p>
                           <div className="text-xs text-slate-400 flex items-center mt-1 space-x-2">
                               <span>{vol.size} GB</span>
                               <span className="text-slate-600">•</span>
                               <VolumeStatusBadge status={vol.status}/>
                           </div>
                       </div>
                       <ChevronRight className={`h-5 w-5 text-slate-500 transition-transform ${selectedVolume?.id === vol.id ? 'translate-x-1' : ''}`} />
                    </button>
                )) : <p className="text-center text-slate-400 p-4">No volumes found.</p>}
            </div>
            }
          </Card>

          {/* Volume Details */}
          <div className="md:col-span-2 lg:col-span-3">
            {selectedVolume ? (
                <VolumeDetail 
                    key={selectedVolume.id} // Re-mount component on selection change
                    volume={selectedVolume}
                    instances={instances}
                    onAction={handleVolumeAction}
                    isLoading={isLoading}
                />
            ) : (
                <Card className="flex items-center justify-center min-h-[400px] h-full">
                    <div className="text-center">
                        <Database size={48} className="mx-auto text-slate-600" />
                        <h3 className="mt-2 text-lg font-medium text-slate-300">Select a volume</h3>
                        <p className="mt-1 text-sm text-slate-400">Select a volume from the list to see its details and manage it.</p>
                    </div>
                </Card>
            )}
          </div>
      </div>


      {isCreateModalOpen && (
        <CreateVolumeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateVolume}
        />
      )}
      <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Advice on volume types or sizes based on use case (e.g., "high-performance database").
      </p>
    </div>
  );
};

export default VolumeManagerPanel;
