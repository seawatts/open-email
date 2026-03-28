CREATE SCHEMA "open_email";
--> statement-breakpoint
CREATE TYPE "open_email"."apiKeyUsageType" AS ENUM('mcp-server');--> statement-breakpoint
CREATE TYPE "open_email"."gmailCategory" AS ENUM('primary', 'social', 'promotions', 'updates', 'forums');--> statement-breakpoint
CREATE TYPE "open_email"."invitationStatus" AS ENUM('pending', 'accepted', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "open_email"."stripeSubscriptionStatus" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TYPE "open_email"."suggestedAction" AS ENUM('reply', 'archive', 'snooze');--> statement-breakpoint
CREATE TYPE "open_email"."userRole" AS ENUM('admin', 'owner', 'member');--> statement-breakpoint
CREATE TABLE "open_email"."account" (
	"accessToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"accountId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"idToken" text,
	"lastHistoryId" text,
	"lastSyncAt" timestamp with time zone,
	"password" text,
	"providerId" text NOT NULL,
	"refreshToken" text,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL,
	"watchExpiration" timestamp with time zone,
	"watchHistoryId" text
);
--> statement-breakpoint
CREATE TABLE "open_email"."verification" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."apiKeyUsage" (
	"apiKeyId" varchar(128) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"metadata" json,
	"organizationId" varchar(128) NOT NULL,
	"type" "open_email"."apiKeyUsageType" NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."apiKeys" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"key" text NOT NULL,
	"lastUsedAt" timestamp with time zone,
	"name" text NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL,
	CONSTRAINT "apiKeys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "open_email"."authCodes" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"sessionId" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"usedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailMessages" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"threadId" varchar NOT NULL,
	"gmailMessageId" text NOT NULL,
	"fromEmail" text NOT NULL,
	"fromName" text,
	"toEmails" json DEFAULT '[]'::json NOT NULL,
	"ccEmails" json DEFAULT '[]'::json,
	"isFromUser" boolean DEFAULT false NOT NULL,
	"subject" text NOT NULL,
	"bodyPreview" text,
	"bodyHtml" text,
	"bodyText" text,
	"messageIdHeader" text,
	"inReplyTo" text,
	"hasAttachments" boolean DEFAULT false NOT NULL,
	"attachmentMeta" json DEFAULT '[]'::json,
	"attachmentText" text,
	"internalDate" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emailMessages_gmailMessageId_unique" UNIQUE("gmailMessageId")
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailRules" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"userId" varchar NOT NULL,
	"prompt" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"matchCount" integer DEFAULT 0 NOT NULL,
	"lastMatchedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailThreads" (
	"accountId" varchar NOT NULL,
	"gmailThreadId" text NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"snippet" text,
	"labels" json DEFAULT '[]'::json NOT NULL,
	"participantEmails" json DEFAULT '[]'::json NOT NULL,
	"messageCount" integer DEFAULT 1 NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"isStarred" boolean DEFAULT false NOT NULL,
	"isSpam" boolean DEFAULT false NOT NULL,
	"isTrash" boolean DEFAULT false NOT NULL,
	"gmailCategory" "open_email"."gmailCategory" DEFAULT 'primary',
	"lastMessageAt" timestamp with time zone NOT NULL,
	"aiSummary" text,
	"aiAction" "open_email"."suggestedAction",
	"aiConfidence" real,
	"aiQuickReplies" json DEFAULT '[]'::json,
	"aiTriagedAt" timestamp with time zone,
	"aiModelUsed" text,
	"status" text DEFAULT 'untriaged' NOT NULL,
	"snoozedUntil" timestamp with time zone,
	"searchVector" "tsvector",
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "emailThreads_accountId_gmailThreadId_unique" UNIQUE("accountId","gmailThreadId")
);
--> statement-breakpoint
CREATE TABLE "open_email"."invitation" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"inviterId" varchar(128) NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"role" "open_email"."userRole" DEFAULT 'member' NOT NULL,
	"status" "open_email"."invitationStatus" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."member" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"role" "open_email"."userRole" DEFAULT 'member' NOT NULL,
	"userId" varchar(128) NOT NULL,
	CONSTRAINT "member_userId_organizationId_unique" UNIQUE("userId","organizationId")
);
--> statement-breakpoint
CREATE TABLE "open_email"."organization" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"logo" text,
	"metadata" json,
	"name" text NOT NULL,
	"slug" text,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"stripeSubscriptionStatus" "open_email"."stripeSubscriptionStatus",
	"updatedAt" timestamp with time zone,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "open_email"."session" (
	"activeOrganizationId" varchar(128),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"ipAddress" text,
	"token" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"userAgent" text,
	"userId" varchar(128) NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "open_email"."shortUrls" (
	"code" varchar(128) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"redirectUrl" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."userProfile" (
	"memory" text DEFAULT '' NOT NULL,
	"preferences" json DEFAULT '{}'::json NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."user" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"image" text,
	"lastLoginMethod" text,
	"name" text NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "open_email"."account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_apiKeyId_apiKeys_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "open_email"."apiKeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeys" ADD CONSTRAINT "apiKeys_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeys" ADD CONSTRAINT "apiKeys_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."authCodes" ADD CONSTRAINT "authCodes_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."authCodes" ADD CONSTRAINT "authCodes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailMessages" ADD CONSTRAINT "emailMessages_threadId_emailThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "open_email"."emailThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailRules" ADD CONSTRAINT "emailRules_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailThreads" ADD CONSTRAINT "emailThreads_accountId_account_id_fk" FOREIGN KEY ("accountId") REFERENCES "open_email"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."session" ADD CONSTRAINT "session_activeOrganizationId_organization_id_fk" FOREIGN KEY ("activeOrganizationId") REFERENCES "open_email"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."shortUrls" ADD CONSTRAINT "shortUrls_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."shortUrls" ADD CONSTRAINT "shortUrls_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."userProfile" ADD CONSTRAINT "userProfile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_messages_from_email" ON "open_email"."emailMessages" USING btree ("fromEmail");--> statement-breakpoint
CREATE INDEX "idx_email_messages_internal_date" ON "open_email"."emailMessages" USING btree ("internalDate");--> statement-breakpoint
CREATE INDEX "idx_email_messages_is_from_user" ON "open_email"."emailMessages" USING btree ("isFromUser");--> statement-breakpoint
CREATE INDEX "idx_email_threads_search" ON "open_email"."emailThreads" USING gin ("searchVector");--> statement-breakpoint
CREATE INDEX "idx_email_threads_status" ON "open_email"."emailThreads" USING btree ("status");