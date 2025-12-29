import { db } from '@seawatts/db/client';
import { ApiKeys, OrgMembers, Orgs, Users } from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import {
  BILLING_INTERVALS,
  createSubscription,
  getFreePlanPriceId,
  PLAN_TYPES,
  upsertStripeCustomer,
} from '@seawatts/stripe';
import { eq } from 'drizzle-orm';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateOrgParams = {
  name: string;
  userId: string;
};

type CreateOrgResult = {
  org: {
    id: string;
    name: string;
    stripeCustomerId: string;
  };
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
};

// Helper function to create or update org membership
async function ensureOrgMembership({
  orgId,
  userId,
  tx,
}: {
  orgId: string;
  userId: string;
  tx: Transaction;
}) {
  const result = await tx
    .insert(OrgMembers)
    .values({
      orgId,
      role: 'admin',
      userId,
    })
    .onConflictDoUpdate({
      set: {
        updatedAt: new Date(),
      },
      target: [OrgMembers.orgId, OrgMembers.userId],
    })
    .returning();
  return result[0];
}

// Helper function to ensure user exists in database
async function ensureUserExists({
  userId,
  userEmail,
  userFirstName,
  userLastName,
  userAvatarUrl,
  tx,
}: {
  userId: string;
  userEmail: string;
  userFirstName?: string | null;
  userLastName?: string | null;
  userAvatarUrl?: string | null;
  tx: Transaction;
}) {
  const existingUser = await tx.query.Users.findFirst({
    where: eq(Users.id, userId),
  });

  if (existingUser) {
    return existingUser;
  }

  const [dbUser] = await tx
    .insert(Users)
    .values({
      avatarUrl: userAvatarUrl ?? null,
      email: userEmail,
      firstName: userFirstName ?? null,
      id: userId,
      lastLoggedInAt: new Date(),
      lastName: userLastName ?? null,
    })
    .onConflictDoUpdate({
      set: {
        avatarUrl: userAvatarUrl ?? null,
        email: userEmail,
        firstName: userFirstName ?? null,
        lastLoggedInAt: new Date(),
        lastName: userLastName ?? null,
        updatedAt: new Date(),
      },
      target: Users.id,
    })
    .returning();

  if (!dbUser) {
    throw new Error(
      `Failed to create user for userId: ${userId}, email: ${userEmail}`,
    );
  }

  return dbUser;
}

// Helper function to create default API key
async function ensureDefaultApiKey({
  orgId,
  userId,
  tx,
}: {
  orgId: string;
  userId: string;
  tx: Transaction;
}) {
  const existingApiKey = await tx.query.ApiKeys.findFirst({
    where: eq(ApiKeys.orgId, orgId),
  });

  if (existingApiKey) {
    return existingApiKey;
  }

  const [apiKey] = await tx
    .insert(ApiKeys)
    .values({
      name: 'Default',
      orgId,
      userId,
    })
    .onConflictDoUpdate({
      set: {
        updatedAt: new Date(),
      },
      target: ApiKeys.key,
    })
    .returning();

  if (!apiKey) {
    throw new Error(
      `Failed to create API key for orgId: ${orgId}, userId: ${userId}`,
    );
  }

  return apiKey;
}

// Helper function to create org in database
async function createOrgInDatabase({
  orgId,
  name,
  userId,
  tx,
}: {
  orgId: string;
  name: string;
  userId: string;
  tx: Transaction;
}) {
  const [org] = await tx
    .insert(Orgs)
    .values({
      createdByUserId: userId,
      id: orgId,
      name,
    })
    .returning();

  if (!org) {
    throw new Error(
      `Failed to create organization for orgId: ${orgId}, name: ${name}, userId: ${userId}`,
    );
  }

  return org;
}

// Helper function to update org with Stripe customer ID
async function updateOrgWithStripeCustomerId({
  orgId,
  stripeCustomerId,
  tx,
}: {
  orgId: string;
  stripeCustomerId: string;
  tx: Transaction;
}) {
  await tx
    .update(Orgs)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(Orgs.id, orgId));
}

// Helper function to auto-subscribe to free plan
async function autoSubscribeToFreePlan({
  customerId,
  orgId,
  tx,
}: {
  customerId: string;
  orgId: string;
  tx: Transaction;
}) {
  try {
    // Get the free plan price ID
    const freePriceId = await getFreePlanPriceId();
    if (!freePriceId) {
      console.error(
        `Failed to get free plan price ID for orgId: ${orgId}, customerId: ${customerId}`,
      );
      return null;
    }

    // Create subscription to free plan
    const subscription = await createSubscription({
      billingInterval: BILLING_INTERVALS.MONTHLY,
      customerId,
      orgId,
      planType: PLAN_TYPES.FREE,
      priceId: freePriceId,
    });

    if (!subscription) {
      console.error(
        `Failed to create subscription for orgId: ${orgId}, customerId: ${customerId}, priceId: ${freePriceId}`,
      );
      return null;
    }

    // Update org with subscription info
    await tx
      .update(Orgs)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(Orgs.id, orgId));

    console.log(
      `Auto-subscribed org ${orgId} to free plan with subscription ${subscription.id}`,
    );
    return subscription;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Failed to auto-subscribe to free plan for orgId: ${orgId}, customerId: ${customerId}. Original error: ${error.message}`,
      );
    } else {
      console.error(
        `Failed to auto-subscribe to free plan for orgId: ${orgId}, customerId: ${customerId}`,
      );
    }
    // Don't throw error - org creation should still succeed
    return null;
  }
}

/**
 * Creates a new organization with Stripe integration and API key
 * This function is specifically designed for onboarding new users
 */
export async function createOrg({
  name,
  userId,
}: CreateOrgParams): Promise<CreateOrgResult> {
  return await db.transaction(async (tx) => {
    // Get user from database
    const existingUser = await tx.query.Users.findFirst({
      where: eq(Users.id, userId),
    });

    if (!existingUser) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    const userEmail = existingUser.email;

    // Check if organization name already exists in database
    const existingOrgByName = await tx.query.Orgs.findFirst({
      where: eq(Orgs.name, name),
    });

    if (existingOrgByName) {
      throw new Error(
        `Organization name "${name}" is already taken. Please choose a different name.`,
      );
    }

    // Generate unique org ID
    const orgId = createId({ prefix: 'org' });

    // Create org in database
    const org = await createOrgInDatabase({
      name,
      orgId,
      tx,
      userId,
    });

    // Create membership and API key in parallel
    const [_, apiKey] = await Promise.all([
      ensureOrgMembership({ orgId: org.id, tx, userId }),
      ensureDefaultApiKey({ orgId: org.id, tx, userId }),
    ]);

    // Create or update Stripe customer (optional - skip if Stripe not configured)
    let stripeCustomerId = '';

    try {
      const stripeCustomer = await upsertStripeCustomer({
        additionalMetadata: {
          orgName: name,
          userId,
        },
        email: userEmail,
        name,
        orgId: org.id,
      });

      if (stripeCustomer) {
        stripeCustomerId = stripeCustomer.id;

        // Update org in database with Stripe customer ID
        await updateOrgWithStripeCustomerId({
          orgId: org.id,
          stripeCustomerId,
          tx,
        });

        // Auto-subscribe to free plan
        await autoSubscribeToFreePlan({
          customerId: stripeCustomerId,
          orgId: org.id,
          tx,
        });

        console.log(
          'Stripe customer created:',
          stripeCustomerId,
          'for org:',
          org.id,
        );
      }
    } catch (error) {
      console.warn(
        'Skipping Stripe setup (not configured):',
        error instanceof Error ? error.message : error,
      );
    }

    return {
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
      },
      org: {
        id: org.id,
        name: org.name,
        stripeCustomerId,
      },
    };
  });
}
