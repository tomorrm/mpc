# @tomorrm/mpc

Multi-database / multi-tenant library for Prisma. Supports **PostgreSQL** (schema-based) and **MySQL** (database-based) out of the box.

## Features

Coming Soon...

## Installation

> **Status:** This project is currently published as source code on GitHub only.
> npm package distribution is not available yet.

```bash
git clone https://github.com/tomorrm/mpc.git
cd mpc
pnpm install
pnpm run check
```

> **Note:** Usage examples below describe the API and intended integration style.

## Quick Start

### 1. Set up your `schema.prisma`

**PostgreSQL**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

**MySQL**

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 2. Configure your environment

```bash
# PostgreSQL — the default schema (used as the template)
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# MySQL — the default database (used as the template)
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
```

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Use `PrismaClientManager`

```typescript
import { PrismaClientManager } from '@tomorrm/mpc';

const manager = new PrismaClientManager();

// Resolves the correct schema/database for "tenant_a"
const client = manager.getClient('tenant_a');

const users = await client.user.findMany();
```

## How It Works

### PostgreSQL — schema-based

The library appends `?schema=<tenantId>` to the connection URL. Prisma sets `search_path` accordingly, so every query runs against the tenant's isolated schema.

```
postgresql://user:password@host:5432/mydb?schema=tenant_a
```

Each tenant's schema must exist before use. Create it with:

```sql
CREATE SCHEMA tenant_a;
```

Use `lowercase_snake_case` tenant IDs to avoid quoted identifiers in PostgreSQL.

Then apply migrations to the new schema:

```bash
DATABASE_URL="postgresql://user:password@host:5432/mydb?schema=tenant_a" \
  npx prisma migrate deploy
```

### MySQL — database-based

The library replaces the database name in the connection URL path with the tenant ID.

```
mysql://user:password@host:3306/tenant_a
```

Each tenant's database must exist and have migrations applied:

```sql
CREATE DATABASE tenant_a;
```

```bash
DATABASE_URL="mysql://user:password@host:3306/tenant_a" \
  npx prisma migrate deploy
```

## NestJS Integration

### Register as a provider

```typescript
// prisma-client-manager.module.ts
import { Module } from '@nestjs/common';
import { PrismaClientManager } from '@tomorrm/mpc';

@Module({
  providers: [PrismaClientManager],
  exports: [PrismaClientManager],
})
export class PrismaModule {}
```

### Inject into a service

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClientManager } from '@tomorrm/mpc';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaClientManager) {}

  async findAll(tenantId: string) {
    const client = this.prisma.getClient(tenantId);
    return client.user.findMany();
  }
}
```

### Extract tenant ID from the request (e.g. via a subdomain)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClientManager } from '@tomorrm/mpc';

@Injectable()
export class TenantPrismaService extends PrismaClientManager {
  public getTenantId(host: string): string {
    // e.g. "tenant_a.example.com" → "tenant_a"
    const subdomain = host.split('.')[0];
    return super.getTenantId(subdomain); // validation is applied inside
  }
}
```

## API Reference

### `new PrismaClientManager()`

Instantiates the manager and auto-detects the dialect from `DATABASE_URL`.

Throws if `DATABASE_URL` is missing or uses an unsupported scheme.

---

### `getTenantId(id: string): string`

Validates and returns the tenant ID.

Allowed characters: `a-z A-Z 0-9 _ -`

Throws `Error` if the ID contains invalid characters.

For cross-database portability, use `lowercase_snake_case` (`^[a-z0-9_]+$`), for example `tenant_a`.

---

### `getClient(id: string): PrismaClient`

Returns a cached `PrismaClient` scoped to the given tenant. Creates and caches a new client on the first call for that tenant.

---

### `onModuleDestroy(): Promise<void>`

Disconnects all cached clients and clears the cache. Called automatically by NestJS on shutdown.

## Supported Databases

| Database   | Strategy        | Isolation level |
|------------|-----------------|-----------------|
| PostgreSQL | Schema-based    | Per schema      |
| MySQL      | Database-based  | Per database    |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
