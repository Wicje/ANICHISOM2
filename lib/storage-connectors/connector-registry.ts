/**
 * Storage Connector Registry — registration, lookup, factory pattern
 *
 * Mirrors AI ProviderFactory and Auth ProviderFactory patterns.
 * Users configure which connectors to enable, connect their accounts via OAuth2.
 * Plugins can register custom storage connectors via registerStorageConnector.
 */

import { IStorageConnector } from './storage-connector';
import { GoogleDriveConnector } from './google-drive-connector';
import { DropboxConnector } from './dropbox-connector';
import { TokenStore } from './token-store';

type ConnectorConstructor = new (...args: any[]) => IStorageConnector;

const connectorRegistry = new Map<string, ConnectorConstructor>();
const connectorInstances = new Map<string, IStorageConnector>();

// Register built-in connectors
connectorRegistry.set('google-drive', GoogleDriveConnector);
connectorRegistry.set('dropbox', DropboxConnector);

/**
 * Register a custom storage connector (for plugins/extensions)
 */
export function registerStorageConnector(id: string, constructor: ConnectorConstructor): void {
  connectorRegistry.set(id, constructor);
}

/**
 * Get or create a connector instance by ID
 */
export function getStorageConnector(connectorId: string): IStorageConnector {
  if (connectorInstances.has(connectorId)) {
    return connectorInstances.get(connectorId)!;
  }

  const constructor = connectorRegistry.get(connectorId);
  if (!constructor) {
    throw new Error(
      `Unknown storage connector: ${connectorId}. ` +
      `Available: ${Array.from(connectorRegistry.keys()).join(', ')}`
    );
  }

  const instance = new constructor();
  connectorInstances.set(connectorId, instance);
  return instance;
}

/**
 * Get all registered connector IDs
 */
export function getRegisteredConnectors(): string[] {
  return Array.from(connectorRegistry.keys());
}

/**
 * Get all configured (available) connectors
 */
export function getConfiguredConnectors(): IStorageConnector[] {
  const configured: IStorageConnector[] = [];
  for (const [id] of connectorRegistry) {
    try {
      const connector = getStorageConnector(id);
      if (connector.isConfigured()) {
        configured.push(connector);
      }
    } catch { /* skip unavailable */ }
  }
  return configured;
}

/**
 * Get all connectors connected for a specific user
 */
export function getConnectedConnectors(userId: string): IStorageConnector[] {
  const connected: IStorageConnector[] = [];
  const connectedIds = TokenStore.listConnected(userId);

  for (const id of connectedIds) {
    try {
      connected.push(getStorageConnector(id));
    } catch { /* skip unknown */ }
  }
  return connected;
}

/**
 * Check if a specific connector is connected for a user
 */
export function isConnectorConnected(userId: string, connectorId: string): boolean {
  return TokenStore.has(userId, connectorId);
}

/**
 * Clear cached connector instances (useful for testing)
 */
export function clearConnectorCache(): void {
  connectorInstances.clear();
}
