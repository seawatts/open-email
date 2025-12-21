CREATE TYPE "public"."apiKeyUsageType" AS ENUM('mcp-server');--> statement-breakpoint
CREATE TYPE "public"."invitationStatus" AS ENUM('pending', 'accepted', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."localConnectionStatus" AS ENUM('connected', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."stripeSubscriptionStatus" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."userRole" AS ENUM('admin', 'owner', 'member');--> statement-breakpoint
CREATE TABLE "account" (
	"accessToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"accountId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"idToken" text,
	"password" text,
	"providerId" text NOT NULL,
	"refreshToken" text,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apiKeyUsage" (
	"apiKeyId" varchar(128) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"metadata" json,
	"organizationId" varchar(128) NOT NULL,
	"type" "apiKeyUsageType" NOT NULL,
	"updatedAt" timestamp with time zone,
	"userId" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apiKeys" (
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
CREATE TABLE "authCodes" (
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
CREATE TABLE "invitation" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"inviterId" varchar(128) NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"role" "userRole" DEFAULT 'member' NOT NULL,
	"status" "invitationStatus" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"organizationId" varchar(128) NOT NULL,
	"role" "userRole" DEFAULT 'member' NOT NULL,
	"userId" varchar(128) NOT NULL,
	CONSTRAINT "member_userId_organizationId_unique" UNIQUE("userId","organizationId")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"logo" text,
	"metadata" json,
	"name" text NOT NULL,
	"slug" text,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"stripeSubscriptionStatus" "stripeSubscriptionStatus",
	"updatedAt" timestamp with time zone,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
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
CREATE TABLE "shortUrls" (
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
CREATE TABLE "user" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updatedAt" timestamp with time zone,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_apiKeyId_apiKeys_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "public"."apiKeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKeyUsage" ADD CONSTRAINT "apiKeyUsage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKeys" ADD CONSTRAINT "apiKeys_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKeys" ADD CONSTRAINT "apiKeys_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authCodes" ADD CONSTRAINT "authCodes_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authCodes" ADD CONSTRAINT "authCodes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_activeOrganizationId_organization_id_fk" FOREIGN KEY ("activeOrganizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortUrls" ADD CONSTRAINT "shortUrls_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortUrls" ADD CONSTRAINT "shortUrls_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;