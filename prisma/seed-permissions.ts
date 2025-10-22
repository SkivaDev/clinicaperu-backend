// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// // Define all permissions needed in the system
// const permissions = [
//   // User Management
//   { name: 'users:read', description: 'View users list' },
//   { name: 'users:create', description: 'Create new users' },
//   { name: 'users:update', description: 'Update user information' },
//   { name: 'users:delete', description: 'Delete users' },
//   { name: 'users:read-own', description: 'View own user profile' },
//   { name: 'users:update-own', description: 'Update own user profile' },

//   // Doctor Management
//   { name: 'doctors:read', description: 'View doctors list' },
//   { name: 'doctors:create', description: 'Create doctor profiles' },
//   { name: 'doctors:update', description: 'Update any doctor profile' },
//   { name: 'doctors:update-own', description: 'Update own doctor profile' },
//   { name: 'doctors:delete', description: 'Delete doctor profiles' },

//   // Specialty Management
//   { name: 'specialties:read', description: 'View specialties' },
//   { name: 'specialties:create', description: 'Create specialties' },
//   { name: 'specialties:update', description: 'Update specialties' },
//   { name: 'specialties:delete', description: 'Delete specialties' },

//   // Schedule Management
//   { name: 'schedules:read', description: 'View schedules' },
//   { name: 'schedules:create', description: 'Create schedules for any doctor' },
//   { name: 'schedules:create-own', description: 'Create own schedules' },
//   { name: 'schedules:update', description: 'Update any schedule' },
//   { name: 'schedules:update-own', description: 'Update own schedules' },
//   { name: 'schedules:delete', description: 'Delete any schedule' },
//   { name: 'schedules:delete-own', description: 'Delete own schedules' },

//   // Appointment Management
//   { name: 'appointments:read', description: 'View all appointments' },
//   { name: 'appointments:read-own', description: 'View own appointments' },
//   {
//     name: 'appointments:create',
//     description: 'Create appointments for any user',
//   },
//   { name: 'appointments:create-own', description: 'Create own appointments' },
//   { name: 'appointments:update', description: 'Update any appointment' },
//   { name: 'appointments:update-own', description: 'Update own appointments' },
//   { name: 'appointments:cancel', description: 'Cancel any appointment' },
//   { name: 'appointments:cancel-own', description: 'Cancel own appointments' },

//   // Medical Records
//   { name: 'medical-records:read', description: 'View all medical records' },
//   { name: 'medical-records:read-own', description: 'View own medical records' },
//   {
//     name: 'medical-records:read-patients',
//     description: 'View own patients records',
//   },
//   { name: 'medical-records:create', description: 'Create medical records' },
//   { name: 'medical-records:update', description: 'Update medical records' },
//   { name: 'medical-records:delete', description: 'Delete medical records' },

//   // Payments
//   { name: 'payments:read', description: 'View all payments' },
//   { name: 'payments:read-own', description: 'View own payments' },
//   { name: 'payments:create', description: 'Process payments' },
//   { name: 'payments:refund', description: 'Issue refunds' },

//   // Reports & Analytics
//   { name: 'reports:view', description: 'View system reports' },
//   { name: 'analytics:view', description: 'View analytics dashboard' },

//   // System Admin
//   { name: 'roles:manage', description: 'Manage roles and permissions' },
//   { name: 'system:admin', description: 'Full system administration' },
// ];

// // Role-Permission mappings
// const rolePermissions = {
//   ADMIN: [
//     'users:read',
//     'users:create',
//     'users:update',
//     'users:delete',
//     'doctors:read',
//     'doctors:create',
//     'doctors:update',
//     'doctors:delete',
//     'specialties:read',
//     'specialties:create',
//     'specialties:update',
//     'specialties:delete',
//     'schedules:read',
//     'schedules:create',
//     'schedules:update',
//     'schedules:delete',
//     'appointments:read',
//     'appointments:create',
//     'appointments:update',
//     'appointments:cancel',
//     'medical-records:read',
//     'medical-records:create',
//     'medical-records:update',
//     'medical-records:delete',
//     'payments:read',
//     'payments:create',
//     'payments:refund',
//     'reports:view',
//     'analytics:view',
//     'roles:manage',
//     'system:admin',
//   ],
//   DOCTOR: [
//     'users:read-own',
//     'users:update-own',
//     'doctors:read',
//     'doctors:update-own',
//     'schedules:read',
//     'schedules:create-own',
//     'schedules:update-own',
//     'schedules:delete-own',
//     'appointments:read-own',
//     'appointments:create',
//     'appointments:update-own',
//     'appointments:cancel-own',
//     'medical-records:read-patients',
//     'medical-records:create',
//     'medical-records:update',
//     'payments:read-own',
//   ],
//   PATIENT: [
//     'users:read-own',
//     'users:update-own',
//     'doctors:read',
//     'appointments:read-own',
//     'appointments:create-own',
//     'appointments:cancel-own',
//     'medical-records:read-own',
//     'payments:read-own',
//     'payments:create',
//   ],
// };

// async function seedPermissions() {
//   console.log('🔐 Seeding permissions...');

//   // Create all permissions
//   for (const permission of permissions) {
//     await prisma.permission.upsert({
//       where: { name: permission.name },
//       update: { description: permission.description },
//       create: permission,
//     });
//   }

//   console.log(`✅ Created ${permissions.length} permissions`);

//   // Assign permissions to roles
//   for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
//     const role = await prisma.role.findUnique({
//       where: { name: roleName },
//     });

//     if (!role) {
//       console.warn(`⚠️  Role ${roleName} not found, skipping...`);
//       continue;
//     }

//     // Clear existing permissions
//     await prisma.rolePermission.deleteMany({
//       where: { roleId: role.id },
//     });

//     // Add new permissions
//     for (const permName of permissionNames) {
//       const permission = await prisma.permission.findUnique({
//         where: { name: permName },
//       });

//       if (permission) {
//         await prisma.rolePermission.create({
//           data: {
//             roleId: role.id,
//             permissionId: permission.id,
//           },
//         });
//       }
//     }

//     console.log(
//       `✅ Assigned ${permissionNames.length} permissions to ${roleName}`,
//     );
//   }

//   console.log('🎉 Permissions seeding completed!');
// }

// export default seedPermissions;
