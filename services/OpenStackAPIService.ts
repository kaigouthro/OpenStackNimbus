



import {
  ServiceCatalogEntry, ServiceCatalogEndpoint, KeystoneTokenResponse,
  Instance, Volume, Network, Image, SecurityGroup, Flavor, Quota, FloatingIP, KeyPair, SecurityGroupRule,
  NovaServersRsp, NovaServerRsp, CinderVolumesRsp, CinderVolumeRsp,
  NeutronNetworksRsp, NeutronFloatingIPsRsp, GlanceImagesRsp,
  NeutronSecurityGroupsRsp, NeutronSecurityGroupRsp, NovaFlavorsRsp, NovaKeyPairsRsp,
  QuotaSetRsp, NeutronSecurityGroupRuleRsp, CinderQuotaSet, NeutronQuota, NovaQuotaSet, 
  NovaRawServer, NovaRawServerAddressEntry,
  Subnet, Port, Router,
  NeutronSubnetsRsp,
  NeutronPortsRsp,
  NeutronRoutersRsp,
  NovaInstanceActionsRsp,
  KeystoneDomain,
  KeystoneUser,
  CreateUserPayload,
  KeystoneDomainsRsp,
  KeystoneUsersRsp,
  KeystoneUserRsp,
} from '../types';
import { MOCK_SERVICES_ENABLED } from './serviceConfig';
import * as MockAPI from './MockOpenStackService';

// --- Keystone Authentication ---

export interface KeystoneAuthParams {
  authUrl: string;
  username: string;
  password?: string;
  domainName: string;
  projectIdentifier?: string; // Can be name or ID
  scopeByProjectId?: boolean;
  projectDomainName?: string; // Required if scoping by project name
}

export interface KeystoneAuthResponse {
  token: string;
  data: KeystoneTokenResponse;
}

// This function is for the initial authentication only and is never mocked.
export const authenticateWithKeystone = async (params: KeystoneAuthParams): Promise<KeystoneAuthResponse> => {
    const { authUrl, username, password, domainName, projectIdentifier, scopeByProjectId, projectDomainName } = params;
    
    const authPayload: any = {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: username,
              domain: { name: domainName },
              password: password,
            },
          },
        },
      },
    };

    if (projectIdentifier) {
        let projectScope: any = {
            domain: { name: projectDomainName || domainName }
        };
        if(scopeByProjectId) {
            projectScope = { id: projectIdentifier };
        } else {
            projectScope.name = projectIdentifier;
        }
        authPayload.auth.scope = { project: projectScope };
    } else {
      // Unscoped authentication or domain-level scope
      authPayload.auth.scope = {
        domain: { name: domainName }
      };
    }
    
    const fullAuthUrl = `${authUrl.replace(/\/+$/, '')}/auth/tokens`;
    console.log(`Authenticating to: ${fullAuthUrl}`);

    const response = await fetch(fullAuthUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(authPayload),
    });

    if (!response.ok) {
        let errorData;
        let errorMessage = `Authentication failed with status ${response.status}`;
        try {
            errorData = await response.json();
            errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        } catch (e) {
            errorMessage = await response.text();
        }
        throw new Error(errorMessage);
    }
    
    const token = response.headers.get('x-subject-token');
    if (!token) {
        throw new Error('Authentication successful, but X-Subject-Token was not found in the response headers.');
    }
    
    const data: KeystoneTokenResponse = await response.json();
    
    return { token, data };
};


// --- Helper to get service endpoint from catalog ---
export const getServiceEndpoint = (
  catalog: ServiceCatalogEntry[] | null,
  serviceType: string,
  serviceInterface: 'public' | 'internal' | 'admin' = 'public',
  region?: string // Optional: specify region if multiple are available
): string | null => {
  if (!catalog) return null;
  const service = catalog.find(s => s.type === serviceType);
  if (!service) return null;

  let endpoint = service.endpoints.find(e => e.interface === serviceInterface && (region ? e.region === region : true));
  
  // Fallback if specific region not found but interface exists
  if (!endpoint && region) {
    endpoint = service.endpoints.find(e => e.interface === serviceInterface);
  }
  
  return endpoint ? endpoint.url.replace(/\/+$/, '') : null; // Remove trailing slash
};


// --- API Client Wrapper ---
interface ApiCallOptions extends RequestInit {
  token: string;
  params?: Record<string, string>; // For URL query parameters
}

async function apiClient<T>(endpointUrl: string, options: ApiCallOptions): Promise<T> {
  const { token, params, ...fetchOptions } = options;
  
  let url = endpointUrl;
  if (params) {
    const query = new URLSearchParams(params);
    url += `?${query.toString()}`;
  }

  console.log(`API Request: ${fetchOptions.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'X-Auth-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
  });

  if (!response.ok) {
    let errorData;
    let errorMessageDetail = `Request failed with status ${response.status}`;
    try {
      errorData = await response.json();
      console.error("OpenStack API Error Response Body:", errorData);
      errorMessageDetail = errorData?.error?.message || errorData?.message || (typeof errorData === 'object' ? JSON.stringify(errorData) : errorMessageDetail);
    } catch (e) {
      const textError = await response.text().catch(() => response.statusText);
      console.error("OpenStack API Error (non-JSON response):", textError);
      errorMessageDetail = textError || errorMessageDetail;
    }
    
    let fullErrorMessage = `API request to ${response.url} failed with status ${response.status}: ${errorMessageDetail}.`;

    if (response.status === 401) {
        fullErrorMessage += " Authentication error (401): Your session might have expired or token is invalid. Please try logging out and logging back in. This could also be a CORS issue if X-Auth-Token is not properly exposed by the server. Check browser Network tab for details.";
    } else {
        fullErrorMessage += " Check browser Network tab for details. Ensure OpenStack service endpoints have CORS configured if this is a cross-origin request.";
    }

    throw new Error(fullErrorMessage);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") { 
    return undefined as T; 
  }
  
  return response.json() as Promise<T>;
}

// Helper function to build full service URLs, preventing duplicate version segments
const buildFullSvcPath = (baseUrl: string, versionSegment: string, resourcePath: string): string => {
  // baseUrl is already trimmed of trailing slashes by getServiceEndpoint
  const normalizedResourcePath = resourcePath.startsWith('/') ? resourcePath.substring(1) : resourcePath;
  if (baseUrl.endsWith(`/${versionSegment}`)) { // e.g., baseUrl is http://host/network/v2.0
    return `${baseUrl}/${normalizedResourcePath}`; // http://host/network/v2.0/networks
  }
  // e.g., baseUrl is http://host/network
  return `${baseUrl}/${versionSegment}/${normalizedResourcePath}`; // http://host/network/v2.0/networks
};


// --- Helper to map raw Nova server data to Instance type ---
const mapRawServerToInstance = (rawServer: NovaRawServer): Instance => {
  let ipAddress = '';
  if (rawServer.addresses) {
    ipAddress = Object.values(rawServer.addresses)
      .flat()
      .map((addrInfo: NovaRawServerAddressEntry) => addrInfo.addr)
      .join(', ');
  }

  let powerState: Instance['powerState'];
  const status = rawServer.status.toUpperCase();

  // Determine power state based on a hierarchy:
  // 1. High-priority text-based statuses (transient, error states).
  if (
    status === 'BUILD' ||
    status === 'REBUILD' ||
    status === 'MIGRATING' ||
    status === 'RESCUE' ||
    status === 'RESIZE' ||
    status === 'VERIFY_RESIZE'
  ) {
    powerState = 'Building';
  } else if (status === 'ERROR') {
    powerState = 'Error';
  } else if (status === 'PAUSED' || status === 'SUSPENDED') {
    powerState = 'Paused';
  } else if (status === 'SHUTOFF' || status === 'STOPPED' || status.includes('SHELVED')) {
    powerState = 'Shutoff';
  } else {
    // For other statuses (like ACTIVE), rely on the numeric power_state code.
    switch (rawServer.power_state) {
      case 1: // RUNNING
        powerState = 'Running';
        break;
      case 3: // PAUSED
      case 7: // SUSPENDED
        powerState = 'Paused';
        break;
      case 4: // SHUTDOWN
        powerState = 'Shutoff';
        break;
      case 6: // CRASHED
        powerState = 'Error';
        break;
      case 0: // NOSTATE
        // When status is ACTIVE but power_state is 0, it's an indeterminate state.
        // It's not an error, so 'Building' provides a better UX than 'Error' or 'Shutoff'.
        powerState = 'Building';
        break;
      default:
        // If power_state is undefined, or an unknown code for an ACTIVE instance, it's an indeterminate state.
        if (status === 'ACTIVE' && (rawServer.power_state === undefined || rawServer.power_state === null)) {
            console.warn(`Power state for ACTIVE instance ${rawServer.id} is ${rawServer.power_state}. Mapping to 'Building'.`);
            powerState = 'Building';
        } else {
            console.warn(`Unknown OpenStack power_state code: ${rawServer.power_state} for instance ${rawServer.id} with status '${status}'. Mapping to 'Error'.`);
            powerState = 'Error';
        }
        break;
    }
  }

  return {
    id: rawServer.id,
    name: rawServer.name,
    status: rawServer.status,
    flavor: { id: rawServer.flavor.id, name: undefined },
    image: { id: rawServer.image.id, name: undefined },
    ipAddress: ipAddress,
    powerState: powerState,
    keyPair: rawServer.key_name || undefined,
    securityGroups: rawServer.security_groups ? rawServer.security_groups.map(sg => sg.name) : [],
    ['os-extended-volumes:volumes_attached']: rawServer['os-extended-volumes:volumes_attached'],
    created: rawServer.created,
    ['OS-EXT-AZ:availability_zone']: rawServer['OS-EXT-AZ:availability_zone'],
    userId: rawServer.user_id,
    hostId: rawServer['OS-EXT-SRV-ATTR:host'],
  };
};



// --- Service-specific functions (REAL IMPLEMENTATIONS) ---

// Nova (Compute)
const _fetchInstances = (token: string, computeUrl: string): Promise<Instance[]> => 
  apiClient<NovaServersRsp>(`${computeUrl}/servers/detail`, { method: 'GET', token })
  .then(data => data.servers.map(mapRawServerToInstance));

const _fetchInstanceDetailsAPI = (token: string, computeUrl: string, instanceId: string): Promise<Instance> =>
  apiClient<NovaServerRsp>(`${computeUrl}/servers/${instanceId}`, { method: 'GET', token })
  .then(data => mapRawServerToInstance(data.server));


const _launchInstanceAPI = async (token: string, computeUrl: string, params: any): Promise<Instance> => {
    const serverPayload = {
        server: {
            name: params.name,
            imageRef: params.imageId, 
            flavorRef: params.flavorId, 
            key_name: params.keyPairName || undefined,
            security_groups: params.securityGroupIds ? params.securityGroupIds.map((sgIdOrName: string) => ({ name: sgIdOrName })) : undefined,
            networks: params.networkIds && params.networkIds.length > 0 ? params.networkIds.map((netId: string) => ({ uuid: netId })) : [{uuid: "auto"}], 
        }
    };
    return apiClient<NovaServerRsp>(`${computeUrl}/servers`, { method: 'POST', token, body: JSON.stringify(serverPayload) }).then(data => mapRawServerToInstance(data.server));
};

const _terminateInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> =>
  apiClient<void>(`${computeUrl}/servers/${instanceId}`, { method: 'DELETE', token });

const _controlInstancePowerAPI = (token: string, computeUrl: string, instanceId: string, action: 'os-start' | 'os-stop' | 'reboot' /* 'reboot' needs type*/): Promise<void> => {
    let openstackAction: any = {};
    if (action === 'os-start') openstackAction = { "os-start": null };
    else if (action === 'os-stop') openstackAction = { "os-stop": null };
    else if (action === 'reboot') openstackAction = { "reboot": { "type": "SOFT" } }; // Default to SOFT reboot
    
    return apiClient<void>(`${computeUrl}/servers/${instanceId}/action`, { method: 'POST', token, body: JSON.stringify(openstackAction) });
};

const _getInstanceConsoleUrlAPI = (token: string, computeUrl: string, instanceId: string, consoleType: 'novnc' | 'spice-html5' | 'serial' = 'novnc'): Promise<{ console: { type: string; url: string }}> => {
    const payload: any = {};
    if (consoleType === 'novnc') payload['os-getVNCConsole'] = { type: 'novnc' };
    else if (consoleType === 'spice-html5') payload['os-getSPICEConsole'] = { type: 'spice-html5' };
    else if (consoleType === 'serial') payload['os-getSerialConsole'] = { type: 'serial' };
    else throw new Error(`Unsupported console type: ${consoleType}`);
    
    return apiClient<{ console: { type: string; url: string }}>(`${computeUrl}/servers/${instanceId}/action`, { method: 'POST', token, body: JSON.stringify(payload) });
};

const _shelveInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> => {
    const payload = { "shelve": null };
    return apiClient<void>(`${computeUrl}/servers/${instanceId}/action`, { method: 'POST', token, body: JSON.stringify(payload) });
};

const _unshelveInstanceAPI = (token: string, computeUrl: string, instanceId: string): Promise<void> => {
    const payload = { "unshelve": null };
    return apiClient<void>(`${computeUrl}/servers/${instanceId}/action`, { method: 'POST', token, body: JSON.stringify(payload) });
};

const _fetchInstanceActionsAPI = (token: string, computeUrl: string, instanceId: string): Promise<NovaInstanceActionsRsp> =>
  apiClient<NovaInstanceActionsRsp>(`${computeUrl}/servers/${instanceId}/os-instance-actions`, { method: 'GET', token });


// Cinder (Block Storage)
const _fetchVolumes = (token: string, volumeUrl: string): Promise<Volume[]> =>
  apiClient<CinderVolumesRsp>(`${volumeUrl}/volumes/detail`, { method: 'GET', token }).then(data => data.volumes);

const _createVolumeAPI = (token: string, volumeUrl: string, params: {name: string; size: number; type?: string, availability_zone?: string}): Promise<Volume> => {
    const payload = { volume: { name: params.name, size: params.size, volume_type: params.type, availability_zone: params.availability_zone }};
    return apiClient<CinderVolumeRsp>(`${volumeUrl}/volumes`, {method: 'POST', token, body: JSON.stringify(payload)}).then(data => data.volume);
}

const _deleteVolumeAPI = (token: string, volumeUrl: string, volumeId: string): Promise<void> =>
  apiClient<void>(`${volumeUrl}/volumes/${volumeId}`, { method: 'DELETE', token });

const _attachVolumeAPI = (token: string, computeUrl: string, instanceId: string, volumeId: string): Promise<any> => {
    const payload = { volumeAttachment: { volumeId: volumeId }};
    return apiClient<any>(`${computeUrl}/servers/${instanceId}/os-volume_attachments`, { method: 'POST', token, body: JSON.stringify(payload)});
}

const _detachVolumeAPI = (token: string, computeUrl: string, instanceId: string, attachmentId: string): Promise<void> => {
    // Note: OpenStack uses the volumeId as the attachmentId in this specific API path
    return apiClient<void>(`${computeUrl}/servers/${instanceId}/os-volume_attachments/${attachmentId}`, { method: 'DELETE', token });
}

// Neutron (Networking)
const NEUTRON_API_VERSION = "v2.0";

const _fetchNetworks = (token: string, networkUrl: string): Promise<Network[]> =>
  apiClient<NeutronNetworksRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "networks"), { method: 'GET', token })
  .then(data => data.networks.map(n => ({...n, subnet_ids: n.subnets || [] } as Network))); // Map to subnet_ids

const _fetchSubnetsAPI = (token: string, networkUrl: string, networkId?: string): Promise<Subnet[]> => {
  const params = networkId ? { network_id: networkId } : {};
  return apiClient<NeutronSubnetsRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "subnets"), { method: 'GET', token, params })
    .then(data => data.subnets);
};

const _fetchRoutersAPI = (token: string, networkUrl: string): Promise<Router[]> =>
  apiClient<NeutronRoutersRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "routers"), { method: 'GET', token })
    .then(data => data.routers);

const _fetchPortsAPI = (token: string, networkUrl: string, queryParams?: Record<string, string>): Promise<Port[]> =>
  apiClient<NeutronPortsRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "ports"), { method: 'GET', token, params: queryParams })
    .then(data => data.ports);


const _fetchFloatingIPs = (token: string, networkUrl: string): Promise<FloatingIP[]> =>
  apiClient<NeutronFloatingIPsRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "floatingips"), { method: 'GET', token }).then(data => data.floatingips);

const _allocateFloatingIPAPI = (token: string, networkUrl: string, poolNetworkId: string): Promise<FloatingIP> => {
    const payload = { floatingip: { floating_network_id: poolNetworkId }};
    return apiClient<{floatingip: FloatingIP}>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "floatingips"), {method: 'POST', token, body: JSON.stringify(payload)}).then(data => data.floatingip);
}

const _releaseFloatingIPAPI = (token: string, networkUrl: string, fipId: string): Promise<void> =>
  apiClient<void>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `floatingips/${fipId}`), { method: 'DELETE', token });

const _associateFloatingIPAPI = (token: string, networkUrl: string, fipId: string, portId: string): Promise<FloatingIP> => {
    const payload = { floatingip: { port_id: portId }};
    return apiClient<{floatingip: FloatingIP}>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `floatingips/${fipId}`), {method: 'PUT', token, body: JSON.stringify(payload)}).then(data => data.floatingip);
}

const _disassociateFloatingIPAPI = (token: string, networkUrl: string, fipId: string): Promise<FloatingIP> => {
    const payload = { floatingip: { port_id: null }};
    return apiClient<{floatingip: FloatingIP}>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `floatingips/${fipId}`), {method: 'PUT', token, body: JSON.stringify(payload)}).then(data => data.floatingip);
}


// Glance (Image)
const GLANCE_API_VERSION = "v2";

const _fetchImages = (token: string, imageUrl: string): Promise<Image[]> =>
  apiClient<GlanceImagesRsp>(buildFullSvcPath(imageUrl, GLANCE_API_VERSION, "images"), { method: 'GET', token }).then(data => data.images);

// Security Groups (Neutron)
const _fetchSecurityGroups = (token: string, networkUrl: string): Promise<SecurityGroup[]> =>
  apiClient<NeutronSecurityGroupsRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "security-groups"), { method: 'GET', token })
  .then(data => data.security_groups.map(sg => ({...sg, rules: sg.security_group_rules || sg.rules || [] }))); // Normalize rules field

const _createSecurityGroupAPI = (token: string, networkUrl: string, name: string, description: string): Promise<SecurityGroup> => {
    const payload = { security_group: { name, description }};
    return apiClient<NeutronSecurityGroupRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "security-groups"), {method: 'POST', token, body: JSON.stringify(payload)}).then(data => data.security_group);
}

const _deleteSecurityGroupAPI = (token: string, networkUrl: string, sgId: string): Promise<void> =>
  apiClient<void>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `security-groups/${sgId}`), { method: 'DELETE', token });

const _addSecurityGroupRuleAPI = (token: string, networkUrl: string, rule: Omit<SecurityGroupRule, 'id' | 'project_id'>): Promise<SecurityGroupRule> => {
    const payload = { security_group_rule: rule };
    return apiClient<NeutronSecurityGroupRuleRsp>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, "security-group-rules"), {method: 'POST', token, body: JSON.stringify(payload)}).then(data => data.security_group_rule);
}

const _deleteSecurityGroupRuleAPI = (token: string, networkUrl: string, ruleId: string): Promise<void> =>
  apiClient<void>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `security-group-rules/${ruleId}`), { method: 'DELETE', token });


// Flavors (Nova)
const _fetchFlavors = (token: string, computeUrl: string): Promise<Flavor[]> =>
  apiClient<{ flavors: any[] }>(`${computeUrl}/flavors/detail`, { method: 'GET', token })
  .then(data => data.flavors.map(rawFlavor => {
    // The 'os-flavor-access:is_public' field might be missing or named differently by provider
    // For broader compatibility, treat flavors as public if 'os-flavor-access:is_public' is not explicitly false.
    // If 'os-flavor-access:is_public' is undefined (not present), default to true.
    const isPublicValue = rawFlavor['os-flavor-access:is_public'];
    const isFlavorPublic = isPublicValue !== undefined ? isPublicValue : true;

    return {
      id: rawFlavor.id,
      name: rawFlavor.name,
      vcpus: rawFlavor.vcpus,
      ram: rawFlavor.ram,
      disk: rawFlavor.disk,
      isPublic: isFlavorPublic,
      ['OS-FLV-EXT-DATA:ephemeral']: rawFlavor['OS-FLV-EXT-DATA:ephemeral'] || 0, // Default ephemeral to 0 if not present
      swap: rawFlavor.swap === "" ? 0 : (parseInt(rawFlavor.swap, 10) || 0), // Ensure swap is a number, default to 0
    } as Flavor;
  }));

// KeyPairs (Nova)
const _fetchKeyPairs = (token: string, computeUrl: string): Promise<KeyPair[]> =>
  apiClient<NovaKeyPairsRsp>(`${computeUrl}/os-keypairs`, { method: 'GET', token })
  .then(data => data.keypairs.map(kpItem => kpItem.keypair)); // Correctly access the nested keypair object


// Quotas (Nova, Cinder, Neutron)
const _fetchNovaQuotas = async (token: string, computeUrl: string, projectId: string): Promise<NovaQuotaSet> => {
    const data = await apiClient<QuotaSetRsp>(`${computeUrl}/os-quota-sets/${projectId}`, { method: 'GET', token });
    return data.quota_set as unknown as NovaQuotaSet;
};

const _fetchCinderQuotas = async (token: string, volumeUrl: string, projectId: string): Promise<CinderQuotaSet> => {
    const data = await apiClient<{quota_set: CinderQuotaSet}>(`${volumeUrl}/os-quota-sets/${projectId}`, { method: 'GET', token });
    return data.quota_set;
};

const _fetchNeutronQuotas = async (token: string, networkUrl: string, projectId: string): Promise<NeutronQuota> => {
    const data = await apiClient<{quota: NeutronQuota}>(buildFullSvcPath(networkUrl, NEUTRON_API_VERSION, `quotas/${projectId}`), { method: 'GET', token });
    return data.quota;
};


const _fetchAllQuotas = async (
    token: string,
    serviceCatalog: ServiceCatalogEntry[],
    projectId: string | undefined
  ): Promise<Quota[]> => {
    if (!projectId) {
        console.warn("fetchAllQuotas: Project ID is undefined. Returning empty quota list.");
        return Promise.resolve([]); 
    }

    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2') || getServiceEndpoint(serviceCatalog, 'volume');
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');

    const quotas: Quota[] = [];
    
    try {
        if (computeUrl) {
            const novaData: NovaQuotaSet = await _fetchNovaQuotas(token, computeUrl, projectId);
            
            const instanceQuota: Quota = {
                resource: 'Instances',
                used: -1, // To be calculated from actual resource lists if possible
                limit: novaData.instances ?? -1
            };
            quotas.push(instanceQuota);

            const vcpuQuota: Quota = {
                resource: 'vCPUs',
                used: -1,
                limit: novaData.cores ?? -1
            };
            quotas.push(vcpuQuota);
            
            const ramQuota: Quota = {
                resource: 'RAM (MB)',
                used: -1,
                limit: novaData.ram ?? -1
            };
            quotas.push(ramQuota);
        }
    } catch (e) { console.warn("Failed to fetch Nova quotas:", e); }

    try {
        if (volumeUrl) {
            const cinderData: CinderQuotaSet = await _fetchCinderQuotas(token, volumeUrl, projectId);
            const volumesQuota: Quota = {
                resource: 'Volumes',
                used: -1,
                limit: cinderData.volumes ?? -1
            };
            quotas.push(volumesQuota);

            const volumeStorageQuota: Quota = {
                resource: 'Volume Storage (GB)',
                used: -1,
                limit: cinderData.gigabytes ?? -1
            };
            quotas.push(volumeStorageQuota);
        }
    } catch (e) { console.warn("Failed to fetch Cinder quotas:", e); }
    
    try {
        if (networkUrl) {
            const neutronData: NeutronQuota = await _fetchNeutronQuotas(token, networkUrl, projectId);
            const floatingIpQuota: Quota = {
                resource: 'Floating IPs',
                used: -1,
                limit: neutronData.floatingip ?? -1
            };
            quotas.push(floatingIpQuota);

            const networksQuota: Quota = {
                resource: 'Networks',
                used: -1,
                limit: neutronData.network ?? -1
            };
            quotas.push(networksQuota);

            const securityGroupsQuota: Quota = {
                resource: 'Security Groups',
                used: -1,
                limit: neutronData.security_group ?? -1
            };
            quotas.push(securityGroupsQuota);
            
            const subnetsQuota: Quota = {
                resource: 'Subnets',
                used: -1,
                limit: neutronData.subnet ?? -1
            };
            quotas.push(subnetsQuota);
            
             const portsQuota: Quota = {
                resource: 'Ports',
                used: -1,
                limit: neutronData.port ?? -1
            };
            quotas.push(portsQuota);

            const routersQuota: Quota = {
                resource: 'Routers',
                used: -1,
                limit: neutronData.router ?? -1
            };
            quotas.push(routersQuota);

        }
    } catch (e) { console.warn("Failed to fetch Neutron quotas:", e); }

    return quotas;
  };

// --- Keystone User Management ---
const IDENTITY_API_VERSION = 'v3';

const _fetchDomains = (token: string, identityUrl: string): Promise<KeystoneDomain[]> =>
  apiClient<KeystoneDomainsRsp>(`${identityUrl}/domains`, { method: 'GET', token }).then(data => data.domains);

const _fetchUsers = (token: string, identityUrl: string): Promise<KeystoneUser[]> =>
  apiClient<KeystoneUsersRsp>(`${identityUrl}/users`, { method: 'GET', token }).then(data => data.users);

const _createUserAPI = (token: string, identityUrl: string, payload: CreateUserPayload): Promise<KeystoneUserRsp> =>
  apiClient<KeystoneUserRsp>(`${identityUrl}/users`, { method: 'POST', token, body: JSON.stringify(payload) });

const _deleteUserAPI = (token: string, identityUrl: string, userId: string): Promise<void> =>
  apiClient<void>(`${identityUrl}/users/${userId}`, { method: 'DELETE', token });

const _updateUserAPI = (token: string, identityUrl: string, userId: string, payload: { user: { enabled?: boolean, name?: string } }): Promise<KeystoneUserRsp> =>
  apiClient<KeystoneUserRsp>(`${identityUrl}/users/${userId}`, { method: 'PATCH', token, body: JSON.stringify(payload) });


// --- CONDITIONAL EXPORTS ---

export const fetchInstances = MOCK_SERVICES_ENABLED ? MockAPI.fetchInstances : _fetchInstances;
export const fetchInstanceDetailsAPI = MOCK_SERVICES_ENABLED ? MockAPI.fetchInstanceDetailsAPI : _fetchInstanceDetailsAPI;
export const launchInstanceAPI = MOCK_SERVICES_ENABLED ? MockAPI.launchInstanceAPI : _launchInstanceAPI;
export const terminateInstanceAPI = MOCK_SERVICES_ENABLED ? MockAPI.terminateInstanceAPI : _terminateInstanceAPI;
export const controlInstancePowerAPI = MOCK_SERVICES_ENABLED ? MockAPI.controlInstancePowerAPI : _controlInstancePowerAPI;
export const getInstanceConsoleUrlAPI = MOCK_SERVICES_ENABLED ? MockAPI.getInstanceConsoleUrlAPI : _getInstanceConsoleUrlAPI;
export const shelveInstanceAPI = MOCK_SERVICES_ENABLED ? MockAPI.shelveInstanceAPI : _shelveInstanceAPI;
export const unshelveInstanceAPI = MOCK_SERVICES_ENABLED ? MockAPI.unshelveInstanceAPI : _unshelveInstanceAPI;
export const fetchInstanceActionsAPI = MOCK_SERVICES_ENABLED ? MockAPI.fetchInstanceActionsAPI : _fetchInstanceActionsAPI;

export const fetchVolumes = MOCK_SERVICES_ENABLED ? MockAPI.fetchVolumes : _fetchVolumes;
export const createVolumeAPI = MOCK_SERVICES_ENABLED ? MockAPI.createVolumeAPI : _createVolumeAPI;
export const deleteVolumeAPI = MOCK_SERVICES_ENABLED ? MockAPI.deleteVolumeAPI : _deleteVolumeAPI;
export const attachVolumeAPI = MOCK_SERVICES_ENABLED ? MockAPI.attachVolumeAPI : _attachVolumeAPI;
export const detachVolumeAPI = MOCK_SERVICES_ENABLED ? MockAPI.detachVolumeAPI : _detachVolumeAPI;

export const fetchNetworks = MOCK_SERVICES_ENABLED ? MockAPI.fetchNetworks : _fetchNetworks;
export const fetchSubnetsAPI = MOCK_SERVICES_ENABLED ? MockAPI.fetchSubnetsAPI : _fetchSubnetsAPI;
export const fetchRoutersAPI = MOCK_SERVICES_ENABLED ? MockAPI.fetchRoutersAPI : _fetchRoutersAPI;
export const fetchPortsAPI = MOCK_SERVICES_ENABLED ? MockAPI.fetchPortsAPI : _fetchPortsAPI;

export const fetchFloatingIPs = MOCK_SERVICES_ENABLED ? MockAPI.fetchFloatingIPs : _fetchFloatingIPs;
export const allocateFloatingIPAPI = MOCK_SERVICES_ENABLED ? MockAPI.allocateFloatingIPAPI : _allocateFloatingIPAPI;
export const releaseFloatingIPAPI = MOCK_SERVICES_ENABLED ? MockAPI.releaseFloatingIPAPI : _releaseFloatingIPAPI;
export const associateFloatingIPAPI = MOCK_SERVICES_ENABLED ? MockAPI.associateFloatingIPAPI : _associateFloatingIPAPI;
export const disassociateFloatingIPAPI = MOCK_SERVICES_ENABLED ? MockAPI.disassociateFloatingIPAPI : _disassociateFloatingIPAPI;

export const fetchImages = MOCK_SERVICES_ENABLED ? MockAPI.fetchImages : _fetchImages;

export const fetchSecurityGroups = MOCK_SERVICES_ENABLED ? MockAPI.fetchSecurityGroups : _fetchSecurityGroups;
export const createSecurityGroupAPI = MOCK_SERVICES_ENABLED ? MockAPI.createSecurityGroupAPI : _createSecurityGroupAPI;
export const deleteSecurityGroupAPI = MOCK_SERVICES_ENABLED ? MockAPI.deleteSecurityGroupAPI : _deleteSecurityGroupAPI;
export const addSecurityGroupRuleAPI = MOCK_SERVICES_ENABLED ? MockAPI.addSecurityGroupRuleAPI : _addSecurityGroupRuleAPI;
export const deleteSecurityGroupRuleAPI = MOCK_SERVICES_ENABLED ? MockAPI.deleteSecurityGroupRuleAPI : _deleteSecurityGroupRuleAPI;

export const fetchFlavors = MOCK_SERVICES_ENABLED ? MockAPI.fetchFlavors : _fetchFlavors;
export const fetchKeyPairs = MOCK_SERVICES_ENABLED ? MockAPI.fetchKeyPairs : _fetchKeyPairs;

export const fetchAllQuotas = MOCK_SERVICES_ENABLED ? MockAPI.fetchAllQuotas : _fetchAllQuotas;

// Keystone User Management Exports
export const fetchDomains = MOCK_SERVICES_ENABLED ? MockAPI.fetchDomains : _fetchDomains;
export const fetchUsers = MOCK_SERVICES_ENABLED ? MockAPI.fetchUsers : _fetchUsers;
export const createUserAPI = MOCK_SERVICES_ENABLED ? MockAPI.createUserAPI : _createUserAPI;
export const deleteUserAPI = MOCK_SERVICES_ENABLED ? MockAPI.deleteUserAPI : _deleteUserAPI;
export const updateUserAPI = MOCK_SERVICES_ENABLED ? MockAPI.updateUserAPI : _updateUserAPI;