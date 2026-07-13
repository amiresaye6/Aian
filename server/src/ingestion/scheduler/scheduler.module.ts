import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { BatchService } from './batch.service';
import { SyncNowController } from './controllers/sync-now.controller';
import { ProcessingSettingsController } from './controllers/processing-settings.controller';

/**
 * Scheduler Module.
 * Manages periodic tasks like batch creation and provider polling.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SyncNowController, ProcessingSettingsController],
  providers: [SchedulerService, BatchService],
  exports: [BatchService],
})
export class SchedulerModule {}
