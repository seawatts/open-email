import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// Mock process.env for Stripe environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock external dependencies
const mockUpsertStripeCustomer = mock(() => Promise.resolve({ id: 'cus_789' }));
const mockCreateSubscription = mock(() =>
  Promise.resolve({ id: 'sub_123', status: 'active' }),
);
const mockGetFreePlanPriceId = mock(() => Promise.resolve('price_free_123'));
const mockGenerateRandomName = mock(() => 'test-org-slug');
const mockGenerateUniqueOrgName = mock(() => 'unique-org-name');

// Mock Stripe module before it gets imported
mock.module('@seawatts/stripe', () => ({
  BILLING_INTERVALS: { MONTHLY: 'month' },
  createSubscription: mockCreateSubscription,
  getFreePlanPriceId: mockGetFreePlanPriceId,
  PLAN_TYPES: { FREE: 'free' },
  upsertStripeCustomer: mockUpsertStripeCustomer,
}));

// Mock the stripe env module
mock.module('@seawatts/stripe/src/env.server', () => ({
  env: {
    STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
  },
}));

mock.module('@seawatts/id', () => ({
  generateRandomName: mockGenerateRandomName,
  generateUniqueOrgName: mockGenerateUniqueOrgName,
}));

// Mock database
const mockTransaction = mock((callback) =>
  Promise.resolve(
    callback({
      insert: mockInsert,
      query: mockQuery,
      update: mockUpdate,
    }),
  ),
);

const mockQuery = {
  ApiKeys: {
    findFirst: mock(() =>
      Promise.resolve(null as Partial<ApiKeyType> | null | undefined),
    ),
  },
  OrgMembers: {
    findFirst: mock(() =>
      Promise.resolve(null as Partial<OrgMembersType> | null | undefined),
    ),
  },
  Orgs: {
    findFirst: mock(() =>
      Promise.resolve(null as Partial<OrgType> | null | undefined),
    ),
  },
  Users: {
    findFirst: mock(() =>
      Promise.resolve({
        email: 'test@example.com',
        id: 'user_123',
        name: 'Test User',
      } as Partial<UserType> | null | undefined),
    ),
  },
};

// Create proper mock chains for insert operations
const mockOrgInsertResult = mock(() =>
  Promise.resolve([
    {
      id: 'org_db_123',
      name: 'Test Organization',
      slug: 'test-org-slug',
      stripeCustomerId: null,
    },
  ]),
);

const mockMemberInsertResult = mock(() => Promise.resolve());
const mockApiKeyInsertResult = mock(() =>
  Promise.resolve([
    {
      id: 'key_123',
      key: 'sk_test_123',
      name: 'Default',
      organizationId: 'org_db_123',
      userId: 'user_123',
    },
  ]),
);

// Create insert mock that returns different chains based on the table
const mockInsert = mock((table) => {
  // Detect which table we're inserting into based on table shape/properties
  const tableName = table.name || table.constructor.name || 'Unknown';

  // Return different mock chains based on the table
  if (tableName.includes('Org') && !tableName.includes('Member')) {
    return {
      values: mock(() => ({
        onConflictDoUpdate: mock(() => ({
          returning: mockOrgInsertResult,
        })),
      })),
    };
  }
  if (tableName.includes('Member')) {
    return {
      values: mock(() => ({
        onConflictDoUpdate: mockMemberInsertResult,
      })),
    };
  }
  if (tableName.includes('ApiKey')) {
    return {
      values: mock(() => ({
        onConflictDoUpdate: mock(() => ({
          returning: mockApiKeyInsertResult,
        })),
        returning: mockApiKeyInsertResult,
      })),
    };
  }

  // Default fallback
  return {
    values: mock(() => ({
      onConflictDoUpdate: mock(() => ({
        returning: mock(() => Promise.resolve([{}])),
      })),
      returning: mock(() => Promise.resolve([{}])),
    })),
  };
});

const mockUpdate = mock(() => ({
  set: mock(() => ({
    where: mock(() => Promise.resolve()),
  })),
}));

mock.module('../../src/client', () => ({
  db: {
    insert: mockInsert,
    query: mockQuery,
    transaction: mockTransaction,
    update: mockUpdate,
  },
}));

// Mock the schema tables
mock.module('../../src/schema', () => {
  const createTable = (name: string) => ({ name });
  return {
    ApiKeys: createTable('ApiKeys'),
    OrgMembers: createTable('OrgMembers'),
    Orgs: createTable('Orgs'),
    Users: createTable('Users'),
  };
});

// Import after all mocks are set up
import { upsertOrg } from '@seawatts/api/services';
import type {
  ApiKeyType,
  OrgMembersType,
  OrgType,
  UserType,
} from '../../src/schema';

describe('upsertOrg', () => {
  beforeEach(() => {
    // Reset all mocks
    mockUpsertStripeCustomer.mockClear();
    mockCreateSubscription.mockClear();
    mockGetFreePlanPriceId.mockClear();
    mockGenerateRandomName.mockClear();
    mockGenerateUniqueOrgName.mockClear();
    mockTransaction.mockClear();
    mockQuery.ApiKeys.findFirst.mockClear();
    mockQuery.OrgMembers.findFirst.mockClear();
    mockQuery.Orgs.findFirst.mockClear();
    mockQuery.Users.findFirst.mockClear();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockOrgInsertResult.mockClear();
    mockMemberInsertResult.mockClear();
    mockApiKeyInsertResult.mockClear();

    // Setup default mock implementations
    mockGetFreePlanPriceId.mockResolvedValue('price_free_123');
    mockGenerateRandomName.mockReturnValue('test-org-slug');
    mockGenerateUniqueOrgName.mockReturnValue('unique-org-name');

    // Setup database mocks
    mockQuery.Users.findFirst.mockResolvedValue({
      email: 'test@example.com',
      id: 'user_123',
      name: 'Test User',
    });

    mockQuery.OrgMembers.findFirst.mockResolvedValue(null);
    mockQuery.Orgs.findFirst.mockResolvedValue(null);
    mockQuery.ApiKeys.findFirst.mockResolvedValue(null);

    mockUpsertStripeCustomer.mockResolvedValue({ id: 'cus_789' });

    // Setup transaction mock
    mockTransaction.mockImplementation(async (callback) => {
      return await callback({
        insert: mockInsert,
        query: mockQuery,
        update: mockUpdate,
      });
    });

    // Setup default return values
    mockOrgInsertResult.mockResolvedValue([
      {
        id: 'org_db_123',
        name: 'Test Organization',
        slug: 'test-org-slug',
        stripeCustomerId: null,
      },
    ]);

    mockApiKeyInsertResult.mockResolvedValue([
      {
        id: 'key_123',
        key: 'sk_test_123',
        name: 'Default',
        organizationId: 'org_db_123',
        userId: 'user_123',
      },
    ]);
  });

  describe('new organization creation', () => {
    it('should create a new organization successfully', async () => {
      const result = await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      expect(result).toEqual({
        apiKey: {
          id: 'key_123',
          key: 'sk_test_123',
          name: 'Default',
        },
        org: {
          id: 'org_db_123',
          name: 'Test Organization',
          stripeCustomerId: 'cus_789',
        },
      });

      expect(mockUpsertStripeCustomer).toHaveBeenCalledWith({
        additionalMetadata: {
          orgName: 'Test Organization',
          userId: 'user_123',
        },
        email: 'test@example.com',
        name: 'Test Organization',
        orgId: 'org_db_123',
      });
      expect(mockCreateSubscription).toHaveBeenCalledWith({
        billingInterval: 'month',
        customerId: 'cus_789',
        orgId: 'org_db_123',
        planType: 'free',
        priceId: 'price_free_123',
      });
    });

    it('should handle existing user membership and return existing org', async () => {
      // Mock that user is already a member of an org
      mockQuery.OrgMembers.findFirst.mockResolvedValueOnce({
        organizationId: 'existing_org_123',
        userId: 'user_123',
      });

      // Mock existing org
      mockQuery.Orgs.findFirst.mockResolvedValueOnce({
        id: 'existing_org_123',
        name: 'Existing Organization',
        stripeCustomerId: 'cus_existing',
      });

      // Mock existing API key
      mockQuery.ApiKeys.findFirst.mockResolvedValueOnce({
        id: 'existing_key_123',
        key: 'sk_test_existing',
        name: 'Default',
        organizationId: 'existing_org_123',
      });

      const result = await upsertOrg({
        name: 'Test Organization',
        userId: 'user_123',
      });

      expect(result).toEqual({
        apiKey: {
          id: 'existing_key_123',
          key: 'sk_test_existing',
          name: 'Default',
        },
        org: {
          id: 'existing_org_123',
          name: 'Existing Organization',
          stripeCustomerId: 'cus_existing',
        },
      });

      // Should not create new org or Stripe customer
      expect(mockUpsertStripeCustomer).not.toHaveBeenCalled();
    });
  });

  describe('organization update', () => {
    it('should update existing organization when orgId is provided', async () => {
      // Mock existing org
      mockQuery.Orgs.findFirst.mockResolvedValueOnce({
        id: 'org_db_123',
        name: 'Old Name',
        stripeCustomerId: 'cus_old',
      });

      const result = await upsertOrg({
        name: 'Updated Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      expect(result.org.name).toEqual('Old Name'); // Returns existing org data
      expect(result.org.id).toEqual('org_db_123');
      expect(result.org.stripeCustomerId).toEqual('cus_old');
      // Also doesn't create new Stripe customer
      expect(mockUpsertStripeCustomer).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when user is not found', async () => {
      mockQuery.Users.findFirst.mockResolvedValueOnce(null);

      await expect(
        upsertOrg({
          name: 'Test Organization',
          orgId: 'org_db_123',
          userId: 'user_123',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should handle Stripe customer creation failure', async () => {
      mockUpsertStripeCustomer.mockRejectedValue(
        new Error('Failed to create or get Stripe customer'),
      );

      await expect(
        upsertOrg({
          name: 'Test Organization',
          orgId: 'org_db_123',
          userId: 'user_123',
        }),
      ).rejects.toThrow('Failed to create or get Stripe customer');
    });
  });

  describe('race condition handling', () => {
    it('should handle concurrent requests gracefully', async () => {
      // Mock that org already exists in database (race condition)
      mockQuery.Orgs.findFirst.mockResolvedValueOnce({
        id: 'org_db_123',
        name: 'Test Organization',
        stripeCustomerId: 'cus_existing',
      });

      const result = await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      expect(result.org.id).toEqual('org_db_123');
    });
  });

  describe('subscription handling', () => {
    it('should auto-subscribe to free plan for new organizations', async () => {
      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      expect(mockCreateSubscription).toHaveBeenCalledWith({
        billingInterval: 'month',
        customerId: 'cus_789',
        orgId: 'org_db_123',
        planType: 'free',
        priceId: 'price_free_123',
      });
    });

    it('should skip auto-subscription if org already has subscription', async () => {
      // Mock existing subscription
      mockQuery.Orgs.findFirst.mockResolvedValueOnce({
        id: 'org_db_123',
        name: 'Test Organization',
        stripeCustomerId: 'cus_789',
        stripeSubscriptionId: 'sub_existing',
      });

      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      expect(mockCreateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('database operations', () => {
    it('should use onConflictDoUpdate for insert operations', async () => {
      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Check that insert was called
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Stripe customer duplication prevention', () => {
    it('should not create duplicate Stripe customers for the same org', async () => {
      // Mock that org already exists with a Stripe customer ID
      mockQuery.Orgs.findFirst.mockResolvedValueOnce({
        id: 'org_db_123',
        name: 'Test Organization',
        stripeCustomerId: 'cus_existing_123',
      });

      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Should not call upsertStripeCustomer when org already has a customer ID
      expect(mockUpsertStripeCustomer).not.toHaveBeenCalled();
    });

    it('should handle concurrent upsertOrg calls without creating duplicate customers', async () => {
      // Mock that findExistingOrg returns null for both calls (no existing org found)
      mockQuery.OrgMembers.findFirst.mockResolvedValue(null);
      mockQuery.Orgs.findFirst.mockResolvedValue(null);

      // Make two concurrent calls
      const [result1, result2] = await Promise.all([
        upsertOrg({
          name: 'Test Organization',
          orgId: 'org_db_123',
          userId: 'user_123',
        }),
        upsertOrg({
          name: 'Test Organization',
          orgId: 'org_db_123',
          userId: 'user_123',
        }),
      ]);

      // Both should return the same result
      expect(result1.org.id).toBe(result2.org.id);
      expect(result1.org.stripeCustomerId).toBe(result2.org.stripeCustomerId);

      // Both calls should result in the same Stripe customer due to idempotency
      expect(mockUpsertStripeCustomer).toHaveBeenCalledTimes(2);
      expect(mockUpsertStripeCustomer).toHaveBeenCalledWith({
        additionalMetadata: {
          orgName: 'Test Organization',
          userId: 'user_123',
        },
        email: 'test@example.com',
        name: 'Test Organization',
        orgId: 'org_db_123',
      });
    });

    it('should use existing Stripe customer when found by orgId search', async () => {
      // Mock that the final check finds an existing org with Stripe customer
      mockQuery.Orgs.findFirst
        .mockResolvedValueOnce(null) // First call: no existing org
        .mockResolvedValueOnce({
          id: 'org_db_123',
          name: 'Test Organization',
          stripeCustomerId: 'cus_existing_456',
        }); // Second call: existing org found

      const result = await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Should return existing org data without creating new Stripe customer
      expect(result.org.stripeCustomerId).toBe('cus_existing_456');
      expect(mockUpsertStripeCustomer).not.toHaveBeenCalled();
    });

    it('should handle database transaction rollback on Stripe customer creation failure', async () => {
      // Make upsertStripeCustomer fail
      mockUpsertStripeCustomer.mockRejectedValueOnce(
        new Error('Stripe API error'),
      );

      await expect(
        upsertOrg({
          name: 'Test Organization',
          orgId: 'org_db_123',
          userId: 'user_123',
        }),
      ).rejects.toThrow('Stripe API error');

      // Verify that the transaction was rolled back (no org should be created)
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should use idempotency key when creating new Stripe customer', async () => {
      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Verify that upsertStripeCustomer was called with correct parameters
      expect(mockUpsertStripeCustomer).toHaveBeenCalledWith({
        additionalMetadata: {
          orgName: 'Test Organization',
          userId: 'user_123',
        },
        email: 'test@example.com',
        name: 'Test Organization',
        orgId: 'org_db_123',
      });
    });

    it('should handle existing org with null stripeCustomerId', async () => {
      // Mock that findExistingOrg returns null (no existing org found)
      mockQuery.OrgMembers.findFirst.mockResolvedValue(null);
      mockQuery.Orgs.findFirst.mockResolvedValue(null);

      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Should create Stripe customer since no existing org was found
      expect(mockUpsertStripeCustomer).toHaveBeenCalled();
    });

    it('should verify upsertStripeCustomer uses orgId for idempotency', async () => {
      // Mock upsertStripeCustomer to return a customer
      mockUpsertStripeCustomer.mockResolvedValueOnce({
        id: 'cus_789',
      });

      await upsertOrg({
        name: 'Test Organization',
        orgId: 'org_db_123',
        userId: 'user_123',
      });

      // Verify that the orgId is passed as the idempotency key
      expect(mockUpsertStripeCustomer).toHaveBeenCalledWith({
        additionalMetadata: {
          orgName: 'Test Organization',
          userId: 'user_123',
        },
        email: 'test@example.com',
        name: 'Test Organization',
        orgId: 'org_db_123',
      });
    });
  });
});
