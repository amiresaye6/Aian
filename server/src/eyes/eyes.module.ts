import { Module } from '@nestjs/common';
import { EyesController } from './eyes.controller';
import { EyesService } from './eyes.service';

@Module({
  controllers: [EyesController],
  providers: [EyesService],
})
export class EyesModule {}
