import { Global, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { TestModule } from './test/test.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { RolesPermissionsModule } from './roles_permissions/roles_permissions.module';
// import { DashboardModule } from './dashboard/dashboard.module';
import { MembersModule } from './members/members.module';

@Module({
  imports: [
    // Serve files stored in the /uploads directory at the /uploads HTTP route
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    JwtModule.register({
      global:true
    }),
    PrismaModule,
    HealthModule,
    UploadModule,
    EmailModule,
    TestModule,
    UsersModule,
    AuthModule,
    RolesPermissionsModule,
    // DashboardModule,
    MembersModule
  ],
})
export class AppModule {}
