import { CollectionDescriber, CreateRecord, DocumentObject } from "../interfaces";

enum RuleActionTypeEnum {
  ACCESS = 'access',
  READ = 'read',
  WRITE = 'write',
  GET = 'get',
  LIST = 'list',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

function isPromise(promise): boolean {
  return !!promise && typeof promise.then === 'function' && typeof promise.catch === 'function';
}

async function resolve<T = any>(result: Promise<T> | T): Promise<T> {
  if (isPromise(result)) {
    return await result;
  } else {
    return result;
  }
}

export class Collection {
  public name: string;
  public rules;
  public resolvers;

  constructor(
    name: string,
    options: CollectionDescriber
  ) {
    this.name = name;
    this.rules = options.rules;
    this.resolvers = options.resolvers;
  }

  public async access(action: RuleActionTypeEnum, params: any) {
    if (action in this.rules) {
      return resolve(this.rules[action](params));
    } else if (
      (action === RuleActionTypeEnum.GET || action === RuleActionTypeEnum.LIST) &&
      RuleActionTypeEnum.READ in this.rules
    ) {
      return resolve(this.rules[RuleActionTypeEnum.READ](params));
    } else if (
      (action === RuleActionTypeEnum.CREATE || action === RuleActionTypeEnum.UPDATE || action === RuleActionTypeEnum.DELETE) &&
      RuleActionTypeEnum.WRITE in this.rules
    ) {
      return resolve(this.rules[RuleActionTypeEnum.WRITE](params));
    } else if (RuleActionTypeEnum.ACCESS in this.rules) {
      return resolve(this.rules[RuleActionTypeEnum.ACCESS](params));
    }
    return true;
  }

  async create(record: CreateRecord, auth: any) {
    const { values, timestamp, path } = record;
    const [ collection, id ] = path.split('/');

    const document: DocumentObject = {};

    values.forEach(({ key, value }) => {
      document[key] = value;
    });

    document._id = id;
    document._updated = timestamp;

    const access = await this.access(RuleActionTypeEnum.CREATE, {
      document,
      auth
    });
    if (access) {
      this.resolvers.create();
    }
  }

}