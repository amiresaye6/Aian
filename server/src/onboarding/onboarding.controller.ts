/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AuthGaurd } from '../auth/auth.gaurd';

@Controller('onboarding')
@UseGuards(AuthGaurd)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('organization')
  async createOrganization(
    @Request() req: any,
    @Body() dto: CreateOrganizationDto,
  ) {
    const user = req.user;
    return await this.onboardingService.createOrganization(user.id, dto);
  }

  @Put('providers')
  async updateProviders(
    @Request() req: any,
    @Body() body: { providers: { eyeType: string; providerKey: string }[] },
  ) {
    try {
      const userId = req.user.id;
      const updatedEyes = await this.onboardingService.updateProviders(
        userId,
        body.providers,
      );

      return {
        success: true,
        message: 'Providers updated successfully.',
        data: {
          updatedEyes: updatedEyes,
        },
      };
    } catch (error: any) {
      if (error.code === 'VALIDATION_ERROR') {
        return {
          success: false,
          message: 'One or more selected providers are not available.',
          error: {
            code: 'VALIDATION_ERROR',
            fields: {
              [error.field]: [error.message],
            },
          },
          requestId: 'request-' + Math.random().toString(36).substring(7),
        };
      }
      throw error;
    }
  }
  @Get('progress')
  async getProgress(@Request() req: any) {
  const userId = req.user.id;
  return await this.onboardingService.getProgress(userId);
  }
  

  @Post('complete')
  async completeOnboarding(@Request() req: any) {
  const userId = req.user.id;
  return await this.onboardingService.completeOnboarding(userId);
  }
}
