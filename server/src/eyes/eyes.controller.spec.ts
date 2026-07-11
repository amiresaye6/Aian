import { Test, TestingModule } from '@nestjs/testing';
import { EyesController } from './eyes.controller';

describe('EyesController', () => {
  let controller: EyesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EyesController],
    }).compile();

    controller = module.get<EyesController>(EyesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
