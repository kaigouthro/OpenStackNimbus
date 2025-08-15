
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { getServiceEndpoint, fetchUsers, fetchDomains, deleteUserAPI, updateUserAPI, createUserAPI } from '../../../services/OpenStackAPIService';
import { KeystoneUser, KeystoneDomain, CreateUserPayload } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import UserTable from './UserTable';
import CreateUserModal from './CreateUserModal';
import { Users, PlusCircle, RefreshCw } from 'lucide-react';

const UserManagementPanel: React.FC = () => {
    const { authToken, serviceCatalog } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState<KeystoneUser[]>([]);
    const [domains, setDomains] = useState<KeystoneDomain[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!authToken || !serviceCatalog) return;
        setIsLoading(true);
        setError(null);
        try {
            const identityUrl = getServiceEndpoint(serviceCatalog, 'identity');
            if (!identityUrl) throw new Error("Identity service endpoint not found.");

            const [usersData, domainsData] = await Promise.all([
                fetchUsers(authToken, identityUrl),
                fetchDomains(authToken, identityUrl)
            ]);
            setUsers(usersData);
            setDomains(domainsData);
        } catch (err) {
            const msg = `Failed to fetch user management data: ${(err as Error).message}`;
            setError(msg);
            addToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [authToken, serviceCatalog, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateUser = async (payload: Omit<CreateUserPayload['user'], 'password'> & { password?: string }) => {
        if (!authToken || !serviceCatalog) return;
        setIsLoading(true);
        try {
            const identityUrl = getServiceEndpoint(serviceCatalog, 'identity');
            if (!identityUrl) throw new Error("Identity service endpoint not found.");
            
            const createPayload: CreateUserPayload = { user: { ...payload }};
            if (!payload.password) {
                delete createPayload.user.password;
            }

            await createUserAPI(authToken, identityUrl, createPayload);
            addToast(`User '${payload.name}' created successfully.`, 'success');
            setIsCreateModalOpen(false);
            fetchData();
        } catch (err) {
            addToast(`Failed to create user: ${(err as Error).message}`, 'error');
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!authToken || !serviceCatalog) return;
        if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action is permanent.`)) return;

        setIsLoading(true);
        try {
            const identityUrl = getServiceEndpoint(serviceCatalog, 'identity');
            if (!identityUrl) throw new Error("Identity service endpoint not found.");
            await deleteUserAPI(authToken, identityUrl, userId);
            addToast(`User '${userName}' deleted successfully.`, 'success');
            fetchData();
        } catch (err) {
            addToast(`Failed to delete user: ${(err as Error).message}`, 'error');
            setIsLoading(false);
        }
    };

    const handleToggleUserEnabled = async (user: KeystoneUser, isEnabled: boolean) => {
        if (!authToken || !serviceCatalog) return;
        setIsLoading(true);
        try {
            const identityUrl = getServiceEndpoint(serviceCatalog, 'identity');
            if (!identityUrl) throw new Error("Identity service endpoint not found.");
            await updateUserAPI(authToken, identityUrl, user.id, { user: { enabled: isEnabled } });
            addToast(`User '${user.name}' has been ${isEnabled ? 'enabled' : 'disabled'}.`, 'success');
            fetchData();
        } catch (err) {
            addToast(`Failed to update user status: ${(err as Error).message}`, 'error');
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Users size={24} className="mr-3 text-teal-400" />
                    User Management
                </h3>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => fetchData()} variant="outline" size="sm" isLoading={isLoading} disabled={isLoading}>
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
                        <PlusCircle size={16} className="mr-2"/> Create User
                    </Button>
                </div>
            </div>
            
            {isLoading && users.length === 0 ? <Spinner text="Loading users..."/> :
            error ? <p className="text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p> :
            <UserTable 
                users={users} 
                onDelete={handleDeleteUser} 
                onToggleEnabled={handleToggleUserEnabled}
                isLoading={isLoading}
            />}

            {isCreateModalOpen && (
                <CreateUserModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateUser}
                    domains={domains}
                    isLoading={isLoading}
                />
            )}
        </Card>
    );
};

export default UserManagementPanel;
