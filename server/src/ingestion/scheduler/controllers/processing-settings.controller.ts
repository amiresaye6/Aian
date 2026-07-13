import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ProcessingSettingsRepository } from '../../repositories/processing-settings.repository';

@Controller('organizations/:organizationId/settings/processing')
export class ProcessingSettingsController {
  constructor(private readonly settingsRepo: ProcessingSettingsRepository) {}

  @Get()
  async getSettings(@Param('organizationId') organizationId: string) {
    let settings = await this.settingsRepo.findByOrganizationId(organizationId);

    // Return default settings if none exist yet
    if (!settings) {
      settings = {
        id: 'default',
        organizationId,
        timeIntervalHours: 6,
        pendingItemThreshold: 100,
        retentionDays: 15,
        isAutoProcessingEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return settings;
  }

  @Put()
  async updateSettings(
    @Param('organizationId') organizationId: string,
    @Body()
    body: {
      timeIntervalHours?: number;
      pendingItemThreshold?: number;
      retentionDays?: number;
      isAutoProcessingEnabled?: boolean;
    },
  ) {
    const updated = await this.settingsRepo.upsert(organizationId, body);
    return updated;
  }
}
