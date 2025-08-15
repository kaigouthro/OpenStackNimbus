

import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { SessionExportData } from '../../types';
import { LogIn, X, AlertTriangle, FileJson } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface ManualSessionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualSessionImportModal: React.FC<ManualSessionImportModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [sessionJsonBlob, setSessionJsonBlob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = () => {
    setError(null);
    if (!sessionJsonBlob.trim()) {
      setError('JSON content cannot be empty.');
      return;
    }
    setIsLoading(true);

    try {
      const parsedSessionBlob: SessionExportData = JSON.parse(sessionJsonBlob);
      
      if (!parsedSessionBlob.authUrl || !parsedSessionBlob.authToken || !parsedSessionBlob.serviceCatalog) {
        throw new Error('JSON is missing required fields: authUrl, authToken, serviceCatalog.');
      }
      if (!Array.isArray(parsedSessionBlob.serviceCatalog)) {
        throw new Error("Service Catalog in JSON must be an array.");
      }
      if (parsedSessionBlob.serviceCatalog.length === 0 && !window.confirm("Warning: The Service Catalog in the JSON is empty. This might limit application functionality. Continue?")) {
         setIsLoading(false);
         return;
      }

      login(
        parsedSessionBlob.authUrl,
        parsedSessionBlob.authToken,
        parsedSessionBlob.serviceCatalog,
        parsedSessionBlob.project || undefined,
        parsedSessionBlob.user || undefined,
        parsedSessionBlob.roles || undefined
      );
      localStorage.setItem('nimbus-lastAuthUrl', parsedSessionBlob.authUrl);
      addToast("Session imported successfully!", 'success');
      onClose();
    } catch (e) {
      console.error("Error importing session data:", e);
      const errorMessage = `Failed to parse JSON or import session: ${(e as Error).message}`;
      setError(errorMessage);
      addToast(errorMessage, 'error', 8000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exampleCombinedJson = `{
  "authUrl": "https://keystone.example.com:5000/v3",
  "authToken": "gAAAAAB...",
  "serviceCatalog": [
    { "type": "compute", "name": "nova", "endpoints": [...] }
  ],
  "project": { "id": "...", "name": "...", "domain": {...} },
  "user": { "id": "...", "name": "...", "domain": {...} },
  "roles": [ { "id": "...", "name": "admin" } ]
}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manually Import OpenStack Session" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle size={20} className="mr-2 mt-0.5 text-red-400 flex-shrink-0" />
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="manual-session-blob" className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
            <FileJson size={16} className="mr-2 text-teal-400" /> Combined Session JSON
          </label>
          <textarea
            id="manual-session-blob"
            value={sessionJsonBlob}
            onChange={(e) => { setSessionJsonBlob(e.target.value); }}
            placeholder={exampleCombinedJson}
            rows={15}
            className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
            aria-label="Combined Session JSON Input"
          />
          <p className="text-xs text-slate-500 mt-1">Paste the entire JSON content from an exported session file here.</p>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-700">
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          <X size={18} className="mr-2" /> Cancel
        </Button>
        <Button 
            onClick={handleImport} 
            className="bg-teal-500 hover:bg-teal-600 text-white" 
            isLoading={isLoading} 
            disabled={isLoading || !sessionJsonBlob.trim()}
        >
          <LogIn size={18} className="mr-2" /> Import Session
        </Button>
      </div>
       <p className="text-xs text-slate-500 mt-3">
        This feature is for development or debugging. Data is stored in your browser's local storage.
      </p>
    </Modal>
  );
};

export default ManualSessionImportModal;