import { Test, TestingModule } from '@nestjs/testing';
import { ZoomAuthController } from './zoom-auth.controller';

describe('ZoomAuthController', () => {
  let controller: ZoomAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZoomAuthController],
    }).compile();

    controller = module.get<ZoomAuthController>(ZoomAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
