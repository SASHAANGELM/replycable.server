
import { Collection } from './classes/Collection';
import { WebSocketInstance } from './classes/WebSocketInstance';
import { ReplycableOptions, ChangeObject, ChangeRecordTypeEnum, CreateRecord, DocumentObject, DeleteRecord, UpdateRecord, ChangesResult, CollectionsHandlers, CollectionDescriber, CollectionResolvers, CollectionDescribers } from './interfaces';

function isPromise(promise: Promise<any> | any): boolean {
  return !!promise && typeof promise.then === 'function' && typeof promise.catch === 'function';
}

export class Replycable {
  public ws: WebSocketInstance
  public auth: any;
  public collections: CollectionsHandlers;
  public collections2: any = {};

  constructor(options: ReplycableOptions) {
    this.auth = options.auth;

    this.collections = options.collections || {};

    this.collections2 = this.createCollectionDescribers(options.collections);

    this.ws = new WebSocketInstance(options.server, this);
  }

  public async startSyncProcess(changes: ChangeObject[], auth: any): Promise<ChangesResult[]> {
    const changesResult: ChangesResult[] = [];

    console.time('startSyncProcess');
    const promises = changes.map(async (change: ChangeObject) => {
      const key = change.key;
      const type = change.record.type;

      if (type === ChangeRecordTypeEnum.CREATE) {
        const created = await this.handleCreateDocument(change.record as CreateRecord, auth);
        if (created) {
          changesResult.push({
            key,
            status: 'SUCCESS'
          });
        } else {
          changesResult.push({
            key,
            status: 'ERROR',
            message: 'Some Error with creating document'
          });
        }
      } else if (type === ChangeRecordTypeEnum.UPDATE) {
        const updated = await this.handleUpdateDocument(change.record as UpdateRecord);
        if (updated) {
          changesResult.push({
            key,
            status: 'SUCCESS'
          });
        } else {
          changesResult.push({
            key,
            status: 'ERROR',
            message: 'Some Error with updating document'
          });
        }
      } else if (type === ChangeRecordTypeEnum.DELETE) {
        const deleted = await this.handleDeleteDocument(change.record as DeleteRecord);
        if (deleted) {
          changesResult.push({
            key,
            status: 'SUCCESS'
          });
        } else {
          changesResult.push({
            key,
            status: 'ERROR',
            message: 'Some Error with deleting document'
          });
        }
      }
    });
    await Promise.all(promises);
    console.timeEnd('startSyncProcess');

    return changesResult;
  }

  private async handleCreateDocument(record: CreateRecord, any): Promise<boolean> {
    const [collection, id] = record.path.split('/');

    if (collection in this.collections2) {
      const res = this.collections2[collection].create(record, any);
    } else {
      // ToDo: Error if resolvers for this collection not exist
    }

    const createResolver = this.getResolver(collection, 'create');
    if (createResolver != null) {
      const { values, timestamp } = record;
      const document: DocumentObject = {};

      values.forEach(({ key, value }) => {
        document[key] = value;
      });

      document._id = id;
      document._updated = timestamp;

      const result = await this.resolve(createResolver(id, document, timestamp));

      if (result === false || result === null) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  }

  private async handleUpdateDocument(record: UpdateRecord): Promise<boolean> {
    const [collection, id] = record.path.split('/');

    const oldDocument: DocumentObject = await this.get(collection, id);
    const updateDocumentResolver = this.getResolver(collection, 'update');
    if (oldDocument != null && updateDocumentResolver != null) {
      const { values } = record;
      let lastTimestamp = 0;
      const document: DocumentObject = { ...oldDocument };

      for (const [key, value] of Object.entries(oldDocument)) {
        console.log(key, value);
      }

      console.log('oldDocument', oldDocument);
      console.log('values', values);
      console.log('document', document);

      values.forEach(({ key, value, init, timestamp }) => {
        if ((timestamp > oldDocument._updated) || (timestamp <= oldDocument._updated && oldDocument[key] === init)) {
          document[key] = value;
          if (timestamp > lastTimestamp) {
            lastTimestamp = timestamp
          }
        }
      });
      console.log('update document', document);

      if (lastTimestamp > 0) {
        document._updated = lastTimestamp;

        const result = await this.ws.db.resolve(updateDocumentResolver(id, document, oldDocument, lastTimestamp));

        if (result === false || result === null) {
          return false;
        } else {
          return true;
        }
      }
    }

    return false;
  }

  private async handleDeleteDocument(record: DeleteRecord): Promise<boolean> {
    const [collection, id] = record.path.split('/');

    const deleteResolver = this.getResolver(collection, 'delete');
    if (deleteResolver != null) {
      const result = await this.resolve(deleteResolver(id));

      if (result === false || result === null) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  }

  public getResolver(collection: string, functionName: string) {
    if (collection in this.collections && functionName in this.collections[collection]) {
      return (...args) => { return this.collections[collection][functionName].call(null, ...args) };
    } else if (functionName in this.collections) {
      return (...args) => { return this.collections[functionName].call(null, collection, ...args) };
    }
    return null;
  }
  public async resolve<T = any>(result: Promise<T> | T): Promise<T> {
    if (isPromise(result)) {
      return await result;
    } else {
      return result;
    }
  }

  public async get(collection: string, id: string) {
    const resolver = this.ws.db.getResolver(collection, 'get');
    let doc;
    if (resolver != null) {
      doc = await this.ws.db.resolve(resolver(id));
    }
    console.log('get', doc);
    return doc;
  }

  public async list(collection: string) {
    const resolver = this.ws.db.getResolver(collection, 'list');
    let doc;
    if (resolver != null) {
      doc = await this.ws.db.resolve(resolver());
    }
    console.log('list', doc);
    return doc;
  }

  private createCollectionDescribers(collections: CollectionDescribers) {
    const object = {};
    for (const [key, value] of Object.entries(collections)) {
      const isCollectionDescriber = 'resolvers' in value;
      if (isCollectionDescriber) {
        object[key] = new Collection(key, value as CollectionDescriber);
      } else {
        object[key] = new Collection(key, {
          resolvers: value as CollectionResolvers
        });
      }
    }
    return object;
  }
};