import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
  imports:[UsersModule],
  controllers: [AuthController],
  providers: [AuthService,GoogleStrategy,GithubStrategy],
})
export class AuthModule {}
