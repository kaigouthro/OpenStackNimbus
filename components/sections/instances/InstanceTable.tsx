

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { Instance } from '../../../types';
import Button from '../../common/Button';
import { MoreVertical, Play, StopCircle, RefreshCw, Trash2, Terminal, Disc3, Archive, ArchiveRestore, Server, Cpu, Image as ImageIcon, Calendar } from 'lucide-react';
import Tooltip from '../../common/Tooltip'; 

// Helper to format date
const formatDate = (dateString: string) => new Date(dateString).toLocaleString();
const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}


// Instance status badge
const StatusBadge: React.FC<{ status: string, powerState: string }> = ({ status, powerState }) => {
  let colorClasses = 'bg-slate-500 text-slate-100'; // Default
  const lowerStatus = (status || '').toLowerCase();
  const lowerPowerState = (powerState || '').toLowerCase();

  if (lowerPowerState === 'running' && (lowerStatus === 'active' || lowerStatus === 'ok')) colorClasses = 'bg-green-500 text-green-100';
  else if (lowerPowerState === 'stopped' || lowerPowerState === 'shutoff' || lowerStatus === 'shutoff' || lowerStatus === 'stopped') colorClasses = 'bg-red-500 text-red-100';
  else if (lowerStatus.includes('shelved')) colorClasses = 'bg-sky-500 text-sky-100';
  else if (lowerPowerState === 'building' || lowerStatus.includes('build') || lowerStatus.includes('migrat') || lowerStatus.includes('rebuild') || lowerStatus.includes('resiz') || lowerStatus.includes('verify')) colorClasses = 'bg-yellow-500 text-yellow-100 animate-pulse';
  else if (lowerPowerState === 'error' || lowerStatus.includes('error')) colorClasses = 'bg-orange-600 text-orange-100';
  else if (lowerPowerState === 'paused' || lowerStatus === 'paused') colorClasses = 'bg-indigo-500 text-indigo-100';

  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>{status || 'N/A'}</span>;
};


interface InstanceTableProps {
  instances: Instance[];
  onAction: (instanceId: string, action: 'start' | 'stop' | 'reboot' | 'terminate' | 'get-console' | 'shelve' | 'unshelve' | 'attachVolume' | 'detachVolume') => void;
}

const InstanceTable: React.FC<InstanceTableProps> = ({ instances, onAction }) => {
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null); // Instance ID
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const [currentActionInstance, setCurrentActionInstance] = useState<Instance | null>(null);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const handleActionMenuToggle = useCallback((instance: Instance, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); 
    if (activeActionMenu === instance.id) {
      setActiveActionMenu(null);
      setCurrentActionInstance(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const containerRect = tableContainerRef.current?.getBoundingClientRect();

      if (containerRect) {
        let top = buttonRect.top - containerRect.top + buttonRect.height;
        let left = buttonRect.left - containerRect.left;
        
        // Adjust if menu would overflow right (224px is w-56)
        if (left + 224 > containerRect.width) { 
            left = buttonRect.right - containerRect.left - 224;
        }
        if (left < 0) left = 0;


        const menuHeightEstimate = 300; // Approximate height of the dropdown
        if (buttonRect.bottom + menuHeightEstimate > window.innerHeight) {
            top = buttonRect.top - containerRect.top - menuHeightEstimate;
        }
        if (top < 0) top = 0;


        setActionMenuPosition({ top, left });
        setCurrentActionInstance(instance);
        setActiveActionMenu(instance.id);
      }
    }
  }, [activeActionMenu]);
  
  const handleActionClick = (action: 'start' | 'stop' | 'reboot' | 'terminate' | 'get-console' | 'shelve' | 'unshelve' | 'attachVolume' | 'detachVolume') => {
    if (currentActionInstance) {
      onAction(currentActionInstance.id, action);
    }
    setActiveActionMenu(null);
    setCurrentActionInstance(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        const targetIsActionButton = (event.target as HTMLElement).closest('button[data-action-button="true"]');
        if (!targetIsActionButton) {
            setActiveActionMenu(null);
            setCurrentActionInstance(null);
        }
      }
    };

    if (activeActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeActionMenu]);


  return (
    <div className="flex-1 flex flex-col relative" ref={tableContainerRef}>
      {/* Header for large screens */}
       <div className="hidden lg:grid grid-cols-12 gap-x-6 px-6 py-3 bg-slate-700/50 font-medium text-xs text-slate-300 uppercase tracking-wider rounded-t-lg">
        <div className="col-span-3">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Flavor & Image</div>
        <div className="col-span-3">IP Addresses</div>
        <div className="col-span-2">Created</div>
      </div>
      
      <div className="lg:divide-y lg:divide-slate-700">
        {instances.map((instance) => (
          <div key={instance.id} className="lg:hover:bg-slate-700/30 transition-colors relative block p-4 lg:p-0 border-b border-slate-700 lg:border-none">
            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden">
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                      <Link to={`/instances/${instance.id}`} className="font-medium text-slate-100 hover:text-teal-400 text-base break-words">
                          {instance.name}
                      </Link>
                      <div className="mt-1 flex items-center space-x-2">
                          <StatusBadge status={(instance.status || '')} powerState={(instance.powerState || '')} />
                          <span className="text-xs text-slate-400">{instance.powerState}</span>
                      </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => handleActionMenuToggle(instance, e)} 
                    className="text-slate-400 hover:text-teal-400 -mr-2"
                    data-action-button="true"
                    aria-label={`Actions for ${instance.name}`}
                  >
                    <MoreVertical size={20} />
                  </Button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                      <div className="text-slate-400 font-medium mb-1 flex items-center"><Cpu size={14} className="mr-1.5"/> Flavor</div>
                      <div className="text-slate-200">{instance.flavor?.name || instance.flavor?.id || 'N/A'}</div>
                  </div>
                  <div>
                      <div className="text-slate-400 font-medium mb-1 flex items-center"><ImageIcon size={14} className="mr-1.5"/> Image</div>
                      <div className="text-slate-200 truncate">{instance.image?.name || instance.image?.id || 'N/A'}</div>
                  </div>
                   <div>
                      <div className="text-slate-400 font-medium mb-1 flex items-center"><Calendar size={14} className="mr-1.5"/> Created</div>
                      <Tooltip text={formatDate(instance.created)} position="bottom">
                         <div className="text-slate-200">{timeSince(instance.created)}</div>
                      </Tooltip>
                  </div>
                  <div>
                      <div className="text-slate-400 font-medium mb-1">IP Addresses</div>
                      <div className="text-slate-200 whitespace-pre-wrap break-all">{instance.ipAddress.split(', ').join('\n') || '-'}</div>
                  </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:grid grid-cols-12 gap-x-6 px-6 py-4 items-center">
              <div className="col-span-3 font-medium text-slate-100">
                  <Link to={`/instances/${instance.id}`} className="hover:text-teal-400 hover:underline break-all">
                    {instance.name}
                  </Link>
              </div>
              <div className="col-span-2">
                <div className="flex flex-col">
                    <StatusBadge status={(instance.status || '')} powerState={(instance.powerState || '')} />
                    <span className="text-xs text-slate-400 mt-1">{instance.powerState}</span>
                </div>
              </div>
              <div className="col-span-2 text-sm text-slate-300">
                  <div>{instance.flavor?.name || instance.flavor?.id || 'N/A'}</div>
                  <div className="text-xs text-slate-400 truncate" title={instance.image?.name || instance.image?.id}>{instance.image?.name || instance.image?.id || 'N/A'}</div>
              </div>
              <div className="col-span-3 text-sm text-slate-300 break-all">{instance.ipAddress || '-'}</div>
              <div className="col-span-2 text-sm text-slate-400">
                 <Tooltip text={formatDate(instance.created)} position="left">
                    <span>{timeSince(instance.created)}</span>
                 </Tooltip>
              </div>
              <div className="absolute top-1/2 right-4 -translate-y-1/2">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => handleActionMenuToggle(instance, e)} 
                    className="text-slate-400 hover:text-teal-400"
                    data-action-button="true"
                    aria-label={`Actions for ${instance.name}`}
                  >
                    <MoreVertical size={18} />
                  </Button>
              </div>
            </div>
          </div>
        ))}
         {instances.length === 0 && (
             <div className="flex-1 flex justify-center items-center p-10">
                <p className="text-slate-400">No instances to display.</p>
            </div>
        )}
      </div>

      {activeActionMenu && currentActionInstance && actionMenuPosition && (
        <div
          ref={actionMenuRef}
          className="absolute w-56 bg-slate-700 rounded-md shadow-xl z-20 border border-slate-600"
          style={{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <p className="px-4 pt-2 pb-1 text-xs text-slate-400 border-b border-slate-600 mb-1">
              Actions for: <span className="font-semibold text-slate-200 truncate block max-w-full">{currentActionInstance.name}</span>
            </p>
            
            {/* Power Actions */}
            {(currentActionInstance.powerState || '').toLowerCase() !== 'running' && 
             (currentActionInstance.status || '').toLowerCase() !== 'shelved' && 
             (currentActionInstance.status || '').toLowerCase() !== 'shelved_offloaded' && 
             (currentActionInstance.status || '').toLowerCase() !== 'build' &&
             (currentActionInstance.status || '').toLowerCase() !== 'error' &&
             (
              <button onClick={() => handleActionClick('start')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <Play size={16} className="mr-2 text-green-400" /> Start
              </button>
            )}
            {(currentActionInstance.powerState || '').toLowerCase() === 'running' && (currentActionInstance.status || '').toLowerCase() === 'active' && (
              <>
                <button onClick={() => handleActionClick('stop')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                  <StopCircle size={16} className="mr-2 text-yellow-400" /> Stop
                </button>
                <button onClick={() => handleActionClick('reboot')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                  <RefreshCw size={16} className="mr-2 text-blue-400" /> Reboot
                </button>
              </>
            )}

            {/* Shelve/Unshelve Actions */}
            {((currentActionInstance.status || '').toLowerCase() === 'active' || (currentActionInstance.status || '').toLowerCase() === 'shutoff') && (
              <button onClick={() => handleActionClick('shelve')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <Archive size={16} className="mr-2 text-sky-400" /> Shelve
              </button>
            )}
            {((currentActionInstance.status || '').toLowerCase() === 'shelved' || (currentActionInstance.status || '').toLowerCase() === 'shelved_offloaded') && (
              <button onClick={() => handleActionClick('unshelve')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <ArchiveRestore size={16} className="mr-2 text-sky-400" /> Unshelve
              </button>
            )}

            {/* Other Actions */}
             <Tooltip 
                text={!((currentActionInstance.status || '').toLowerCase() === 'active' && (currentActionInstance.powerState || '').toLowerCase() === 'running') ? "Console available for Active/Running instances" : "Open instance console"}
                position="left"
            >
                <button 
                    onClick={() => handleActionClick('get-console')} 
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!((currentActionInstance.status || '').toLowerCase() === 'active' && (currentActionInstance.powerState || '').toLowerCase() === 'running')}
                >
                    <Terminal size={16} className="mr-2" /> Get Console
                </button>
            </Tooltip>
            <Link to={`/instances/${currentActionInstance.id}?tab=volumes`} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <Disc3 size={16} className="mr-2" /> Manage Volumes
            </Link>
            
            {/* Destructive Actions */}
            <div className="border-t border-slate-600 my-1"></div>
            <button onClick={() => {
              if (window.confirm(`Are you sure you want to terminate instance "${currentActionInstance.name}"? This action cannot be undone.`)) {
                handleActionClick('terminate');
              } else {
                setActiveActionMenu(null); 
                setCurrentActionInstance(null);
              }
            }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-600 hover:text-red-300">
              <Trash2 size={16} className="mr-2" /> Terminate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceTable;
