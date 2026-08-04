import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GraphService } from '../src/graph/graph.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const graph = app.get(GraphService);

  console.log('Starting aliases backfill script...');

  const entities = await prisma.resolvedEntity.findMany({
    where: {
      aliases: {
        not: {
          equals: [],
        },
      },
    },
  });

  console.log(`Found ${entities.length} entities with aliases to sync.`);

  const session = graph.getSession();

  try {
    for (const entity of entities) {
      if (
        !entity.aliases ||
        !Array.isArray(entity.aliases) ||
        entity.aliases.length === 0
      ) {
        continue;
      }

      console.log(
        `Syncing aliases for Entity ID: ${entity.id} (${entity.canonicalName})`,
      );

      await session.run(
        `
        MATCH (e:Entity {id: $id})
        SET e.aliases = $aliases
      `,
        { id: entity.id, aliases: entity.aliases },
      );
    }

    console.log('Aliases backfill completed successfully.');
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await session.close();
    await app.close();
  }
}

bootstrap();
