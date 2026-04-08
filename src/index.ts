import { PrismaClient } from '@prisma/client';

type SupportedDialect = 'postgresql' | 'mysql';

export class PrismaClientManager {
  private clients: { [key: string]: PrismaClient } = {};
  private readonly baseDatabaseUrl: string;
  private readonly dialect: SupportedDialect;

  constructor() {
    const url = process.env.DATABASE_URL ?? '';
    this.baseDatabaseUrl = url;

    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      this.dialect = 'postgresql';
    } else if (url.startsWith('mysql://')) {
      this.dialect = 'mysql';
    } else {
      throw new Error(
        `Unsupported or missing DATABASE_URL. Must start with postgresql:// or mysql://`
      );
    }
  }

  public getTenantId(id: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid tenant ID: "${id}"`);
    }
    return id;
  }

  private buildDatabaseUrl(tenantId: string): string {
    const baseUrl = this.baseDatabaseUrl;

    if (this.dialect === 'postgresql') {
      const url = new URL(baseUrl);
      url.searchParams.set('schema', tenantId);
      return url.toString();
    } else {
      const url = new URL(baseUrl);
      url.pathname = `/${tenantId}`;
      return url.toString();
    }
  }

  public getClient(id: string): PrismaClient {
    const tenantId = this.getTenantId(id);
    let client = this.clients[tenantId];

    if (!client) {
      const databaseUrl = this.buildDatabaseUrl(tenantId);

      client = new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
      });

      this.clients[tenantId] = client;
    }

    return client;
  }

  public async onModuleDestroy(): Promise<void> {
    await Promise.all(Object.values(this.clients).map((client) => client.$disconnect()));
    this.clients = {};
  }
}
