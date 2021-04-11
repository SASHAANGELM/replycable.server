import { Server } from 'http';

export interface ReplycableOptions {
  server: Server;
  auth?: {
    setAuth: (auth: any) => void;
  }
  collections: CollectionsHandlers | CollectionDescribers;
  rules?: any;
  resolvers?: any;
}

export interface CollectionsHandlers {
  get?: (id: string) => DocumentObject | Promise<DocumentObject>;
  list?: () => DocumentObject[] | Promise<DocumentObject[]>;
  create?: (id: string, document: DocumentObject, timestamp: number) => DocumentObject | Promise<DocumentObject> | boolean | void;
  update?: (id: string, document: DocumentObject, oldDocument: DocumentObject, timestamp: number) => DocumentObject | Promise<DocumentObject> | boolean | void;
  delete?: (id: string) => DocumentObject | Promise<DocumentObject> | boolean | void;
  [key: string]: {
    get?: (id: string) => DocumentObject | Promise<DocumentObject>;
    list?: () => DocumentObject[] | Promise<DocumentObject[]>;
    create?: (id: string, document: DocumentObject, timestamp: number) => DocumentObject | Promise<DocumentObject> | boolean | void;
    update?: (id: string, document: DocumentObject, oldDocument: DocumentObject, timestamp: number) => DocumentObject | Promise<DocumentObject> | boolean | void;
    delete?: (id: string) => DocumentObject | Promise<DocumentObject> | boolean | void;
  } | any;
}

export interface WebSocketDto {
  name?: string;
  id: string;
  command: string;
  data: any;
}

export interface ChangesResult {
  key: string;
  status: string;
  message?: string
}

export interface FreeFormObject {
  [key: string]: any;
}
export interface DocumentObject extends FreeFormObject {
  _id?: string;
  _updated?: number;
}

export enum ChangeRecordTypeEnum {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}
export interface ChangeObject<T = ChangeRecord> {
  key: string;
  record: T;
}
export interface KeyValuePair {
  key: string;
  value: any;
  init?: any;
  timestamp?: number;
}
export interface ChangeRecord {
  type: ChangeRecordTypeEnum;
  path: string;
}
export interface CreateRecord extends ChangeRecord {
  type: ChangeRecordTypeEnum.CREATE,
  values: KeyValuePair[];
  timestamp: number;
}
export interface UpdateRecord extends ChangeRecord {
  type: ChangeRecordTypeEnum.UPDATE,
  values: KeyValuePair[];
}
export interface DeleteRecord extends ChangeRecord {
  type: ChangeRecordTypeEnum.DELETE,
  timestamp: number;
}



export interface PropertyDescriptor {
  type: string;
  required?: boolean;
  default?: any;
}

export interface Properties {
  [key: string]: Properties | PropertyDescriptor | [PropertyDescriptor];
}

export interface CollectionSchema {
  description?: string
  properties: Properties
}

export interface CollectionResolvers {
  get: (options: any) => void;
  list: (options: any) => void;
  create: (options: any) => void;
  update: (options: any) => void;
  delete: (options: any) => void;
}

export interface CollectionDescriber {
  schema?: CollectionSchema;
  rules?: any;
  resolvers: CollectionResolvers;
}

export interface CollectionDescribers {
  [key: string]: CollectionDescriber | CollectionResolvers;
}

export interface WebSocketRequest<T = any> {
  id: string;
  payload: T;
}
export interface WebSocketResponse<T = any> {
  id: string;
  payload: T;
}