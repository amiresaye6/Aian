/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed process...');

  // 1. Clean existing data (in reverse dependency order)
  console.log('Cleaning existing data...');
  await prisma.integrationResource.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.organizationEye.deleteMany();
  await prisma.onboardingProgress.deleteMany();
  await prisma.organizationKnowledgeFile.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.eyeProvider.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.eyeType.deleteMany();

  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  console.log('Seeding roles...');
  const ownerRole = await prisma.role.create({
    data: {
      key: 'owner',
      name: 'Owner',
      description: 'Full organization control',
      isSystemRole: true,
    },
  });
  const adminRole = await prisma.role.create({
    data: {
      key: 'admin',
      name: 'Admin',
      description: 'Administrative access',
      isSystemRole: true,
    },
  });
  const memberRole = await prisma.role.create({
    data: {
      key: 'member',
      name: 'Member',
      description: 'Standard access',
      isSystemRole: true,
    },
  });

  // 3. Seed Permissions
  console.log('Seeding permissions...');
  const permKeys = [
    'organization.read',
    'organization.update',
    'organization.delete',
    'billing.read',
    'billing.manage',
    'members.read',
    'members.invite',
    'members.update_role',
    'members.update_status',
    'members.remove',
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.delete',
    'roles.assign_permissions',
    'permission.get',
    'users.read',
    'users.update',
    'users.delete',
    'eyes.read',
    'eyes.manage',
    'providers.read',
    'providers.select',
    'integrations.read',
    'integrations.connect',
    'dashboard.read',
  ];

  const permissions = await Promise.all(
    permKeys.map((key) =>
      prisma.permission.create({
        data: {
          key,
          name: key
            .split('.')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          description: `Ability to ${key.replace('.', ' ')}`,
        },
      }),
    ),
  );

  // Assign permissions to roles
  console.log('Assigning permissions to roles...');
  // Owner gets everything
  for (const p of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: ownerRole.id, permissionId: p.id },
    });
  }

  // Admin gets everything except org delete, billing manage, roles delete
  const adminExcluded = [
    'organization.delete',
    'billing.manage',
    'roles.delete',
  ];
  for (const p of permissions) {
    if (!adminExcluded.includes(p.key)) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: p.id },
      });
    }
  }

  // Member gets basic read access
  const memberIncluded = [
    'dashboard.read',
    'eyes.read',
    'providers.read',
    'integrations.read',
  ];
  for (const p of permissions) {
    if (memberIncluded.includes(p.key)) {
      await prisma.rolePermission.create({
        data: { roleId: memberRole.id, permissionId: p.id },
      });
    }
  }

  // 4. Seed Eye Types
  console.log('Seeding eye types...');
  const chatEye = await prisma.eyeType.create({
    data: {
      key: 'chat',
      name: 'Chat Eye',
      description:
        'Monitors the chat platform for read messages, threads, and communications.',
    },
  });
  const meetingEye = await prisma.eyeType.create({
    data: {
      key: 'meeting',
      name: 'Meeting Eye',
      description: 'Monitors meeting transcriptions and related discussions.',
    },
  });
  const taskEye = await prisma.eyeType.create({
    data: {
      key: 'task',
      name: 'Task Eye',
      description:
        'Monitors project management platforms like Jira to track tickets, tasks, and sprints.',
    },
  });
  const codingEye = await prisma.eyeType.create({
    data: {
      key: 'coding',
      name: 'Coding Eye',
      description:
        'Monitors the coding platform for commits, messages, comments, and PR descriptions.',
    },
  });

  // 5. Seed Providers
  console.log('Seeding providers...');
  const slack = await prisma.provider.create({
    data: { key: 'slack', name: 'Slack', oauthSupported: true },
  });
  const msTeams = await prisma.provider.create({
    data: {
      key: 'microsoft_teams',
      name: 'Microsoft Teams',
      oauthSupported: true,
      isActive: false,
    },
  });
  const discord = await prisma.provider.create({
    data: {
      key: 'discord',
      name: 'Discord',
      oauthSupported: true,
      isActive: false,
    },
  });

  const zoom = await prisma.provider.create({
    data: { key: 'zoom', name: 'Zoom', oauthSupported: true },
  });
  const googleMeet = await prisma.provider.create({
    data: {
      key: 'google_meet',
      name: 'Google Meet',
      oauthSupported: true,
      isActive: false,
    },
  });

  const jira = await prisma.provider.create({
    data: { key: 'jira', name: 'Jira', oauthSupported: true },
  });
  const linear = await prisma.provider.create({
    data: {
      key: 'linear',
      name: 'Linear',
      oauthSupported: true,
      isActive: false,
    },
  });
  const clickup = await prisma.provider.create({
    data: {
      key: 'clickup',
      name: 'ClickUp',
      oauthSupported: true,
      isActive: false,
    },
  });

  const github = await prisma.provider.create({
    data: { key: 'github', name: 'GitHub', oauthSupported: true },
  });
  const gitlab = await prisma.provider.create({
    data: {
      key: 'gitlab',
      name: 'GitLab',
      oauthSupported: true,
      isActive: false,
    },
  });
  const bitbucket = await prisma.provider.create({
    data: {
      key: 'bitbucket',
      name: 'Bitbucket',
      oauthSupported: true,
      isActive: false,
    },
  });

  // 6. Seed Eye Providers (V1 Matrix)
  console.log('Seeding eye-provider mappings...');
  await prisma.eyeProvider.createMany({
    data: [
      { eyeTypeId: chatEye.id, providerId: slack.id, isAvailableInV1: true },
      { eyeTypeId: chatEye.id, providerId: msTeams.id, isAvailableInV1: false },
      { eyeTypeId: chatEye.id, providerId: discord.id, isAvailableInV1: false },

      { eyeTypeId: meetingEye.id, providerId: zoom.id, isAvailableInV1: true },
      {
        eyeTypeId: meetingEye.id,
        providerId: googleMeet.id,
        isAvailableInV1: false,
      },
      {
        eyeTypeId: meetingEye.id,
        providerId: msTeams.id,
        isAvailableInV1: false,
      },

      { eyeTypeId: taskEye.id, providerId: jira.id, isAvailableInV1: true },
      { eyeTypeId: taskEye.id, providerId: linear.id, isAvailableInV1: false },
      { eyeTypeId: taskEye.id, providerId: clickup.id, isAvailableInV1: false },

      { eyeTypeId: codingEye.id, providerId: github.id, isAvailableInV1: true },
      {
        eyeTypeId: codingEye.id,
        providerId: gitlab.id,
        isAvailableInV1: false,
      },
      {
        eyeTypeId: codingEye.id,
        providerId: bitbucket.id,
        isAvailableInV1: false,
      },
    ],
  });

  // 7. Seed Simulated Users & Organizations
  console.log('Seeding simulated users and organization...');
  const realHash = await bcrypt.hash('password123', 10);

  const usersData = [
    { fullName: 'Amir Mawla', email: 'amir.mawla@example.com' },
    { fullName: 'Mohamed Elazzazy', email: 'mohamed.elazzazy@example.com' },
    { fullName: 'Hager Nofal', email: 'hager.nofal@example.com' },
    { fullName: 'Donia Mohamed', email: 'donia.mohamed@example.com' },
    { fullName: 'Bahgat Ghonim', email: 'bahgat.ghonim@example.com' },
    { fullName: 'Adel Saber', email: 'adel.saber@example.com' },
    { fullName: 'Mohamed Salah', email: 'mohamed.salah@example.com' },
    { fullName: 'Mahmoud Trezeguet', email: 'mahmoud.trezeguet@example.com' },
    { fullName: 'Mohamed Elneny', email: 'mohamed.elneny@example.com' },
  ];

  const targetOrgId = crypto.randomUUID();
  const targetOwnerId = crypto.randomUUID();

  console.log('Temporarily disabling FK triggers to resolve circular dependency...');
  await prisma.$executeRawUnsafe('ALTER TABLE "users" DISABLE TRIGGER ALL;');
  await prisma.$executeRawUnsafe('ALTER TABLE "organizations" DISABLE TRIGGER ALL;');

  let ownerUser;
  let org;
  try {
    ownerUser = await prisma.user.create({
      data: {
        id: targetOwnerId,
        fullName: 'Amir Alsayed',
        email: 'amir.alsayed@example.com',
        passwordHash: realHash,
        status: 'active',
        roleId: ownerRole.id,
        memberStatus: 'active',
        joinedAt: new Date(),
        organizationId: targetOrgId,
      },
    });

    org = await prisma.organization.create({
      data: {
        id: targetOrgId,
        name: 'Acme AI Solutions',
        slug: 'acme-ai-solutions',
        description: 'The simulated organization for Sprint 1 testing',
        timezone: 'Africa/Cairo',
        status: 'active',
        createdByUserId: ownerUser.id,
      },
    });
  } finally {
    // Always re-enable triggers, even if the inserts above fail,
    // so the schema's integrity enforcement is restored immediately.
    console.log('Re-enabling FK triggers...');
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ENABLE TRIGGER ALL;');
    await prisma.$executeRawUnsafe('ALTER TABLE "organizations" ENABLE TRIGGER ALL;');
  }

  const createdUsers = [ownerUser];
  for (let i = 0; i < usersData.length; i++) {
    const u = usersData[i];
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: realHash,
        status: 'active',
        organizationId: org.id,
        roleId: i <= 2 ? adminRole.id : memberRole.id,
        memberStatus: 'active',
        invitedByUserId: ownerUser.id,
        joinedAt: new Date(),
      },
    });
    createdUsers.push(user);
  }
  // 8. Seed Billing
  console.log('Seeding billing...');
  const subscription = await prisma.subscription.create({
    data: {
      organizationId: org.id,
      billingCycle: 'yearly',
      status: 'active',
      paymentProvider: 'dummy_stripe',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      subscriptionId: subscription.id,
      paymentProvider: 'dummy_stripe',
      providerPaymentId: 'txn_simulated_123',
      amountCents: 29900, // $299.00
      currency: 'USD',
      billingCycle: 'yearly',
      status: 'paid',
      paidAt: new Date(),
    },
  });

  // 9. Seed Organization Members

  // 10. Seed Organization Eyes (V1 setup)
  console.log('Seeding organization eyes...');

  await prisma.organizationEye.create({
    data: {
      organizationId: org.id,
      eyeTypeId: chatEye.id,
      selectedProviderId: slack.id,
      status: 'disconnected',
      syncSchedule: 'hourly',
      settings: { ignore_bots: true },
    },
  });

  await prisma.organizationEye.create({
    data: {
      organizationId: org.id,
      eyeTypeId: meetingEye.id,
      selectedProviderId: zoom.id,
      status: 'disconnected',
      syncSchedule: 'daily',
      settings: { auto_summarize: true },
    },
  });

  await prisma.organizationEye.create({
    data: {
      organizationId: org.id,
      eyeTypeId: taskEye.id,
      selectedProviderId: jira.id,
      status: 'disconnected',
      syncSchedule: 'hourly',
      settings: { include_subtasks: true },
    },
  });

  await prisma.organizationEye.create({
    data: {
      organizationId: org.id,
      eyeTypeId: codingEye.id,
      selectedProviderId: github.id,
      status: 'disconnected',
      syncSchedule: 'realtime',
      settings: { track_prs: true },
    },
  });

  // 11. Complete Onboarding
  console.log('Seeding onboarding progress...');
  await prisma.onboardingProgress.create({
    data: {
      organizationId: org.id,
      currentStep: 'dashboard',
      completedSteps: {
        payment: true,
        organization_created: true,
        providers_selected: true,
      },
      isCompleted: true,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log('Seed process completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed process failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });