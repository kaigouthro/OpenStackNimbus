



import { Instance, Volume, Network, Image, SecurityGroup, Flavor, Quota, FloatingIP, KeyPair, SecurityGroupRule, Subnet, Port, Router, ServiceCatalogEntry, InstanceActionLog, KeystoneDomain, KeystoneUser, CreateUserPayload } from '../types';

const MOCK_DELAY = 200; // ms

export const mockServiceCatalog: ServiceCatalogEntry[] = [
  {
    id: 'cat-compute',
    type: 'compute',
    name: 'nova',
    endpoints: [{ id: 'ep-compute-public', region: 'MockRegion', interface: 'public', url: 'http://mock-api.local/compute/v2.1/mock-project-id', region_id: 'MockRegion' }],
  },
  {
    id: 'cat-volume',
    type: 'volumev3',
    name: 'cinder',
    endpoints: [{ id: 'ep-volume-public', region: 'MockRegion', interface: 'public', url: 'http://mock-api.local/volume/v3/mock-project-id', region_id: 'MockRegion' }],
  },
  {
    id: 'cat-network',
    type: 'network',
    name: 'neutron',
    endpoints: [{ id: 'ep-network-public', region: 'MockRegion', interface: 'public', url: 'http://mock-api.local/network', region_id: 'MockRegion' }],
  },
  {
    id: 'cat-image',
    type: 'image',
    name: 'glance',
    endpoints: [{ id: 'ep-image-public', region: 'MockRegion', interface: 'public', url: 'http://mock-api.local/image', region_id: 'MockRegion' }],
  },
  {
    id: 'cat-identity',
    type: 'identity',
    name: 'keystone',
    endpoints: [{ id: 'ep-identity-public', region: 'MockRegion', interface: 'public', url: 'http://mock-api.local/identity/v3', region_id: 'MockRegion' }],
  },
];


const mockFlavorsList: Flavor[] = [ // Renamed to avoid conflict with Instance.flavor
    { id: 'f-1', name: 'm1.tiny', vcpus: 1, ram: 512, disk: 1, isPublic: true },
    { id: 'f-2', name: 'm1.small', vcpus: 1, ram: 2048, disk: 20, isPublic: true },
    { id: 'f-3', name: 'm1.medium', vcpus: 2, ram: 4096, disk: 40, isPublic: true },
    { id: 'f-4', name: 'm1.large', vcpus: 4, ram: 8192, disk: 80, isPublic: true },
];

const mockImagesList: Image[] = [ // Renamed to avoid conflict
    { id: 'img-1', name: 'Ubuntu 22.04 LTS', osType: 'Linux', size: 2 * 1024 * 1024 * 1024, visibility: 'public', minDisk: 10, minRam: 512, status: 'active', created: new Date(Date.now() - 86400000 * 30).toISOString(), properties: { os_distro: 'ubuntu', os_version: '22.04', architecture: 'x86_64' } },
    { id: 'img-2', name: 'CentOS Stream 9', osType: 'Linux', size: 1.5 * 1024 * 1024 * 1024, visibility: 'public', minDisk: 8, minRam: 512, status: 'active', created: new Date(Date.now() - 86400000 * 20).toISOString(), properties: { os_distro: 'centos', os_version: '9-stream', architecture: 'x86_64' } },
    { id: 'img-3', name: 'Windows Server 2022 (Custom)', osType: 'Windows', size: 12 * 1024 * 1024 * 1024, visibility: 'private', minDisk: 40, minRam: 2048, status: 'active', created: new Date(Date.now() - 86400000 * 5).toISOString(), properties: { os_distro: 'windows', os_version: '2022', architecture: 'x86_64' } },
    { id: 'img-4', name: 'Fedora 38 Cloud', osType: 'Linux', size: 800 * 1024 * 1024, visibility: 'public', minDisk: 5, minRam: 1024, status: 'active', created: new Date(Date.now() - 86400000 * 15).toISOString(), properties: { os_distro: 'fedora', os_version: '38', architecture: 'x86_64' } },
];


const mockInstances: Instance[] = [
  { 
    id: 'inst-1', name: 'web-server-01', status: 'ACTIVE', 
    flavor: { id: 'f-2', name: 'm1.small' }, 
    image: {id: 'img-1', name: 'Ubuntu 22.04 LTS' }, 
    ipAddress: '10.0.0.5, 192.168.1.101', powerState: 'Running', 
    created: new Date(Date.now() - 86400000 * 2).toISOString(), 
    keyPair: 'my-ssh-key', securityGroups: ['default', 'web-sg'],
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-A', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-2', name: 'db-server-01', status: 'ACTIVE', 
    flavor: { id: 'f-3', name: 'm1.medium' }, 
    image: { id: 'img-2', name: 'CentOS Stream 9' }, 
    ipAddress: '10.0.0.6', powerState: 'Running', 
    created: new Date(Date.now() - 86400000 * 5).toISOString(), 
    keyPair: 'my-ssh-key', securityGroups: ['default', 'db-sg'],
    ['os-extended-volumes:volumes_attached']: [{id: 'vol-2'}],
    userId: 'user-id-456', hostId: 'compute-host-B', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-3', name: 'dev-vm', status: 'SHUTOFF', 
    flavor: { id: 'f-2', name: 'm1.small' }, 
    image: {id: 'img-4', name: 'Fedora 38 Cloud'}, 
    ipAddress: '', powerState: 'Shutoff', 
    created: new Date(Date.now() - 86400000 * 1).toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-A', ['OS-EXT-AZ:availability_zone']: 'zone1'
  },
  { 
    id: 'inst-4', name: 'build-worker-01', status: 'BUILD', 
    flavor: { id: 'f-4', name: 'm1.large' }, 
    image: {id: 'img-1', name: 'Ubuntu 22.04 LTS'}, 
    ipAddress: '', powerState: 'Building', 
    created: new Date().toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-789', hostId: 'compute-host-C', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-5', name: 'shelved-vm', status: 'SHELVED', 
    flavor: { id: 'f-1', name: 'm1.tiny' }, 
    image: {id: 'img-2', name: 'CentOS Stream 9'}, 
    ipAddress: '', powerState: 'Shutoff', 
    created: new Date(Date.now() - 86400000 * 7).toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-B', ['OS-EXT-AZ:availability_zone']: 'zone2'
  },
];

const mockVolumes: Volume[] = [
  { id: 'vol-1', name: 'data-disk-01', size: 50, status: 'available', type: 'ssd', bootable: "false", created: new Date(Date.now() - 86400000 * 3).toISOString(), availabilityZone: 'nova' },
  { id: 'vol-2', name: 'os-disk-db', size: 20, status: 'in-use', attachedTo: 'inst-2', attachments: [{server_id: 'inst-2', device: '/dev/vdb', attachment_id: 'vol-2', volume_id: 'vol-2'}], type: 'ssd', bootable: "true", created: new Date(Date.now() - 86400000 * 5).toISOString(), availabilityZone: 'nova' },
  { id: 'vol-3', name: 'backup-archive', size: 100, status: 'available', type: 'hdd', bootable: "false", created: new Date(Date.now() - 86400000 * 10).toISOString(), availabilityZone: 'cinder-az1' },
  { id: 'vol-4', name: 'available-ssd', size: 25, status: 'available', type: 'ssd', bootable: "false", created: new Date(Date.now() - 86400000 * 1).toISOString(), availabilityZone: 'nova' },
];

const mockSubnets: Subnet[] = [
    { id: 'sub-1', name: 'private-subnet-A', network_id: 'net-1', cidr: '10.0.0.0/24', ip_version: 4, gateway_ip: '10.0.0.1', enable_dhcp: true, allocation_pools: [{start: '10.0.0.2', end: '10.0.0.254'}]},
    { id: 'sub-2', name: 'public-subnet', network_id: 'net-2', cidr: '192.168.1.0/24', ip_version: 4, gateway_ip: '192.168.1.1', enable_dhcp: true, allocation_pools: [{start: '192.168.1.100', end: '192.168.1.200'}]},
    { id: 'sub-3', name: 'private-subnet-B', network_id: 'net-3', cidr: '10.0.1.0/24', ip_version: 4, gateway_ip: '10.0.1.1', enable_dhcp: true, allocation_pools: [{start: '10.0.1.2', end: '10.0.1.254'}]},
];


const mockNetworks: Network[] = [
    { id: 'net-1', name: 'private-network-A', subnet_ids: ['sub-1'], shared: false, status: 'ACTIVE', admin_state_up: true },
    { id: 'net-2', name: 'public-network', subnet_ids: ['sub-2'], shared: true, status: 'ACTIVE', admin_state_up: true, ['router:external']: true },
    { id: 'net-3', name: 'private-network-B', subnet_ids: ['sub-3'], shared: false, status: 'ACTIVE', admin_state_up: true },
];

const mockRouters: Router[] = [
    { id: 'router-1', name: 'main-router', status: 'ACTIVE', admin_state_up: true, external_gateway_info: { network_id: 'net-2', enable_snat: true }, ha: false },
    { id: 'router-2', name: 'internal-router', status: 'ACTIVE', admin_state_up: true, external_gateway_info: null, ha: false },
];

const mockPorts: Port[] = [
    // Router 1 interfaces
    { id: 'port-r1-privA', network_id: 'net-1', device_id: 'router-1', device_owner: 'network:router_interface', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.1' }], status: 'ACTIVE' },
    { id: 'port-r1-pub', network_id: 'net-2', device_id: 'router-1', device_owner: 'network:router_gateway', fixed_ips: [{ subnet_id: 'sub-2', ip_address: '192.168.1.50' }], status: 'ACTIVE' }, // Gateway port
    // Router 2 interfaces
    { id: 'port-r2-privB', network_id: 'net-3', device_id: 'router-2', device_owner: 'network:router_interface', fixed_ips: [{ subnet_id: 'sub-3', ip_address: '10.0.1.1' }], status: 'ACTIVE' },
    // Instance ports
    { id: 'port-inst1-privA', network_id: 'net-1', device_id: 'inst-1', device_owner: 'compute:nova', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.5'}], mac_address: 'fa:16:3e:11:22:33', status: 'ACTIVE'},
    { id: 'port-inst2-privA', network_id: 'net-1', device_id: 'inst-2', device_owner: 'compute:nova', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.6'}], mac_address: 'fa:16:3e:44:55:66', status: 'ACTIVE'},

];


const mockDefaultRuleSSH: SecurityGroupRule = { id: 'rule-ssh', direction: 'ingress', protocol: 'tcp', portRangeMin: 22, portRangeMax: 22, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultRuleHTTP: SecurityGroupRule = { id: 'rule-http', direction: 'ingress', protocol: 'tcp', portRangeMin: 80, portRangeMax: 80, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultRuleHTTPS: SecurityGroupRule = { id: 'rule-https', direction: 'ingress', protocol: 'tcp', portRangeMin: 443, portRangeMax: 443, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultEgress: SecurityGroupRule = { id: 'rule-egress-any', direction: 'egress', ethertype: 'IPv4', remoteIpPrefix: '0.0.0.0/0' };


const mockSecurityGroups: SecurityGroup[] = [
    { id: 'sg-1', name: 'default', description: 'Default security group', rules: [mockDefaultEgress] },
    { id: 'sg-2', name: 'web-sg', description: 'Allows HTTP/HTTPS and SSH', rules: [mockDefaultRuleSSH, mockDefaultRuleHTTP, mockDefaultRuleHTTPS, mockDefaultEgress] },
    { id: 'sg-3', name: 'db-sg', description: 'Allows SSH and internal DB access', rules: [mockDefaultRuleSSH, {id: 'rule-db', direction: 'ingress', protocol: 'tcp', portRangeMin: 3306, portRangeMax: 3306, remoteGroupId: 'sg-2', ethertype: 'IPv4'}, mockDefaultEgress] }, // Example of remote group
];



const mockQuotas: Quota[] = [
    { resource: 'Instances', used: mockInstances.length, limit: 20 },
    { resource: 'vCPUs', used: mockInstances.reduce((sum, i) => sum + (mockFlavorsList.find(f => f.id === i.flavor.id)?.vcpus || 0), 0) , limit: 50 },
    { resource: 'RAM (MB)', used: mockInstances.reduce((sum, i) => sum + (mockFlavorsList.find(f => f.id === i.flavor.id)?.ram || 0), 0), limit: 102400 }, // 100GB
    { resource: 'Volumes', used: mockVolumes.length, limit: 30 },
    { resource: 'Volume Storage (GB)', used: mockVolumes.reduce((sum, v) => sum + v.size, 0), limit: 1000 },
    { resource: 'Floating IPs', used: 1, limit: 10 },
    { resource: 'Networks', used: mockNetworks.length, limit: 5},
    { resource: 'Subnets', used: mockSubnets.length, limit: 10},
    { resource: 'Routers', used: mockRouters.length, limit: 3},
    { resource: 'Ports', used: mockPorts.length, limit: 50},
    { resource: 'Security Groups', used: mockSecurityGroups.length, limit: 20 },
];

const mockFloatingIPs: FloatingIP[] = [
    { id: 'fip-1', name: 'FIP for web-server-01', ipAddress: '192.168.1.101', associatedInstance: 'inst-1', pool: 'net-2', status: 'ACTIVE', port_id: 'port-for-inst-1' },
    { id: 'fip-2', name: 'Available FIP 1', ipAddress: '192.168.1.102', pool: 'net-2', status: 'DOWN' },
];

const mockKeyPairs: KeyPair[] = [
    { id: 'kp-1', name: 'my-ssh-key', fingerprint: 'ab:cd:ef:12:34:56:78:90:...', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...' },
    { id: 'kp-2', name: 'dev-key', fingerprint: '11:22:33:44:55:66:77:88:...', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQE...' },
];

const mockDomains: KeystoneDomain[] = [
    { id: 'default', name: 'Default', description: 'The default domain', enabled: true },
    { id: 'domain-one', name: 'Domain One', description: 'Custom domain one', enabled: true },
    { id: 'disabled-domain', name: 'Disabled Domain', description: 'A disabled domain', enabled: false },
];

const mockUsers: KeystoneUser[] = [
    { id: 'mock-user-id', name: 'Mock User', domain: { id: 'mock-domain-id', name: 'mock-domain' }, enabled: true, domain_id: 'mock-domain-id' },
    { id: 'user-2', name: 'jane.doe', domain: { id: 'default', name: 'Default' }, enabled: true, domain_id: 'default' },
    { id: 'user-3', name: 'john.smith', domain: { id: 'domain-one', name: 'Domain One' }, enabled: false, domain_id: 'domain-one' },
];


// --- Instances ---
export const fetchInstances = (token: string, computeUrl: string): Promise<Instance[]> => 
    new Promise(res => setTimeout(() => res([...mockInstances]), MOCK_DELAY));

export const fetchInstanceDetailsAPI = (token: string, computeUrl: string, instanceId: string): Promise<Instance> => 
    new Promise((resolve, reject) => {
        setTimeout(() => {
            const instance = mockInstances.find(i => i.id === instanceId);
            if (instance) {
                const flavorDetail = mockFlavorsList.find(f => f.id === instance.flavor.id);
                const imageDetail = mockImagesList.find(img => img.id === instance.image.id);
                if(flavorDetail) instance.flavor.name = flavorDetail.name;
                if(imageDetail) instance.image.name = imageDetail.name;
                resolve({ ...instance });
            } else {
                reject(new Error(`Mock Error: Instance with ID ${instanceId} not found.`));
            }
        }, MOCK_DELAY);
    });

export const launchInstanceAPI = (token: string, computeUrl: string, params: any): Promise<Instance> => 
    new Promise(res => {
        setTimeout(() => {
            const flavorDetail = mockFlavorsList.find(f => f.id === params.flavorId);
            const imageDetail = mockImagesList.find(img => img.id === params.imageId);
            const newInstance: Instance = {
                id: `inst-${Date.now()}`,
                name: params.name || 'new-instance',
                status: 'BUILD',
                flavor: { id: flavorDetail?.id || 'f-unknown', name: flavorDetail?.name || 'unknown-flavor' },
                image: { id: imageDetail?.id || 'img-unknown', name: imageDetail?.name || 'unknown-image' },
                ipAddress: '',
                powerState: 'Building',
                created: new Date().toISOString(),
                userId: 'mock-user-id',
                hostId: `compute-host-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
                ['os-extended-volumes:volumes_attached']: [],
                ['OS-EXT-AZ:availability_zone']: 'nova',
                ...params
            } as Instance;
            mockInstances.push(newInstance);
            setTimeout(() => {
                const idx = mockInstances.findIndex(i => i.id === newInstance.id);
                if (idx !== -1) {
                    mockInstances[idx].status = 'ACTIVE';
                    mockInstances[idx].powerState = 'Running';
                    mockInstances[idx].ipAddress = `10.0.0.${Math.floor(Math.random() * 250) + 10}`;
                }
            }, 3000);
            res(newInstance);
        }, MOCK_DELAY);
    });

export const terminateInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> => 
    new Promise(res => {
        setTimeout(() => {
            const idx = mockInstances.findIndex(i => i.id === instanceId);
            if (idx !== -1) mockInstances.splice(idx, 1);
            res();
        }, MOCK_DELAY);
    });

export const controlInstancePowerAPI = (token: string, computeUrl: string, instanceId: string, action: 'os-start' | 'os-stop' | 'reboot'): Promise<void> => 
    new Promise(res => {
        setTimeout(() => {
            const instance = mockInstances.find(i => i.id === instanceId);
            if (instance) {
                if (action === 'os-start' && instance.status !== 'SHELVED') {
                    instance.powerState = 'Running';
                    instance.status = 'ACTIVE';
                } else if (action === 'os-stop' && instance.status !== 'SHELVED') {
                    instance.powerState = 'Shutoff';
                    instance.status = 'SHUTOFF';
                } else if (action === 'reboot' && instance.status !== 'SHELVED') {
                    instance.powerState = 'Building';
                    instance.status = 'REBOOT';
                    setTimeout(() => {
                        instance.powerState = 'Running';
                        instance.status = 'ACTIVE';
                    }, 3000);
                }
            }
            res();
        }, MOCK_DELAY);
    });

export const getInstanceConsoleUrlAPI = (token: string, computeUrl: string, instanceId: string, consoleType?: 'novnc' | 'spice-html5' | 'serial'): Promise<{ console: { type: string, url: string } }> =>
    new Promise(res => {
        setTimeout(() => {
            console.log(`Mock: Getting ${consoleType} console for ${instanceId}`);
            res({ console: { type: consoleType || 'novnc', url: `https://mock-console.example.com/${consoleType || 'novnc'}/?token=dummy-token-for-${instanceId}` } });
        }, MOCK_DELAY);
    });

export const shelveInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> =>
    new Promise(res => {
        setTimeout(() => {
            const instance = mockInstances.find(i => i.id === instanceId);
            if (instance) {
                instance.status = 'SHELVED';
                instance.powerState = 'Shutoff';
            }
            res();
        }, MOCK_DELAY);
    });

export const unshelveInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> =>
    new Promise(res => {
        setTimeout(() => {
            const instance = mockInstances.find(i => i.id === instanceId);
            if (instance && instance.status.toLowerCase().includes('shelved')) {
                instance.status = 'ACTIVE';
                instance.powerState = 'Running';
            }
            res();
        }, MOCK_DELAY);
    });


export const fetchInstanceActionsAPI = (token: string, computeUrl: string, instanceId: string): Promise<{ instanceActions: InstanceActionLog[] }> => {
    return new Promise(res => {
        setTimeout(() => {
            const genericActions: Omit<InstanceActionLog, 'instance_uuid'>[] = [
                { action: 'stop', request_id: 'req-2', start_time: new Date(Date.now() - 3600000).toISOString(), message: 'Instance stopped successfully.', user_id: 'mock-user-id', project_id: 'mock-project-id' },
                { action: 'start', request_id: 'req-3', start_time: new Date(Date.now() - 1800000).toISOString(), message: 'Instance started successfully.', user_id: 'mock-user-id', project_id: 'mock-project-id' },
                { action: 'reboot', request_id: 'req-4', start_time: new Date().toISOString(), message: null, user_id: 'mock-user-id', project_id: 'mock-project-id' },
            ];

            const createAction: Omit<InstanceActionLog, 'instance_uuid'> = {
                action: 'create', request_id: 'req-1', start_time: new Date(Date.now() - 86400000 * 2).toISOString(), message: 'Instance created successfully from image xyz.', user_id: 'mock-user-id', project_id: 'mock-project-id'
            };

            const actions = [createAction, ...genericActions].map(a => ({...a, instance_uuid: instanceId}));
            
            res({ instanceActions: actions });
        }, MOCK_DELAY);
    });
};


// --- Volumes ---
export const fetchVolumes = (token: string, volumeUrl: string): Promise<Volume[]> =>
    new Promise(res => setTimeout(() => res([...mockVolumes]), MOCK_DELAY));

export const createVolumeAPI = (token: string, volumeUrl: string, params: { name: string; size: number; type?: string; availability_zone?: string }): Promise<Volume> =>
    new Promise(res => {
        setTimeout(() => {
            const newVolume: Volume = {
                id: `vol-${Date.now()}`,
                name: params.name,
                size: params.size,
                status: 'creating',
                type: params.type || 'ssd',
                bootable: "false",
                created: new Date().toISOString(),
                availabilityZone: params.availability_zone || 'nova',
            };
            mockVolumes.push(newVolume);
            setTimeout(() => {
                const idx = mockVolumes.findIndex(v => v.id === newVolume.id);
                if (idx !== -1) mockVolumes[idx].status = 'available';
            }, 3000);
            res(newVolume);
        }, MOCK_DELAY);
    });

export const deleteVolumeAPI = (token: string, volumeUrl: string, volumeId: string): Promise<void> =>
    new Promise(res => {
        setTimeout(() => {
            const idx = mockVolumes.findIndex(v => v.id === volumeId);
            if (idx !== -1) mockVolumes.splice(idx, 1);
            res();
        }, MOCK_DELAY);
    });

export const attachVolumeAPI = (token: string, computeUrl: string, instanceId: string, volumeId: string): Promise<any> =>
    new Promise(res => {
        setTimeout(() => {
            const volume = mockVolumes.find(v => v.id === volumeId);
            const instance = mockInstances.find(i => i.id === instanceId);
            if (volume && instance) {
                volume.status = 'attaching';
                setTimeout(() => {
                    volume.status = 'in-use';
                    volume.attachedTo = instanceId;
                    const attachment = { server_id: instanceId, device: '/dev/vd' + String.fromCharCode(98 + (instance['os-extended-volumes:volumes_attached']?.length || 0)), attachment_id: volumeId, volume_id: volumeId };
                    volume.attachments = [attachment];
                    
                    if (!instance['os-extended-volumes:volumes_attached']) {
                        instance['os-extended-volumes:volumes_attached'] = [];
                    }
                    instance['os-extended-volumes:volumes_attached']?.push({ id: volumeId });

                    res({volumeAttachment: { id: volumeId }});
                }, 2000);
            }
        }, MOCK_DELAY);
    });

export const detachVolumeAPI = (token: string, computeUrl: string, instanceId: string, attachmentId: string): Promise<void> =>
    new Promise(res => {
        setTimeout(() => {
            const volume = mockVolumes.find(v => v.id === attachmentId); // in this API, attachmentId is volumeId
            const instance = mockInstances.find(i => i.id === instanceId);
            if (volume && instance) {
                volume.status = 'detaching';
                if (instance['os-extended-volumes:volumes_attached']) {
                   instance['os-extended-volumes:volumes_attached'] = instance['os-extended-volumes:volumes_attached']?.filter(v => v.id !== volume.id);
                }

                setTimeout(() => {
                    volume.status = 'available';
                    volume.attachedTo = undefined;
                    volume.attachments = [];
                    res();
                }, 2000);
            }
        }, MOCK_DELAY);
    });

// --- Networks ---
export const fetchNetworks = (token: string, networkUrl: string): Promise<Network[]> =>
    new Promise(res => setTimeout(() => res([...mockNetworks]), MOCK_DELAY));

export const fetchSubnetsAPI = (token: string, networkUrl: string, networkId?: string): Promise<Subnet[]> => 
    new Promise(res => setTimeout(() => {
        if (networkId) {
            res([...mockSubnets.filter(s => s.network_id === networkId)]);
        } else {
            res([...mockSubnets]);
        }
    }, MOCK_DELAY));

export const fetchRoutersAPI = (token: string, networkUrl: string): Promise<Router[]> => 
    new Promise(res => setTimeout(() => res([...mockRouters]), MOCK_DELAY));

export const fetchPortsAPI = (token: string, networkUrl: string, queryParams?: Record<string, string>): Promise<Port[]> => 
    new Promise(res => setTimeout(() => {
        let filteredPorts = [...mockPorts];
        if (queryParams) {
            if (queryParams.device_id) {
                filteredPorts = filteredPorts.filter(p => p.device_id === queryParams.device_id);
            }
            if (queryParams.network_id) {
                filteredPorts = filteredPorts.filter(p => p.network_id === queryParams.network_id);
            }
            if (queryParams.device_owner) {
                filteredPorts = filteredPorts.filter(p => p.device_owner === queryParams.device_owner);
            }
        }
        res(filteredPorts);
    }, MOCK_DELAY));

// --- Floating IPs ---
export const fetchFloatingIPs = (token: string, networkUrl: string): Promise<FloatingIP[]> =>
    new Promise(res => setTimeout(() => res([...mockFloatingIPs]), MOCK_DELAY));

export const allocateFloatingIPAPI = (token: string, networkUrl: string, poolNetworkId: string): Promise<FloatingIP> =>
    new Promise(res => setTimeout(() => {
        const newFip: FloatingIP = {
            id: `fip-${Date.now()}`,
            name: `Allocated FIP ${Date.now()}`,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 150) + 103}`,
            pool: poolNetworkId,
            status: 'DOWN'
        };
        mockFloatingIPs.push(newFip);
        res(newFip);
    }, MOCK_DELAY));

export const releaseFloatingIPAPI = (token: string, networkUrl: string, fipId: string): Promise<void> =>
    new Promise(res => setTimeout(() => {
        const idx = mockFloatingIPs.findIndex(fip => fip.id === fipId);
        if (idx !== -1) mockFloatingIPs.splice(idx, 1);
        res();
    }, MOCK_DELAY));

export const associateFloatingIPAPI = (token: string, networkUrl: string, fipId: string, portId: string): Promise<FloatingIP> =>
    new Promise(res => setTimeout(() => {
        const fip = mockFloatingIPs.find(f => f.id === fipId);
        if (fip) {
            // portId in mock is actually instanceId for simplicity
            fip.associatedInstance = portId;
            fip.port_id = `mock-port-for-${portId}`;
            fip.status = 'ACTIVE';
            res(fip);
        }
    }, MOCK_DELAY));

export const disassociateFloatingIPAPI = (token: string, networkUrl: string, fipId: string): Promise<FloatingIP> =>
    new Promise(res => setTimeout(() => {
        const fip = mockFloatingIPs.find(f => f.id === fipId);
        if (fip) {
            fip.associatedInstance = undefined;
            fip.port_id = null;
            fip.status = 'DOWN';
            res(fip);
        }
    }, MOCK_DELAY));

// --- Images ---
export const fetchImages = (token: string, imageUrl: string): Promise<Image[]> =>
    new Promise(res => setTimeout(() => res([...mockImagesList]), MOCK_DELAY));

// --- Security Groups ---
export const fetchSecurityGroups = (token: string, networkUrl: string): Promise<SecurityGroup[]> =>
    new Promise(res => setTimeout(() => res([...mockSecurityGroups]), MOCK_DELAY));

export const createSecurityGroupAPI = (token: string, networkUrl: string, name: string, description: string): Promise<SecurityGroup> =>
    new Promise(res => setTimeout(() => {
        const newSg: SecurityGroup = { id: `sg-${Date.now()}`, name, description, rules: [mockDefaultEgress] };
        mockSecurityGroups.push(newSg);
        res(newSg);
    }, MOCK_DELAY));

export const deleteSecurityGroupAPI = (token: string, networkUrl: string, sgId: string): Promise<void> =>
    new Promise(res => setTimeout(() => {
        const idx = mockSecurityGroups.findIndex(sg => sg.id === sgId);
        if (idx !== -1) mockSecurityGroups.splice(idx, 1);
        res();
    }, MOCK_DELAY));

export const addSecurityGroupRuleAPI = (token: string, networkUrl: string, rule: Omit<SecurityGroupRule, 'id' | 'project_id'>): Promise<SecurityGroupRule> =>
    new Promise(res => setTimeout(() => {
        const sg = mockSecurityGroups.find(s => s.id === rule.security_group_id);
        const newRule = { ...rule, id: `rule-${Date.now()}` } as SecurityGroupRule;
        if (sg) sg.rules.push(newRule);
        res(newRule);
    }, MOCK_DELAY));

export const deleteSecurityGroupRuleAPI = (token: string, networkUrl: string, ruleId: string): Promise<void> =>
    new Promise(res => setTimeout(() => {
        let sgFound: SecurityGroup | undefined;
        for (const sg of mockSecurityGroups) {
            const ruleIndex = sg.rules.findIndex(r => r.id === ruleId);
            if (ruleIndex !== -1) {
                sg.rules.splice(ruleIndex, 1);
                sgFound = sg;
                break;
            }
        }
        res();
    }, MOCK_DELAY));

// --- Flavors & KeyPairs ---
export const fetchFlavors = (token: string, computeUrl: string): Promise<Flavor[]> =>
    new Promise(res => setTimeout(() => res([...mockFlavorsList]), MOCK_DELAY));

export const fetchKeyPairs = (token: string, computeUrl: string): Promise<KeyPair[]> =>
    new Promise(res => setTimeout(() => res([...mockKeyPairs]), MOCK_DELAY));

// --- Quotas ---
export const fetchAllQuotas = (token: string, serviceCatalog: ServiceCatalogEntry[], projectId: string | undefined): Promise<Quota[]> =>
    new Promise(res => setTimeout(() => res([...mockQuotas]), MOCK_DELAY));

// --- Identity (Keystone) User Management ---
export const fetchDomains = (token: string, identityUrl: string): Promise<KeystoneDomain[]> =>
    new Promise(res => setTimeout(() => res([...mockDomains]), MOCK_DELAY));

export const fetchUsers = (token: string, identityUrl: string): Promise<KeystoneUser[]> =>
    new Promise(res => setTimeout(() => res([...mockUsers]), MOCK_DELAY));

export const createUserAPI = (token: string, identityUrl: string, payload: CreateUserPayload): Promise<{ user: KeystoneUser }> =>
    new Promise(res => {
        setTimeout(() => {
            const domain = mockDomains.find(d => d.id === payload.user.domain_id);
            const newUser: KeystoneUser = {
                id: `user-${Date.now()}`,
                name: payload.user.name,
                enabled: payload.user.enabled ?? true,
                domain: { id: domain!.id, name: domain!.name },
                domain_id: domain!.id,
            };
            mockUsers.push(newUser);
            res({ user: newUser });
        }, MOCK_DELAY);
    });

export const deleteUserAPI = (token: string, identityUrl: string, userId: string): Promise<void> =>
    new Promise(res => {
        setTimeout(() => {
            const idx = mockUsers.findIndex(u => u.id === userId);
            if (idx !== -1) mockUsers.splice(idx, 1);
            res();
        }, MOCK_DELAY);
    });

export const updateUserAPI = (token: string, identityUrl: string, userId: string, payload: { user: { enabled?: boolean, name?: string } }): Promise<{ user: KeystoneUser }> =>
    new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = mockUsers.find(u => u.id === userId);
            if (user) {
                if(payload.user.enabled !== undefined) user.enabled = payload.user.enabled;
                if(payload.user.name !== undefined) user.name = payload.user.name;
                resolve({ user: user! });
            } else {
                reject(new Error("User not found"));
            }
        }, MOCK_DELAY);
    });