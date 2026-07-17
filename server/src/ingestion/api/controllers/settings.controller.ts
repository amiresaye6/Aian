import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';

import { IsNumber, IsOptional } from 'class-validator';

export class UpdateConnectionSettingsDto {
  @IsOptional()
  @IsNumber()
  historyBackfillDays?: number | null;

  @IsOptional()
  @IsNumber()
  retentionDays?: number;
}

@Controller('eyes/:connectionId/settings')
export class SettingsController {
  constructor(private readonly connectionRepo: ProviderConnectionRepository) {}

  @Get()
  async getSettings(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const metadata = connection.connectionMetadata || {};
    return {
      historyBackfillDays: metadata.historyBackfillDays ?? null,
      retentionDays: metadata.retentionDays ?? 15,
    };
  }

  @Put()
  async updateSettings(
    @Param('connectionId') connectionId: string,
    @Body() body: UpdateConnectionSettingsDto,
  ) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const currentMetadata = connection.connectionMetadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      historyBackfillDays: body.historyBackfillDays,
      retentionDays: body.retentionDays,
    };

    await this.connectionRepo.updateConnectionMetadata(
      connectionId,
      updatedMetadata,
    );

    return {
      success: true,
      settings: updatedMetadata,
    };
  }
}
