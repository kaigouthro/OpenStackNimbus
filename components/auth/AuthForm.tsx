

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authenticateWithKeystone, KeystoneAuthResponse } from '../../services/OpenStackAPIService';
import { MOCK_SERVICES_ENABLED } from '../../services/serviceConfig';
import { mockServiceCatalog } from '../../services/MockOpenStackService';
import Button from '../common/Button';
import Input from '../common/Input';
import { Briefcase, LogIn, ShieldAlert, AlertTriangle } from 'lucide-react';
import { OpenStackEndpointConfig } from '../../types';

const AuthForm: React.FC = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [authUrl, setAuthUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [domainName, setDomainName] = useState('Default');
  const [projectIdentifier, setProjectIdentifier] = useState('');
  const [scopeByProjectId, setScopeByProjectId] = useState(false);
  const [projectDomainName, setProjectDomainName] = useState('Default');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [savedEndpoints, setSavedEndpoints] = useState<OpenStackEndpointConfig[]>([]);

  useEffect(() => {
    // Load saved endpoints
    const saved = localStorage.getItem('nimbus-savedEndpointConfigs');
    if (saved) {
      const parsedEndpoints = JSON.parse(saved);
      setSavedEndpoints(parsedEndpoints);
      // Set default auth URL if available and not already set
      if (parsedEndpoints.length > 0 && !authUrl) {
        setAuthUrl(parsedEndpoints[0].authUrl);
      }
    }
    
    // Pre-fill from last successful login or RC file import
    setAuthUrl(localStorage.getItem('nimbus-rcImport-authUrl') || localStorage.getItem('nimbus-lastAuthUrl') || authUrl);
    setUsername(localStorage.getItem('nimbus-rcImport-username') || '');
    setDomainName(localStorage.getItem('nimbus-rcImport-domainName') || 'Default');
    setProjectIdentifier(localStorage.getItem('nimbus-rcImport-projectIdentifier') || '');
    setScopeByProjectId(localStorage.getItem('nimbus-rcImport-scopeByProjectId') === 'true');
    setProjectDomainName(localStorage.getItem('nimbus-rcImport-projectDomainName') || 'Default');

    // Clean up RC import keys after loading
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('nimbus-rcImport-')) {
            localStorage.removeItem(key);
        }
    });

  }, []); // Run only once on mount

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const authResponse: KeystoneAuthResponse = await authenticateWithKeystone({
        authUrl,
        username,
        password,
        domainName,
        projectIdentifier,
        scopeByProjectId,
        projectDomainName,
      });
      
      const { token, data } = authResponse;
      login(authUrl, token, data.token.catalog || [], data.token.project, data.token.user, data.token.roles);
      localStorage.setItem('nimbus-lastAuthUrl', authUrl);
      addToast(`Welcome, ${data.token.user?.name}!`, 'success');

    } catch (err) {
      console.error("Login failed:", err);
      const errorMessage = (err as Error).message || "An unknown authentication error occurred.";
      setError(errorMessage);
      addToast(`Login failed: ${errorMessage}`, 'error', 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBypassLogin = () => {
    setIsLoading(true);
    login(
      "http://mock-api.local/identity/v3",
      "mock-auth-token",
      mockServiceCatalog, // Use the imported mock catalog
      { id: 'mock-project-id', name: 'Mock Project', domain: { id: 'mock-domain-id', name: 'mock-domain' } },
      { id: 'mock-user-id', name: 'Mock User', domain: { id: 'mock-domain-id', name: 'mock-domain' } },
      [{id: 'admin-role-id', name: 'admin'}] // Mock admin role
    );
    addToast("Entered application with mock data.", "info");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 shadow-xl rounded-lg p-8 border border-slate-700">
        <div className="text-center mb-8">
          <Briefcase className="mx-auto h-12 w-12 text-teal-400" />
          <h2 className="mt-4 text-3xl font-extrabold text-slate-100">NimbusEasyStack</h2>
          <p className="mt-2 text-slate-400">AI-Powered OpenStack Manager</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Input
              id="authUrl"
              label="Keystone Endpoint"
              value={authUrl}
              onChange={e => setAuthUrl(e.target.value)}
              required
              list="saved-endpoints"
              placeholder="https://keystone.example.com:5000/v3"
            />
            <datalist id="saved-endpoints">
              {savedEndpoints.map(ep => <option key={ep.id} value={ep.authUrl}>{ep.name}</option>)}
            </datalist>
          </div>
          <Input id="username" label="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input id="domainName" label="User Domain Name" type="text" value={domainName} onChange={e => setDomainName(e.target.value)} required />
          
          <div>
             <label htmlFor="projectIdentifier" className="block text-sm font-medium text-slate-300 mb-1">Project Scope</label>
             <div className="flex rounded-md shadow-sm">
                <div className="flex-shrink-0 z-10">
                  <button
                    type="button"
                    onClick={() => setScopeByProjectId(false)}
                    className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-r-0 border-slate-600 text-sm font-medium transition-colors ${!scopeByProjectId ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    aria-pressed={!scopeByProjectId}
                  >
                    Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeByProjectId(true)}
                    className={`relative -ml-px inline-flex items-center px-4 py-2 border border-slate-600 text-sm font-medium transition-colors ${scopeByProjectId ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    aria-pressed={scopeByProjectId}
                  >
                    ID
                  </button>
                </div>
                <Input 
                    id="projectIdentifier" 
                    value={projectIdentifier} 
                    onChange={e => setProjectIdentifier(e.target.value)} 
                    placeholder={scopeByProjectId ? 'Enter Project ID' : 'Enter Project Name'} 
                    className="rounded-l-none" 
                    containerClassName="flex-grow"
                    required 
                />
            </div>
          </div>
          
          {!scopeByProjectId && (
            <Input id="projectDomainName" label="Project Domain Name" type="text" value={projectDomainName} onChange={e => setProjectDomainName(e.target.value)} required />
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-md flex items-start text-sm">
                <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
            </div>
          )}

          <Button type="submit" fullWidth isLoading={isLoading} disabled={isLoading} leftIcon={<LogIn size={18} />}>
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
        </form>

        {MOCK_SERVICES_ENABLED && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-800 px-2 text-sm text-slate-400">Or</span>
              </div>
            </div>
            <Button
              onClick={handleBypassLogin}
              fullWidth
              variant="outline"
              className="border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-slate-900"
              leftIcon={<ShieldAlert size={16} />}
              isLoading={isLoading}
            >
              Bypass Login (Enter Mock Mode)
            </Button>
            <p className="text-xs text-slate-500 text-center mt-2">Mock services are enabled in development configuration.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;