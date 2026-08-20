import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            patchOrganization: jest.fn(),
            deleteOrganization: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGaurd)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuards)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
