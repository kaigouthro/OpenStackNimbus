
import React from 'react';
import { KeystoneUser } from '../../../types';
import Button from '../../common/Button';
import ToggleSwitch from '../../common/ToggleSwitch';
import Tooltip from '../../common/Tooltip';
import { Trash2 } from 'lucide-react';

interface UserTableProps {
    users: KeystoneUser[];
    onDelete: (userId: string, userName: string) => void;
    onToggleEnabled: (user: KeystoneUser, isEnabled: boolean) => void;
    isLoading?: boolean;
}

const UserTable: React.FC<UserTableProps> = ({ users, onDelete, onToggleEnabled, isLoading }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Domain</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User ID</th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Enabled</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-200">{user.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{user.domain?.name || user.domain_id || 'N/A'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 font-mono">{user.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                <ToggleSwitch 
                                    id={`enable-toggle-${user.id}`}
                                    label=""
                                    isChecked={user.enabled ?? false}
                                    onChange={(isChecked) => onToggleEnabled(user, isChecked)}
                                    disabled={isLoading}
                                />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                <Tooltip text="Delete User" position="left">
                                    <Button 
                                        onClick={() => onDelete(user.id, user.name)} 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-400 hover:text-red-300"
                                        disabled={isLoading}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </Tooltip>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {users.length === 0 && (
                <p className="text-center text-slate-400 py-6">No users found.</p>
            )}
        </div>
    );
};

export default UserTable;
