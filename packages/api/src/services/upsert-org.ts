import { db } from '@seawatts/db/client';
import { ApiKeys, OrgMembers, Orgs, Users } from '@seawatts/db/schema';
import { createId, generateUniqueOrgName } from '@seawatts/id';
import {
  BILLING_INTERVALS,
  createSubscription,
  getFreePlanPriceId,
  PLAN_TYPES,
  upsertStripeCustomer,
} from '@seawatts/stripe';
import { eq } from 'drizzle-orm';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type UpsertOrgParams = {
  orgId?: string;
  name: string;
  userId: string;
};

type UpsertOrgResult = {
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

async function upsertOrgInDatabase({
  orgId,
  name,
  userId,
  stripeCustomerId,
  tx,
}: {
  orgId: string;
  name: string;
  userId: string;
  stripeCustomerId?: string;
  tx: Transaction;
}) {
  const [org] = await tx
    .insert(Orgs)
    .values({
      createdByUserId: userId,
      id: orgId,
      name,
      stripeCustomerId,
    })
    .onConflictDoUpdate({
      set: {
        name,
        stripeCustomerId,
        updatedAt: new Date(),
      },
      target: [Orgs.id],
    })
    .returning();

  if (!org) {
    throw new Error(
      `Failed to create or update organization for orgId: ${orgId}, name: ${name}, userId: ${userId}`,
    );
  }

  return org;
}

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

// Helper function to build the return result from existing org data
async function buildOrgResult({
  org,
  tx,
  userId,
}: {
  org: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  tx: Transaction;
  userId: string;
}): Promise<UpsertOrgResult> {
  // Run membership and API key creation in parallel
  const [_, apiKey] = await Promise.all([
    ensureOrgMembership({ orgId: org.id, tx, userId }),
    ensureDefaultApiKey({ orgId: org.id, tx, userId }),
  ]);

  return {
    apiKey: {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
    },
    org: {
      id: org.id,
      name: org.name,
      stripeCustomerId: org.stripeCustomerId || '',
    },
  };
}

// Helper function to check if we should use an existing organization
async function findExistingOrg({
  orgId,
  userId,
  tx,
}: {
  orgId?: string;
  userId: string;
  tx: Transaction;
}): Promise<{
  org: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  reason: string;
} | null> {
  // Run all possible org existence checks in parallel
  const [existingMembership, existingOrgByOrgId, existingOrgByUser] =
    await Promise.all([
      // Check 1: User already has an org membership
      tx.query.OrgMembers.findFirst({
        where: eq(OrgMembers.userId, userId),
      }),
      // Check 2: If orgId is provided, check if organization already exists
      orgId
        ? tx.query.Orgs.findFirst({
            where: eq(Orgs.id, orgId),
          })
        : null,
      // Check 3: User has created any organization
      !orgId
        ? tx.query.Orgs.findFirst({
            where: eq(Orgs.createdByUserId, userId),
          })
        : null,
    ]);

  // Check 1: User already has an org membership
  if (existingMembership && !orgId) {
    const existingOrg = await tx.query.Orgs.findFirst({
      where: eq(Orgs.id, existingMembership.orgId),
    });

    if (existingOrg) {
      // Run API key check
      const apiKey = await tx.query.ApiKeys.findFirst({
        where: eq(ApiKeys.orgId, existingOrg.id),
      });

      if (apiKey) {
        return { org: existingOrg, reason: 'existing_membership' };
      }
    }
  }

  // Check 2: If orgId is provided, check if organization already exists
  if (existingOrgByOrgId) {
    console.log(
      'Organization already exists for orgId:',
      orgId,
      'using existing org:',
      existingOrgByOrgId.id,
    );
    return { org: existingOrgByOrgId, reason: 'existing_org_id' };
  }

  // Check 3: User has created any organization
  if (existingOrgByUser && !orgId) {
    console.log(
      'User already has an organization:',
      existingOrgByUser.id,
      'using existing org',
    );
    return { org: existingOrgByUser, reason: 'existing_user_org' };
  }

  return null;
}

export async function upsertOrg({
  orgId,
  name,
  userId,
}: UpsertOrgParams): Promise<UpsertOrgResult> {
  return await db.transaction(async (tx) => {
    // Check for existing organizations first
    const existingOrgResult = await findExistingOrg({ orgId, tx, userId });
    if (existingOrgResult) {
      return buildOrgResult({
        org: existingOrgResult.org,
        tx,
        userId,
      });
    }

    // Get user from database
    const existingUser = await tx.query.Users.findFirst({
      where: eq(Users.id, userId),
    });

    if (!existingUser) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    const userEmail = existingUser.email;

    // Generate unique org ID and name if needed
    const finalOrgId = orgId || createId({ prefix: 'org' });
    let finalOrgName = name;

    // Check if organization name already exists in database
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const existingOrgByName = await tx.query.Orgs.findFirst({
        where: eq(Orgs.name, finalOrgName),
      });

      if (!existingOrgByName) {
        break;
      }

      // Generate a new unique name
      finalOrgName = generateUniqueOrgName();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(
        `Failed to create organization after ${maxAttempts} attempts. Please try again.`,
      );
    }

    // Create org in database
    const org = await upsertOrgInDatabase({
      name: finalOrgName,
      orgId: finalOrgId,
      tx,
      userId,
    });

    // Create or update Stripe customer (optional - skip if Stripe not configured)
    let stripeCustomerId: string | null = null;

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

        // Auto-subscribe to free plan only if org doesn't already have a subscription
        if (!org.stripeSubscriptionId) {
          await autoSubscribeToFreePlan({
            customerId: stripeCustomerId,
            orgId: org.id,
            tx,
          });
        }

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

    return buildOrgResult({
      org: { ...org, stripeCustomerId },
      tx,
      userId,
    });
  });
}
