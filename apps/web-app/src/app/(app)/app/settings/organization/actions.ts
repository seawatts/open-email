'use server';

import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { OrgMembers, Orgs } from '@seawatts/db/schema';
import { isEntitled } from '@seawatts/stripe/guards/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

// Helper to get authenticated session
async function getAuthSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  return {
    orgId: session?.session?.activeOrganizationId || null,
    userId: session?.user?.id || null,
  };
}

// Create the action client
const action = createSafeActionClient();

// Validation schemas
const updateTeamNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(100, 'Team name too long'),
});

const deleteTeamSchema = z.object({
  confirm: z
    .boolean()
    .refine((val) => val === true, 'You must confirm deletion'),
});

const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.enum(['admin', 'user']),
});

const removeMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

const leaveOrganizationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user']).default('user'),
});

// Invite member action with Stripe entitlements check
export const inviteMemberAction = action
  .inputSchema(inviteMemberSchema)
  .action(async ({ parsedInput }) => {
    const { userId, orgId } = await getAuthSession();

    if (!userId || !orgId) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, orgId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin
    const member = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!member || member.role !== 'admin') {
      throw new Error('Only admins can invite members');
    }

    // Check Stripe entitlements for invite-org-members feature
    await isEntitled(
      'unlimited_developers',
      'Team member invitations require a paid plan. Please upgrade to invite team members.',
    );

    // Invite the user to the organization via Better-Auth
    const headersList = await headers();
    await auth.api.createInvitation({
      body: {
        email: parsedInput.email,
        organizationId: org.id,
        role: parsedInput.role === 'admin' ? 'admin' : 'member',
      },
      headers: headersList,
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Update team name action
export const updateTeamNameAction = action
  .inputSchema(updateTeamNameSchema)
  .action(async ({ parsedInput }) => {
    const { userId, orgId } = await getAuthSession();

    if (!userId || !orgId) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, orgId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin
    const member = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!member || member.role !== 'admin') {
      throw new Error('Only admins can update team name');
    }

    // Update organization name via Better-Auth
    const headersList = await headers();
    await auth.api.updateOrganization({
      body: {
        data: { name: parsedInput.name },
        organizationId: org.id,
      },
      headers: headersList,
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Delete team action
export const deleteTeamAction = action
  .inputSchema(deleteTeamSchema)
  .action(async ({ parsedInput }) => {
    const { userId, orgId } = await getAuthSession();

    if (!userId || !orgId) {
      throw new Error('Unauthorized');
    }

    // Validate confirmation
    if (!parsedInput.confirm) {
      throw new Error('You must confirm deletion');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, orgId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin and the creator
    const member = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!member || member.role !== 'admin') {
      throw new Error('Only admins can delete the team');
    }

    if (org.createdByUserId !== userId) {
      throw new Error('Only the team creator can delete the team');
    }

    // Delete organization via Better-Auth
    const headersList = await headers();
    await auth.api.deleteOrganization({
      body: { organizationId: org.id },
      headers: headersList,
    });

    // Redirect to dashboard after deletion
    redirect('/app/dashboard');
  });

// Get organization members action
export const getOrganizationMembersAction = action.action(async () => {
  const { userId, orgId } = await getAuthSession();

  if (!userId || !orgId) {
    throw new Error('Unauthorized');
  }

  // Get the organization
  const org = await db.query.Orgs.findFirst({
    where: eq(Orgs.id, orgId),
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get organization members with user details
  const members = await db.query.OrgMembers.findMany({
    where: eq(OrgMembers.orgId, org.id),
    with: {
      user: true,
    },
  });

  return members.map((member) => ({
    createdAt: member.createdAt,
    email: member.user?.email || 'Unknown',
    firstName: member.user?.firstName,
    id: member.id,
    lastName: member.user?.lastName,
    role: member.role,
  }));
});

// Remove member action
export const removeMemberAction = action
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput }) => {
    const { userId, orgId } = await getAuthSession();

    if (!userId || !orgId) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, orgId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin
    const currentMember = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!currentMember || currentMember.role !== 'admin') {
      throw new Error('Only admins can remove members');
    }

    // Get the member to be removed
    const memberToRemove = await db.query.OrgMembers.findFirst({
      where: eq(OrgMembers.id, parsedInput.memberId),
      with: {
        user: true,
      },
    });

    if (!memberToRemove || memberToRemove.orgId !== org.id) {
      throw new Error('Member not found');
    }

    // Prevent removing the last admin
    if (memberToRemove.role === 'admin') {
      const adminCount = await db.query.OrgMembers.findMany({
        where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.role, 'admin')),
      });

      if (adminCount.length <= 1) {
        throw new Error('Cannot remove the last admin');
      }
    }

    // Remove member via Better-Auth
    const headersList = await headers();
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: memberToRemove.userId,
        organizationId: org.id,
      },
      headers: headersList,
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Update member role action
export const updateMemberRoleAction = action
  .inputSchema(updateMemberRoleSchema)
  .action(async ({ parsedInput }) => {
    const { userId, orgId } = await getAuthSession();

    if (!userId || !orgId) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, orgId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin
    const currentMember = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!currentMember || currentMember.role !== 'admin') {
      throw new Error('Only admins can update member roles');
    }

    // Get the member to be updated
    const memberToUpdate = await db.query.OrgMembers.findFirst({
      where: eq(OrgMembers.id, parsedInput.memberId),
      with: {
        user: true,
      },
    });

    if (!memberToUpdate || memberToUpdate.orgId !== org.id) {
      throw new Error('Member not found');
    }

    // Prevent changing the last admin to user
    if (memberToUpdate.role === 'admin' && parsedInput.role === 'user') {
      const adminCount = await db.query.OrgMembers.findMany({
        where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.role, 'admin')),
      });

      if (adminCount.length <= 1) {
        throw new Error('Cannot change the last admin to user');
      }
    }

    // Update member role via Better-Auth
    const headersList = await headers();
    await auth.api.updateMemberRole({
      body: {
        memberId: memberToUpdate.id,
        role: parsedInput.role === 'admin' ? 'admin' : 'member',
      },
      headers: headersList,
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Leave organization action
export const leaveOrganizationAction = action
  .inputSchema(leaveOrganizationSchema)
  .action(async ({ parsedInput }) => {
    const { userId } = await getAuthSession();

    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await db.query.Orgs.findFirst({
      where: eq(Orgs.id, parsedInput.organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get the user's membership
    const member = await db.query.OrgMembers.findFirst({
      where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.userId, userId)),
    });

    if (!member) {
      throw new Error('You are not a member of this organization');
    }

    // Prevent the last admin from leaving
    if (member.role === 'admin') {
      const adminCount = await db.query.OrgMembers.findMany({
        where: and(eq(OrgMembers.orgId, org.id), eq(OrgMembers.role, 'admin')),
      });

      if (adminCount.length <= 1) {
        throw new Error(
          'Cannot leave organization as the last admin. Please transfer ownership or delete the organization.',
        );
      }
    }

    // Remove member via Better-Auth (self-removal)
    const headersList = await headers();
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: userId,
        organizationId: org.id,
      },
      headers: headersList,
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });
