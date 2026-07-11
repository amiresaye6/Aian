import { Test, TestingModule } from '@nestjs/testing';
import { EyesService } from './eyes.service';

describe('EyesService', () => {
  let service: EyesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EyesService],
    }).compile();

    service = module.get<EyesService>(EyesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
