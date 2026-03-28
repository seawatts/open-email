import { sql } from 'drizzle-orm';
import { db } from '../src/client';

type PolicyOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

interface Policy {
  name: string;
  operation: PolicyOperation;
  using?: string;
  withCheck?: string;
}

interface PolicyConfig {
  tableName: string;
  policies: Policy[];
}

// Create the requesting_user_id function as per Clerk docs
const createRequestingUserIdFunction = async () => {
  console.log('Creating requesting_user_id function...');
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION requesting_user_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $$
      SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
      )::text;
    $$;
  `);
  console.log('requesting_user_id function created successfully');
};

// Create the requesting_org_id function for consistency
const createRequestingOrgIdFunction = async () => {
  console.log('Creating requesting_org_id function...');
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION requesting_org_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $$
      SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'org_id',
        ''
      )::text;
    $$;
  `);
  console.log('requesting_org_id function created successfully');
};

// Common policy conditions using the requesting_user_id function
const policyConditions = {
  // For tables that need indirect user access via account
  gmailAccountOwnership: `EXISTS (
    SELECT 1 FROM open_email."account"
    WHERE open_email."account".id = "accountId"
    AND open_email."account"."userId" = (SELECT requesting_user_id())
  )`,
  // For tables that need indirect user access via emailMessages -> emailThreads -> account
  messageOwnership: `EXISTS (
    SELECT 1 FROM open_email."emailMessages"
    JOIN open_email."emailThreads" ON open_email."emailThreads".id = open_email."emailMessages"."threadId"
    JOIN open_email."account" ON open_email."account".id = open_email."emailThreads"."accountId"
    WHERE open_email."emailMessages".id = "messageId"
    AND open_email."account"."userId" = (SELECT requesting_user_id())
  )`,
  orgOwnership: (columnName = 'organizationId') =>
    `(SELECT requesting_org_id()) = ("${columnName}")::text`,
  // For tables that need indirect user access via emailThreads -> account
  threadOwnership: `EXISTS (
    SELECT 1 FROM open_email."emailThreads"
    JOIN open_email."account" ON open_email."account".id = open_email."emailThreads"."accountId"
    WHERE open_email."emailThreads".id = "threadId"
    AND open_email."account"."userId" = (SELECT requesting_user_id())
  )`,
  userOwnership: (columnName = 'userId') =>
    `(SELECT requesting_user_id()) = ("${columnName}")::text`,
} as const;

// Helper to create a policy for user ownership
const createUserOwnershipPolicy = (
  operation: PolicyOperation,
  columnName: string,
): Policy => ({
  name: `User can ${operation.toLowerCase()} their own records`,
  operation,
  using:
    operation === 'INSERT'
      ? undefined
      : policyConditions.userOwnership(columnName),
  withCheck:
    operation === 'INSERT'
      ? policyConditions.userOwnership(columnName)
      : undefined,
});

// Helper to create a policy for org ownership
const createOrgOwnershipPolicy = (
  operation: PolicyOperation,
  columnName: string,
): Policy => ({
  name: `Users can ${operation.toLowerCase()} their organization's records`,
  operation,
  using: policyConditions.orgOwnership(columnName),
});

const createPolicy = async (tableName: string, policy: Policy) => {
  const { name, operation, using, withCheck } = policy;

  // First drop the policy if it exists
  await db.execute(sql`
    DROP POLICY IF EXISTS ${sql.raw(`"${name}"`)} ON "open_email"."${sql.raw(tableName)}";
  `);

  // Then create the new policy
  const policySql = sql`
    CREATE POLICY ${sql.raw(`"${name}"`)}
    ON "open_email"."${sql.raw(tableName)}"
    ${operation === 'ALL' ? sql`FOR ALL` : sql`FOR ${sql.raw(operation)}`}
    TO authenticated
    ${using ? sql`USING (${sql.raw(using)})` : sql``}
    ${withCheck ? sql`WITH CHECK (${sql.raw(withCheck)})` : sql``}
  `;

  await db.execute(policySql);
};

const dropPolicy = async (tableName: string, policyName: string) => {
  await db.execute(sql`
    DROP POLICY IF EXISTS ${sql.raw(`"${policyName}"`)} ON "open_email"."${sql.raw(tableName)}";
  `);
};

const enableRLS = async (tableName: string) => {
  console.log(`Enabling RLS for table: ${tableName}`);
  await db.execute(sql`
    ALTER TABLE "open_email"."${sql.raw(tableName)}" ENABLE ROW LEVEL SECURITY;
  `);
  console.log(`RLS enabled for table: ${tableName}`);
};

// ============================================================================
// POLICY CONFIGURATIONS FOR ALL TABLES
// ============================================================================

const policyConfigs: Record<string, PolicyConfig> = {
  // Account table (OAuth providers) - user ownership
  account: {
    policies: [createUserOwnershipPolicy('ALL', 'userId')],
    tableName: 'account',
  },

  // API Keys table
  apiKeys: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'apiKeys',
  },

  // API Key Usage table
  apiKeyUsage: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'apiKeyUsage',
  },

  // Auth Codes table (for CLI authentication)
  authCodes: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'authCodes',
  },

  // Email Messages table - indirect ownership via threadId -> gmailAccountId
  emailMessages: {
    policies: [
      {
        name: 'Users can access their email messages',
        operation: 'ALL',
        using: policyConditions.threadOwnership,
        withCheck: policyConditions.threadOwnership,
      },
    ],
    tableName: 'emailMessages',
  },

  // Email Rules table - user ownership
  emailRules: {
    policies: [createUserOwnershipPolicy('ALL', 'userId')],
    tableName: 'emailRules',
  },

  // Email Threads table - indirect ownership via gmailAccountId
  emailThreads: {
    policies: [
      {
        name: 'Users can access their email threads',
        operation: 'ALL',
        using: policyConditions.gmailAccountOwnership,
        withCheck: policyConditions.gmailAccountOwnership,
      },
    ],
    tableName: 'emailThreads',
  },

  // Invitations table
  invitation: {
    policies: [
      createUserOwnershipPolicy('ALL', 'inviterId'),
      createOrgOwnershipPolicy('SELECT', 'organizationId'),
    ],
    tableName: 'invitation',
  },

  // Organization Members table
  member: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('SELECT', 'organizationId'),
    ],
    tableName: 'member',
  },

  // Organization table - membership based access
  organization: {
    policies: [
      {
        name: 'Users can select orgs they are members of',
        operation: 'SELECT',
        using: `EXISTS (
          SELECT 1 FROM open_email.member
          WHERE open_email.member."organizationId" = organization.id
          AND open_email.member."userId" = (SELECT requesting_user_id())
        )`,
      },
      {
        name: 'Users can update orgs they own',
        operation: 'UPDATE',
        using: `EXISTS (
          SELECT 1 FROM open_email.member
          WHERE open_email.member."organizationId" = organization.id
          AND open_email.member."userId" = (SELECT requesting_user_id())
          AND open_email.member.role = 'owner'
        )`,
      },
    ],
    tableName: 'organization',
  },

  // Session table - user ownership
  session: {
    policies: [createUserOwnershipPolicy('ALL', 'userId')],
    tableName: 'session',
  },

  // Short URLs table - user and org ownership
  shortUrls: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'shortUrls',
  },
  // User table - users can only access their own record
  user: {
    policies: [
      createUserOwnershipPolicy('SELECT', 'id'),
      createUserOwnershipPolicy('UPDATE', 'id'),
    ],
    tableName: 'user',
  },

  // User Profile table - userId is PK
  userProfile: {
    policies: [createUserOwnershipPolicy('ALL', 'userId')],
    tableName: 'userProfile',
  },
};

async function withErrorHandling<T>(
  operation: () => Promise<T>,
  successMessage: string,
  errorMessage: string,
): Promise<T> {
  try {
    const result = await operation();
    console.log(successMessage);
    return result;
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
}

async function setupTablePolicies(config: PolicyConfig) {
  return withErrorHandling(
    async () => {
      await enableRLS(config.tableName);
      await Promise.all(
        config.policies.map((policy) => createPolicy(config.tableName, policy)),
      );
    },
    `Policies for ${config.tableName} set up successfully`,
    `Error setting up policies for ${config.tableName}`,
  );
}

async function dropTablePolicies(config: PolicyConfig) {
  return withErrorHandling(
    async () => {
      await Promise.all(
        config.policies.map((policy) =>
          dropPolicy(config.tableName, policy.name),
        ),
      );
    },
    `Policies for ${config.tableName} dropped successfully`,
    `Error dropping policies for ${config.tableName}`,
  );
}

async function setupAllPolicies() {
  return withErrorHandling(
    async () => {
      // First create the requesting_user_id and requesting_org_id functions
      await createRequestingUserIdFunction();
      await createRequestingOrgIdFunction();

      // Process tables sequentially to avoid deadlocks
      for (const config of Object.values(policyConfigs)) {
        await setupTablePolicies(config);
      }
    },
    'All policies have been set up successfully',
    'Error setting up policies',
  );
}

async function _dropAllPolicies() {
  return withErrorHandling(
    async () => {
      await Promise.all(Object.values(policyConfigs).map(dropTablePolicies));
    },
    'All policies have been dropped successfully',
    'Error dropping policies',
  );
}

// _dropAllPolicies()
//   .then(() => {
//     console.log('Policy setup completed');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Policy setup failed:', error);
//     process.exit(1);
//   });
setupAllPolicies()
  .then(() => {
    console.log('Policy setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Policy setup failed:', error);
    process.exit(1);
  });
