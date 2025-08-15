
import React, { useState } from 'react';
import { Volume, Instance } from '../../../types';
import Button from '../../common/Button';
import Select from '../../common/Select';
import { Trash2, Link as LinkIcon, Unlink, HardDrive, Server, Calendar, CheckSquare, XSquare, Hash } from 'lucide-react'; 
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';

const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon: React.ReactNode, children?: React.ReactNode }> = ({ label, value, icon, children }) => (
    <div className="py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-400 flex items-center">
        {icon}
        <span className="ml-2">{label}</span>
      </dt>
      <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2 break-words">
          {children || value || 'N/A'}
      </dd>
    </div>
);


interface VolumeDetailProps {
  volume: Volume;
  instances: Instance[]; 
  onAction: (volumeId: string, action: 'delete' | 'attach' | 'detach', instanceId?: string) => void;
  isLoading: boolean;
}

const VolumeDetail: React.FC<VolumeDetailProps> = ({ volume, instances, onAction, isLoading }) => {
  const [selectedInstanceToAttach, setSelectedInstanceToAttach] = useState<string>('');

  const handleActionClick = (action: 'delete' | 'attach' | 'detach') => {
    if (action === 'attach' && !selectedInstanceToAttach) {
        alert("Please select an instance to attach the volume to.");
        return;
    }
    onAction(volume.id, action, selectedInstanceToAttach);
  };
  
  const getAttachedInstanceName = (vol: Volume) => {
    if (vol.attachments && vol.attachments.length > 0) {
      const instanceId = vol.attachments[0].server_id;
      const instance = instances.find(i => i.id === instanceId);
      return instance ? (
          <div className="flex items-center">
              <Server size={14} className="mr-2 text-slate-400"/>
              <div>
                  {instance.name} on <span className="font-mono text-xs">{vol.attachments[0].device}</span>
              </div>
          </div>
      ) : <>{instanceId}</>;
    }
    return 'Not attached';
  };

  const isVolumeInUse = volume.status.toLowerCase() === 'in-use';
  const isVolumeAvailable = volume.status.toLowerCase() === 'available';

  const compatibleInstances = instances.filter(i => 
    i['OS-EXT-AZ:availability_zone'] === volume.availabilityZone &&
    (i.powerState === 'Running' || i.powerState === 'Shutoff')
  );

  return (
    <Card className="animate-fade-in">
        <div className="border-b border-slate-700 pb-4 mb-4">
            <h3 className="text-xl font-semibold text-slate-100 flex items-center">
                <HardDrive size={24} className="mr-3 text-teal-400"/>
                {volume.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 ml-1">ID: {volume.id}</p>
        </div>

        <dl className="divide-y divide-slate-700/50">
            <DetailItem label="Status" icon={<CheckSquare size={16}/>} >
                 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isVolumeInUse ? 'bg-blue-500' : isVolumeAvailable ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                    {volume.status}
                </span>
            </DetailItem>
            <DetailItem label="Size" value={`${volume.size} GB`} icon={<Hash size={16}/>}/>
            <DetailItem label="Type" value={volume.type} icon={<HardDrive size={16}/>}/>
            <DetailItem label="Availability Zone" value={volume.availabilityZone} icon={<Server size={16}/>}/>
            <DetailItem label="Bootable" value={volume.bootable === "true" ? 'Yes' : 'No'} icon={volume.bootable === 'true' ? <CheckSquare size={16}/> : <XSquare size={16}/>}/>
            <DetailItem label="Attached To" icon={<Server size={16}/>}>{getAttachedInstanceName(volume)}</DetailItem>
            <DetailItem label="Created" value={formatDate(volume.created)} icon={<Calendar size={16}/>}/>
        </dl>

        <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-lg font-medium text-slate-200 mb-3">Actions</h4>
            {isLoading && <Spinner text="Processing action..." size="sm" className="mb-4"/>}
            
            <div className="space-y-4">
                {isVolumeAvailable && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                        <label htmlFor="attach-instance-select" className="block text-sm font-medium text-slate-300 mb-2">Attach to Instance</label>
                        <div className="flex items-center space-x-2">
                             <Select 
                                id="attach-instance-select" 
                                value={selectedInstanceToAttach} 
                                onChange={e => setSelectedInstanceToAttach(e.target.value)}
                                containerClassName="flex-grow"
                                aria-label="Select instance to attach"
                                disabled={isLoading || compatibleInstances.length === 0}
                            >
                                <option value="">-- Select Compatible Instance --</option>
                                {compatibleInstances.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.status})</option>
                                ))}
                            </Select>
                            <Button onClick={() => handleActionClick('attach')} disabled={!selectedInstanceToAttach || isLoading}>
                                <LinkIcon size={16} className="mr-2"/> Attach
                            </Button>
                        </div>
                         {compatibleInstances.length === 0 && <p className="text-xs text-slate-500 mt-2">No compatible (Running/Shutoff) instances found in availability zone '{volume.availabilityZone}'.</p>}
                    </div>
                )}
                {isVolumeInUse && (
                     <Button onClick={() => handleActionClick('detach')} variant="outline" className="w-full" disabled={isLoading}>
                        <Unlink size={16} className="mr-2 text-yellow-400" /> Detach from Instance
                      </Button>
                )}
                <div className="border-t border-slate-600/50 my-2"></div>
                <Button 
                    onClick={() => handleActionClick('delete')} 
                    variant="danger" 
                    className="w-full"
                    disabled={isVolumeInUse || isLoading}
                    title={isVolumeInUse ? "Volume must be detached before it can be deleted" : "Delete Volume"}
                >
                    <Trash2 size={16} className="mr-2" /> Delete Volume
                </Button>
            </div>
        </div>
    </Card>
  );
};

export default VolumeDetail;
