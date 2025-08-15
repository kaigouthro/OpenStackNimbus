


import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Card from '../../common/Card';
import ToggleSwitch from '../../common/ToggleSwitch';
import { Blocks, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import UserManagementPanel from './UserManagementPanel';

const SettingsPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isAdminModeEnabled, setIsAdminModeEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-slate-100">Settings</h2>
      
      <Card title="Application Settings">
        <div className="max-w-md space-y-4">
          <div>
            <ToggleSwitch 
              id="admin-mode-toggle"
              label="Enable Admin Mode"
              isChecked={isAdminModeEnabled}
              onChange={setIsAdminModeEnabled}
              disabled={!isAdmin}
            />
            <p className="text-xs text-slate-400 mt-2">
              {isAdmin 
                ? "See resources across all projects and access administrative features." 
                : "You must be logged in with an admin role to enable this feature."
              }
            </p>
          </div>
          {/* Add other general settings here in the future */}
        </div>
      </Card>

      {isAdmin && isAdminModeEnabled && (
        <div className="animate-fade-in space-y-6">
          <UserManagementPanel />
          <Card title="Other Administrative Features" className="border-dashed border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-700/50 rounded-lg text-center">
                <Blocks className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-200">Project Management</h3>
                <p className="text-sm text-slate-400 mt-1">Create, edit, and manage projects/tenants.</p>
                 <p className="text-xs text-yellow-400 mt-2">(Not yet implemented)</p>
              </div>
              <div className="p-6 bg-slate-700/50 rounded-lg text-center">
                <SlidersHorizontal className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-200">Flavor Management</h3>
                <p className="text-sm text-slate-400 mt-1">Manage instance flavors and access.</p>
                 <p className="text-xs text-yellow-400 mt-2">(Not yet implemented)</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card title="Authentication Details" className="border-dashed border-slate-600">
         <div className="p-4 bg-slate-900/50 rounded-lg flex items-start space-x-4">
            <ShieldAlert size={24} className="text-yellow-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Admin Status</h3>
              <p className="text-sm text-slate-400">
                Your current session token has {isAdmin ? <span className="text-green-400 font-bold">administrative privileges</span> : <span className="text-red-400 font-bold">no administrative privileges</span>}.
              </p>
               <p className="text-xs text-slate-500 mt-2">
                This is determined by checking for a role named 'admin' in your authentication token from Keystone.
              </p>
            </div>
         </div>
      </Card>
    </div>
  );
};

export default SettingsPanel;