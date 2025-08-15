

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchInstanceDetailsAPI, 
    fetchVolumes, fetchFlavors, fetchImages, fetchSecurityGroups,
    getInstanceConsoleUrlAPI, fetchInstanceActionsAPI,
    attachVolumeAPI, detachVolumeAPI, createVolumeAPI
} from '../../../services/OpenStackAPIService';
import { Instance, Volume, Flavor, Image as OpenStackImage, SecurityGroup, InstanceActionLog } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import { ArrowLeft, Server, Settings, Network, Shield, HardDrive, Terminal, Layers, Users, CalendarDays, Tag, Cpu, Zap, Disc3, KeyRound, ExternalLink, List, Link as LinkIcon, Unlink, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Select from '../../common/Select';
import CreateVolumeModal from '../volumes/CreateVolumeModal';

const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-slate-400 flex items-center">
      {icon && <span className="mr-2 text-teal-400">{icon}</span>}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2 break-all">{value ?? 'N/A'}</dd>
  </div>
);

type ActiveTab = 'overview' | 'volumes' | 'logs' | 'console';

const InstanceDetailPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();

  const [instance, setInstance] = useState<Instance | null>(null);
  const [allVolumes, setAllVolumes] = useState<Volume[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allImages, setAllImages] = useState<OpenStackImage[]>([]);
  const [allSecurityGroups, setAllSecurityGroups] = useState<SecurityGroup[]>([]);
  const [actionsLog, setActionsLog] = useState<InstanceActionLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [isVolumeActionLoading, setIsVolumeActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initialTab = searchParams.get('tab') as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'overview');
  
  const [selectedVolumeToAttach, setSelectedVolumeToAttach] = useState<string>('');
  const [isCreateVolumeModalOpen, setIsCreateVolumeModalOpen] = useState(false);


  const fetchData = useCallback(async (refreshVolumesOnly = false) => {
    if (!authToken || !serviceCatalog || !instanceId) {
      setError("Authentication details or instance ID missing.");
      setLoading(false);
      return;
    }

    if (!refreshVolumesOnly) setLoading(true);
    else setIsVolumeActionLoading(true);

    setError(null);

    try {
      const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
      const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');

      if (!computeUrl) throw new Error("Compute service endpoint not found.");
      
      const instanceDetailsPromise = fetchInstanceDetailsAPI(authToken, computeUrl, instanceId);
      
      // If only refreshing volumes (after an attach/detach)
      if (refreshVolumesOnly && volumeUrl) {
          const [volumeData, instanceData] = await Promise.all([
             fetchVolumes(authToken, volumeUrl),
             instanceDetailsPromise
          ]);
          setAllVolumes(volumeData);
          setInstance(instanceData);
          return;
      }
      
      const imageUrl = getServiceEndpoint(serviceCatalog, 'image');
      const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
      
      const volumesPromise = volumeUrl ? fetchVolumes(authToken, volumeUrl) : Promise.resolve([]);
      const flavorsPromise = fetchFlavors(authToken, computeUrl); 
      const imagesPromise = imageUrl ? fetchImages(authToken, imageUrl) : Promise.resolve([]); 
      const sgsPromise = networkUrl ? fetchSecurityGroups(authToken, networkUrl) : Promise.resolve([]);

      const [instanceData, volumeData, flavorData, imageData, sgData] = await Promise.all([
        instanceDetailsPromise, volumesPromise, flavorsPromise, imagesPromise, sgsPromise
      ]);
      
      const flavor = flavorData.find(f => f.id === instanceData.flavor.id);
      if (flavor) instanceData.flavor.name = flavor.name;
      
      const image = imageData.find(img => img.id === instanceData.image.id);
      if (image) instanceData.image.name = image.name;

      setInstance(instanceData);
      setAllVolumes(volumeData);
      setAllFlavors(flavorData); 
      setAllImages(imageData);   
      setAllSecurityGroups(sgData);

    } catch (err) {
      console.error("Error fetching instance details:", err);
      const errorMsg = `Failed to load instance details: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
      setIsVolumeActionLoading(false);
    }
  }, [authToken, serviceCatalog, instanceId, addToast]);
  
  const fetchLogs = useCallback(async () => {
    if (actionsLog.length > 0 || !instanceId || !authToken || !serviceCatalog) return;
    setIsLogLoading(true);
    try {
        const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
        if (!computeUrl) throw new Error("Compute service endpoint not found.");
        const { instanceActions } = await fetchInstanceActionsAPI(authToken, computeUrl, instanceId);
        setActionsLog(instanceActions.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()));
    } catch(err) {
        console.error("Error fetching action logs:", err);
        addToast(`Failed to load activity log: ${(err as Error).message}`, 'error');
    } finally {
        setIsLogLoading(false);
    }
  }, [actionsLog.length, instanceId, authToken, serviceCatalog, addToast]);
  
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
      // If tab changes to 'logs', fetch them
      if(activeTab === 'logs') {
          fetchLogs();
      }
  }, [activeTab, fetchLogs]);

  const handleTabChange = (tab: ActiveTab) => {
      setActiveTab(tab);
      setSearchParams({ tab });
  }

  const handleAttachVolume = async () => {
    if (!instance || !selectedVolumeToAttach) return;
    setIsVolumeActionLoading(true);
    try {
        const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
        if (!computeUrl) throw new Error("Compute service endpoint not found.");
        await attachVolumeAPI(authToken!, computeUrl, instance.id, selectedVolumeToAttach);
        addToast(`Attaching volume...`, 'info');
        setTimeout(() => fetchData(true), 3000);
        setSelectedVolumeToAttach('');
    } catch (err) {
        addToast(`Failed to attach volume: ${(err as Error).message}`, 'error');
        setIsVolumeActionLoading(false);
    }
  };
  
  const handleDetachVolume = async (volumeId: string) => {
    if (!instance) return;
    if (!window.confirm("Are you sure you want to detach this volume?")) return;

    setIsVolumeActionLoading(true);
    try {
        const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
        if (!computeUrl) throw new Error("Compute service endpoint not found.");
        await detachVolumeAPI(authToken!, computeUrl, instance.id, volumeId);
        addToast(`Detaching volume...`, 'info');
        setTimeout(() => fetchData(true), 3000);
    } catch (err) {
        addToast(`Failed to detach volume: ${(err as Error).message}`, 'error');
        setIsVolumeActionLoading(false);
    }
  };
  
  const handleCreateVolumeAndAttach = async (params: { name: string; size: number; type?: string; availabilityZone?: string }) => {
     if (!authToken || !serviceCatalog) { addToast("Cannot create: Not authenticated.", 'error'); return; }
     const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
     if (!volumeUrl) { addToast("Cannot create: Volume service endpoint not found.", 'error'); return; }
    
     setIsVolumeActionLoading(true);
     setIsCreateVolumeModalOpen(false);
     addToast(`Volume '${params.name}' creation initiated...`, 'info');

     try {
       const newVolume = await createVolumeAPI(authToken, volumeUrl, { ...params, availability_zone: instance?.['OS-EXT-AZ:availability_zone'] });
       addToast(`Volume '${params.name}' created. Waiting for it to become available...`, 'success');
       
       // Poll for volume to become available before attaching
       const pollVolumeStatus = async (volId: string): Promise<boolean> => {
          for(let i = 0; i < 10; i++) { // Poll for ~30 seconds
            await new Promise(res => setTimeout(res, 3000));
            const updatedVols = await fetchVolumes(authToken, volumeUrl);
            const targetVol = updatedVols.find(v => v.id === volId);
            if(targetVol?.status === 'available') {
              setAllVolumes(updatedVols); // update state with latest
              return true;
            }
          }
          return false;
       }

       const isAvailable = await pollVolumeStatus(newVolume.id);
       if(isAvailable) {
         addToast(`Volume is available. Attaching to instance...`, 'info');
         const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
         if (!computeUrl) throw new Error("Compute service endpoint not found for attaching.");
         await attachVolumeAPI(authToken!, computeUrl, instance!.id, newVolume.id);
         addToast(`Volume '${params.name}' attached successfully.`, 'success');
         setTimeout(() => fetchData(true), 2000);
       } else {
         throw new Error("Volume did not become available in time for attachment.");
       }

     } catch (err) {
       addToast(`Volume operation failed: ${(err as Error).message}`, 'error');
       setIsVolumeActionLoading(false);
     }
   };


  const attachedVolumesInfo = instance 
    ? (instance['os-extended-volumes:volumes_attached'] || [])
        .map(attached => allVolumes.find(v => v.id === attached.id))
        .filter(Boolean) as Volume[]
    : [];
  
  const availableVolumes = allVolumes.filter(v => v.status === 'available' && v.availabilityZone === instance?.['OS-EXT-AZ:availability_zone']);

  const instanceSecurityGroups = instance?.securityGroups
    ? allSecurityGroups.filter(sg => instance.securityGroups?.includes(sg.name)) 
    : [];

  const isConsoleActionable = instance?.status.toLowerCase() === 'active' && instance?.powerState.toLowerCase() === 'running';

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner text="Loading instance details..." size="lg" /></div>;
  if (error) return <div className="text-red-400 p-4 bg-red-900/30 rounded-md">{error}</div>;
  if (!instance) return <div className="text-center text-slate-400 py-8">Instance not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/instances" className="inline-flex items-center text-teal-400 hover:text-teal-300 mb-4">
        <ArrowLeft size={18} className="mr-2" /> Back to Instances List
      </Link>
      <h2 className="text-3xl font-semibold text-slate-100 flex items-center">
        <Server size={30} className="mr-3 text-teal-400" /> {instance.name}
      </h2>

      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {(['overview', 'volumes', 'logs', 'console'] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                  ${activeTab === tab ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
              >
                {tab}
              </button>
          ))}
        </nav>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card title="Instance Details">
                <dl>
                    <DetailItem label="ID" value={instance.id} icon={<Tag />} />
                    <DetailItem label="Status" value={instance.status} icon={<Server />} />
                    <DetailItem label="Power State" value={instance.powerState} icon={<Zap />} />
                    <DetailItem label="Availability Zone" value={instance['OS-EXT-AZ:availability_zone']} icon={<Layers />} />
                    <DetailItem label="Created" value={formatDate(instance.created)} icon={<CalendarDays />} />
                    <DetailItem label="User ID" value={instance.userId} icon={<Users />} />
                    <DetailItem label="Host ID" value={instance.hostId} icon={<Server />} />
                </dl>
                </Card>
                <Card title="Configuration">
                <dl>
                    <DetailItem label="Flavor" value={`${instance.flavor.name || instance.flavor.id} (${allFlavors.find(f=>f.id === instance.flavor.id)?.vcpus || 'N/A'} VCPUs, ${allFlavors.find(f=>f.id === instance.flavor.id)?.ram || 'N/A'} MB RAM, ${allFlavors.find(f=>f.id === instance.flavor.id)?.disk || 'N/A'} GB Disk)`} icon={<Cpu />}/>
                    <DetailItem label="Image" value={instance.image.name || instance.image.id} icon={<Disc3 />} />
                    <DetailItem label="Key Pair" value={instance.keyPair} icon={<KeyRound />} />
                </dl>
                </Card>
                <Card title="Networking">
                <dl>
                    <DetailItem label="IP Addresses" value={instance.ipAddress} icon={<Network />} />
                </dl>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card title="Security Groups">
                    {instanceSecurityGroups.length > 0 ? (
                        <ul className="space-y-1">
                        {instanceSecurityGroups.map(sg => (
                            <li key={sg.id} className="text-sm text-slate-300 p-2 bg-slate-700/50 rounded text-center font-medium">{sg.name}</li>
                        ))}
                        </ul>
                    ) : <p className="text-sm text-slate-400">No security groups associated.</p>}
                </Card>
            </div>
            </div>
        )}

        {activeTab === 'volumes' && (
            <div className="space-y-6">
                <Card title="Attached Volumes">
                    {isVolumeActionLoading && <Spinner text="Processing volume action..." size="sm" className="mb-2"/>}
                    {attachedVolumesInfo.length > 0 ? (
                        <ul className="space-y-2">
                        {attachedVolumesInfo.map(vol => (
                            <li key={vol.id} className="p-3 bg-slate-700/50 rounded flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-200">{vol.name}</p>
                                <p className="text-xs text-slate-400">Size: {vol.size} GB | Device: {vol.attachments?.find(att => att.volume_id === vol.id)?.device || 'N/A'}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleDetachVolume(vol.id)} disabled={isVolumeActionLoading}>
                                <Unlink size={14} className="mr-1.5"/> Detach
                            </Button>
                            </li>
                        ))}
                        </ul>
                    ) : <p className="text-sm text-slate-400 text-center py-4">No volumes attached.</p>}
                </Card>
                <Card title="Manage Volumes">
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-md font-medium text-slate-200 mb-2">Attach Existing Volume</h4>
                            <div className="flex items-center space-x-2">
                                <Select id="attach-volume-select" value={selectedVolumeToAttach} onChange={e => setSelectedVolumeToAttach(e.target.value)} containerClassName="flex-grow" disabled={isVolumeActionLoading || availableVolumes.length === 0}>
                                    <option value="">-- Select an available volume --</option>
                                    {availableVolumes.map(vol => (
                                        <option key={vol.id} value={vol.id}>{vol.name} ({vol.size}GB)</option>
                                    ))}
                                </Select>
                                <Button onClick={handleAttachVolume} disabled={!selectedVolumeToAttach || isVolumeActionLoading} leftIcon={<LinkIcon size={16}/>}>Attach</Button>
                            </div>
                            {availableVolumes.length === 0 && <p className="text-xs text-slate-500 mt-1">No available volumes found in this instance's availability zone ({instance['OS-EXT-AZ:availability_zone']}).</p>}
                        </div>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-600"></div></div>
                            <div className="relative flex justify-center"><span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span></div>
                        </div>
                        <div>
                            <h4 className="text-md font-medium text-slate-200 mb-2">Create a New Volume</h4>
                            <Button variant="outline" onClick={() => setIsCreateVolumeModalOpen(true)} disabled={isVolumeActionLoading} className="text-teal-400 border-teal-400 hover:bg-teal-400 hover:text-slate-900" leftIcon={<PlusCircle size={16}/>}>
                                Create & Attach New Volume
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'logs' && (
            <Card title="Activity Log">
            {isLogLoading ? <Spinner text="Loading activity log..."/> : actionsLog.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Action</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Result</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Start Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {actionsLog.map(log => (
                                <tr key={log.request_id}>
                                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">{log.action}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                        {log.message?.toLowerCase().includes('error') || log.message === "Error" ? 
                                            <span className="flex items-center text-red-400"><XCircle size={14} className="mr-1.5"/> Error</span> :
                                            <span className="flex items-center text-green-400"><CheckCircle size={14} className="mr-1.5"/> Success</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{formatDate(log.start_time)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="text-center text-slate-400 py-6">No activity logs found for this instance.</p>}
            </Card>
        )}

        {activeTab === 'console' && (
            <Card title="Instance Web Console">
            <div className="space-y-4">
                <p className="text-sm text-slate-400">
                Click the button below to attempt to load the web console for this instance.
                The console will open in a new browser window or tab.
                </p>
                <Button 
                onClick={() => getInstanceConsoleUrlAPI(authToken!, getServiceEndpoint(serviceCatalog, 'compute')!, instance.id).then(d => window.open(d.console.url, '_blank')).catch(e => addToast(e.message, 'error'))} 
                disabled={!isConsoleActionable}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                leftIcon={<ExternalLink size={18}/>}
                >
                Open Web Console
                </Button>
                {!isConsoleActionable && (
                <p className="text-xs text-yellow-400 bg-yellow-900/30 p-2 rounded-md">
                    Instance must be in ACTIVE state and Running power state to access the web console. 
                    Current status: {instance.status}, Power state: {instance.powerState}.
                </p>
                )}
                <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded min-h-[200px] flex flex-col items-center justify-center">
                <Terminal size={48} className="text-slate-600 mb-3" />
                <p className="text-slate-500 text-center">
                    This panel is for initiating console access. The console itself will open in a separate window provided by OpenStack.
                </p>
                </div>
            </div>
            </Card>
        )}
      </div>

      {isCreateVolumeModalOpen && (
        <CreateVolumeModal
          isOpen={isCreateVolumeModalOpen}
          onClose={() => setIsCreateVolumeModalOpen(false)}
          onCreate={handleCreateVolumeAndAttach}
        />
      )}
    </div>
  );
};

export default InstanceDetailPage;
