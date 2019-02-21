import { BaseService } from '../../base-service';
import { BaseContractProvider } from '../../contract/base-provider';
import { DBService } from '../db-service';
import { BaseDBProvider } from '../backends';

interface SyncDBExposedServices {
  contract: BaseContractProvider;
  dbservice: DBService;
}

export class SyncDB extends BaseService {
  services!: SyncDBExposedServices;
  dependencies = ['contract', 'db'];
  name = 'syncdb';

  /**
   * @returns the current db instance.
   */
  get db(): BaseDBProvider {
    const db = this.services.dbservice.dbs['sync'];
    if (db === undefined) {
      throw new Error('SyncDB is not yet initialized.');
    }
    return db;
  }

  async onStart(): Promise<void> {
    if (this.services.contract.hasAddress) {
      await this.open();
    } else {
      await new Promise((resolve) => {
        this.services.contract.on('initialized', async () => {
          await this.open();
          resolve();
        });
      });
    }
  }

  /**
   * Opens the database connection.
   */
  async open(): Promise<void> {
    const address = this.services.contract.address;
    await this.services.dbservice.open('sync', { id: address });
  }

  /**
   * Returns the last synced block for a given event.
   * @param eventName Name of the event.
   * @returns Last synced block number.
   */
  async getLastLoggedEventBlock (eventName: string): Promise<number> {
    return this.db.get(`lastlogged:${eventName}`, -1);
  }

  /**
   * Sets the last synced block for a given event.
   * @param eventName Name of the event.
   * @param block Last synced block number.
   */
  async setLastLoggedEventBlock (eventName: string, block: number): Promise<void> {
    await this.db.set(`lastlogged:${eventName}`, block);
  }

  /**
   * Returns the last synced block.
   * @returns Last synced block number.
   */
  async getLastSyncedBlock(): Promise<number> {
    return this.db.get('sync:block', -1);
  }

  /**
   * Sets the last synced block number.
   * @param block Block number to set.
   */
  async setLastSyncedBlock(block: number): Promise<void> {
    await this.db.set('sync:block', block);
  }

  /**
   * Returns transactions that failed to sync.
   * @returns An array of encoded transactions.
   */
  async getFailedTransactions(): Promise<string[]> {
    return this.db.get('sync:failed', []);
  }

  /**
   * Sets the failed transactions.
   * @param transactions An array of encoded transactions.
   */
  async setFailedTransactions(transactions: string[]): Promise<void> {
    await this.db.set('sync:failed', transactions);
  }

  /**
   * Marks a set of Ethereum events as seen.
   * @param events Ethereum events.
   */
  async addEvents(events: Array<{ hash: string }>): Promise<void> {
    const objects = events.map((event) => {
      return {
        key: `event:${event.hash}`,
        value: true
      };
    });
    await this.db.bulkPut(objects);
  }

  /**
   * Checks if we've seen a specific event
   * @param event An Ethereum event.
   * @returns `true` if we've seen the event, `false` otherwise.
   */
  async hasEvent(event: { hash: string }): Promise<boolean> {
    return this.db.exists(`event:${event.hash}`);
  }
}
