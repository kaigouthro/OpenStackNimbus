
import React, { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Select from '../../common/Select';
import ToggleSwitch from '../../common/ToggleSwitch';
import { KeystoneDomain } from '../../../types';
import { Eye, EyeOff } from 'lucide-react';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (payload: { name: string; domain_id: string; password?: string; enabled: boolean; description: string }) => void;
    domains: KeystoneDomain[];
    isLoading?: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onCreate, domains, isLoading }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [description, setDescription] = useState('');
    const [domainId, setDomainId] = useState<string>(domains.find(d => d.name.toLowerCase() === 'default')?.id || (domains.length > 0 ? domains[0].id : ''));
    const [enabled, setEnabled] = useState(true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !domainId) {
            alert("Username and Domain are required.");
            return;
        }
        onCreate({ name, domain_id: domainId, password: password || undefined, enabled, description });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Keystone User">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="new-user-name"
                    label="Username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="off"
                />
                <div className="relative">
                    <Input
                        id="new-user-password"
                        label="Password (optional)"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank for no password"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                 <Input
                    id="new-user-description"
                    label="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <Select
                    id="new-user-domain"
                    label="Domain"
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    required
                >
                    <option value="">-- Select a Domain --</option>
                    {domains.filter(d => d.enabled).map(domain => (
                        <option key={domain.id} value={domain.id}>
                            {domain.name}
                        </option>
                    ))}
                </Select>
                <ToggleSwitch
                    id="new-user-enabled"
                    label="Enable User"
                    isChecked={enabled}
                    onChange={setEnabled}
                />
                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-700">
                    <Button type="button" onClick={onClose} variant="outline" disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white" isLoading={isLoading} disabled={isLoading || !name || !domainId}>
                        Create User
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateUserModal;
