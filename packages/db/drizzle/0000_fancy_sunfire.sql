CREATE SCHEMA IF NOT EXISTS "open_email";
--> statement-breakpoint
CREATE TYPE "open_email"."agentMode" AS ENUM('approval', 'auto');--> statement-breakpoint
CREATE TYPE "open_email"."apiKeyUsageType" AS ENUM('mcp-server');--> statement-breakpoint
CREATE TYPE "open_email"."bundleType" AS ENUM('travel', 'purchases', 'finance', 'social', 'promos', 'updates', 'forums', 'personal');--> statement-breakpoint
CREATE TYPE "open_email"."emailActionStatus" AS ENUM('pending', 'approved', 'rejected', 'executed', 'failed');--> statement-breakpoint
CREATE TYPE "open_email"."emailActionType" AS ENUM('send', 'archive', 'label', 'snooze', 'delete', 'smart_action');--> statement-breakpoint
CREATE TYPE "open_email"."emailCategory" AS ENUM('urgent', 'needs_reply', 'awaiting_other', 'fyi', 'spam_like');--> statement-breakpoint
CREATE TYPE "open_email"."emailRuleType" AS ENUM('auto_archive', 'auto_label', 'always_ask', 'tone');--> statement-breakpoint
CREATE TYPE "open_email"."highlightType" AS ENUM('flight', 'hotel', 'package_tracking', 'payment', 'event', 'reservation', 'action_item');--> statement-breakpoint
CREATE TYPE "open_email"."invitationStatus" AS ENUM('pending', 'accepted', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "open_email"."keywordType" AS ENUM('person', 'company', 'location', 'topic', 'temporal', 'action', 'attachment', 'financial', 'product');--> statement-breakpoint
CREATE TYPE "open_email"."localConnectionStatus" AS ENUM('connected', 'disconnected');--> statement-breakpoint
CREATE TYPE "open_email"."memoryType" AS ENUM('fact', 'preference', 'writing_style', 'signature', 'relationship');--> statement-breakpoint
CREATE TYPE "open_email"."stripeSubscriptionStatus" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TYPE "open_email"."suggestedAction" AS ENUM('reply', 'follow_up', 'archive', 'label', 'ignore');--> statement-breakpoint
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
CREATE TABLE "open_email"."agentDecisions" (
	"category" "open_email"."emailCategory" NOT NULL,
	"completionTokens" integer DEFAULT 0,
	"confidence" real NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"draftReplies" json DEFAULT '[]'::json,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"modelUsed" text NOT NULL,
	"promptTokens" integer DEFAULT 0,
	"rawOutput" text,
	"reasons" json DEFAULT '[]'::json NOT NULL,
	"smartActions" json DEFAULT '[]'::json,
	"suggestedAction" "open_email"."suggestedAction" NOT NULL,
	"suggestedLabels" json DEFAULT '[]'::json,
	"summary" text,
	"threadId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailActions" (
	"actionType" "open_email"."emailActionType" NOT NULL,
	"agentDecisionId" varchar,
	"approvedAt" timestamp with time zone,
	"approvedBy" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"executedAt" timestamp with time zone,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"payload" json DEFAULT '{}'::json,
	"status" "open_email"."emailActionStatus" DEFAULT 'pending' NOT NULL,
	"threadId" varchar NOT NULL,
	"updatedAt" timestamp with time zone
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
CREATE TABLE "open_email"."emailHighlights" (
	"actionLabel" text,
	"actionUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"data" json NOT NULL,
	"highlightType" "open_email"."highlightType" NOT NULL,
	"icon" text,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"messageId" varchar,
	"subtitle" text,
	"threadId" varchar NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailKeywords" (
	"confidence" real DEFAULT 1,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"keywordType" "open_email"."keywordType" NOT NULL,
	"messageId" varchar,
	"metadata" json,
	"originalText" text,
	"threadId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailMessages" (
	"aiSummary" text,
	"attachmentMeta" json DEFAULT '[]'::json,
	"bodyPreview" text,
	"ccEmails" json DEFAULT '[]'::json,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"fromEmail" text NOT NULL,
	"fromName" text,
	"gmailMessageId" text NOT NULL,
	"hasAttachments" boolean DEFAULT false NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"internalDate" timestamp with time zone NOT NULL,
	"isFromUser" boolean DEFAULT false NOT NULL,
	"snippet" text,
	"subject" text NOT NULL,
	"threadId" varchar NOT NULL,
	"toEmails" json DEFAULT '[]'::json NOT NULL,
	CONSTRAINT "emailMessages_gmailMessageId_unique" UNIQUE("gmailMessageId")
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailRules" (
	"actions" json DEFAULT '{}'::json NOT NULL,
	"conditions" json DEFAULT '{}'::json NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"ruleType" "open_email"."emailRuleType" NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."emailThreads" (
	"aiSummary" text,
	"aiSummaryUpdatedAt" timestamp with time zone,
	"bundleType" "open_email"."bundleType" DEFAULT 'personal',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"accountId" varchar NOT NULL,
	"gmailThreadId" text NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"labels" json DEFAULT '[]'::json NOT NULL,
	"lastMessageAt" timestamp with time zone NOT NULL,
	"messageCount" integer DEFAULT 1 NOT NULL,
	"participantEmails" json DEFAULT '[]'::json NOT NULL,
	"searchVector" "tsvector",
	"snippet" text,
	"subject" text NOT NULL,
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
CREATE TABLE "open_email"."userContactStyle" (
	"commonPhrases" json,
	"contactDomain" text,
	"contactEmail" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"formalityLevel" real,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"lastMessageAt" timestamp with time zone,
	"messageCount" integer DEFAULT 0,
	"typicalGreeting" text,
	"typicalSignoff" text,
	"updatedAt" timestamp with time zone,
	"userId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."userEmailSettings" (
	"agentMode" "open_email"."agentMode" DEFAULT 'approval' NOT NULL,
	"autoActionsAllowed" json DEFAULT '[]'::json NOT NULL,
	"requireApprovalDomains" json DEFAULT '[]'::json NOT NULL,
	"toneProfile" json,
	"updatedAt" timestamp with time zone,
	"userId" varchar PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."userMemory" (
	"confidence" real DEFAULT 1,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"memoryType" "open_email"."memoryType" NOT NULL,
	"metadata" json,
	"source" text,
	"updatedAt" timestamp with time zone,
	"userId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_email"."userWritingProfile" (
	"analyzedMessageCount" integer DEFAULT 0,
	"averageMessageLength" integer,
	"commonPhrases" json,
	"defaultFormalityLevel" real,
	"detectedSignature" text,
	"lastAnalyzedAt" timestamp with time zone,
	"preferredGreeting" text,
	"preferredSignoff" text,
	"updatedAt" timestamp with time zone,
	"userId" varchar PRIMARY KEY NOT NULL,
	"vocabularyProfile" json
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
ALTER TABLE "open_email"."agentDecisions" ADD CONSTRAINT "agentDecisions_threadId_emailThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "open_email"."emailThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailActions" ADD CONSTRAINT "emailActions_agentDecisionId_agentDecisions_id_fk" FOREIGN KEY ("agentDecisionId") REFERENCES "open_email"."agentDecisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailActions" ADD CONSTRAINT "emailActions_approvedBy_user_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "open_email"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailActions" ADD CONSTRAINT "emailActions_threadId_emailThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "open_email"."emailThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_apiKeyId_apiKeys_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "open_email"."apiKeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeys" ADD CONSTRAINT "apiKeys_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."apiKeys" ADD CONSTRAINT "apiKeys_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."authCodes" ADD CONSTRAINT "authCodes_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "open_email"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."authCodes" ADD CONSTRAINT "authCodes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailHighlights" ADD CONSTRAINT "emailHighlights_messageId_emailMessages_id_fk" FOREIGN KEY ("messageId") REFERENCES "open_email"."emailMessages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailHighlights" ADD CONSTRAINT "emailHighlights_threadId_emailThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "open_email"."emailThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailKeywords" ADD CONSTRAINT "emailKeywords_messageId_emailMessages_id_fk" FOREIGN KEY ("messageId") REFERENCES "open_email"."emailMessages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."emailKeywords" ADD CONSTRAINT "emailKeywords_threadId_emailThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "open_email"."emailThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "open_email"."userContactStyle" ADD CONSTRAINT "userContactStyle_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."userEmailSettings" ADD CONSTRAINT "userEmailSettings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."userMemory" ADD CONSTRAINT "userMemory_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_email"."userWritingProfile" ADD CONSTRAINT "userWritingProfile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "open_email"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_keywords_keyword" ON "open_email"."emailKeywords" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX "idx_email_keywords_type" ON "open_email"."emailKeywords" USING btree ("keywordType");--> statement-breakpoint
CREATE INDEX "idx_email_keywords_thread_type" ON "open_email"."emailKeywords" USING btree ("threadId","keywordType");--> statement-breakpoint
CREATE INDEX "idx_email_threads_search" ON "open_email"."emailThreads" USING gin ("searchVector");--> statement-breakpoint
CREATE INDEX "idx_contact_style_email" ON "open_email"."userContactStyle" USING btree ("userId","contactEmail");--> statement-breakpoint
CREATE INDEX "idx_contact_style_domain" ON "open_email"."userContactStyle" USING btree ("userId","contactDomain");--> statement-breakpoint
CREATE INDEX "idx_user_memory_user" ON "open_email"."userMemory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_user_memory_type" ON "open_email"."userMemory" USING btree ("userId","memoryType");