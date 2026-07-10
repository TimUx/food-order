-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'CASHIER');

-- CreateEnum
CREATE TYPE "StatusCode" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'PICKED_UP', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TenantApplicationStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'CLARIFICATION', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('MAGIC_LINK', 'LOGIN_CODE');

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "description" TEXT,
    "address" TEXT,
    "website" TEXT,
    "activated_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" TEXT NOT NULL,
    "order_field_first_name_required" BOOLEAN NOT NULL DEFAULT true,
    "order_field_last_name_required" BOOLEAN NOT NULL DEFAULT true,
    "order_field_email_required" BOOLEAN NOT NULL DEFAULT false,
    "order_field_phone_required" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_deadline_hours" INTEGER NOT NULL DEFAULT 24,
    "data_retention_days" INTEGER NOT NULL DEFAULT 365,
    "extra_json" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_login_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "code_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "onlineOrdersActive" BOOLEAN NOT NULL DEFAULT true,
    "cashierActive" BOOLEAN NOT NULL DEFAULT true,
    "ordersClosed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOrderCounter" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyOrderCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,
    "maxQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerId" TEXT,
    "lookupToken" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "orderDate" DATE NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "StatusCode" NOT NULL DEFAULT 'NEW',
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatus" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "StatusCode" NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "tenant_id" TEXT,
    "clubName" TEXT NOT NULL DEFAULT 'FestSchmiede',
    "description" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "orderFieldFirstNameRequired" BOOLEAN NOT NULL DEFAULT true,
    "orderFieldLastNameRequired" BOOLEAN NOT NULL DEFAULT true,
    "orderFieldEmailRequired" BOOLEAN NOT NULL DEFAULT false,
    "orderFieldPhoneRequired" BOOLEAN NOT NULL DEFAULT false,
    "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "emailCustomText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_pages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "content_html" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "module_version" TEXT NOT NULL DEFAULT '0.0.0',
    "installed" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "installed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "last_health_status" TEXT,
    "last_health_check" TIMESTAMP(3),
    "ever_installed" BOOLEAN NOT NULL DEFAULT false,
    "ever_activated" BOOLEAN NOT NULL DEFAULT false,
    "lifecycle_status" TEXT,
    "last_error" TEXT,
    "schema_version" TEXT NOT NULL DEFAULT '0',
    "image_version" TEXT,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("tenant_id","module_id")
);

-- CreateTable
CREATE TABLE "module_migrations" (
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "migration" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_migrations_pkey" PRIMARY KEY ("tenant_id","module_id","migration")
);

-- CreateTable
CREATE TABLE "platform_audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "tenant_id" TEXT,
    "module_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_applications" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "organization_type" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "member_count" INTEGER,
    "events_per_year" INTEGER,
    "reason" TEXT NOT NULL,
    "desired_features" TEXT NOT NULL,
    "free_tier_justification" TEXT NOT NULL,
    "planned_usage" TEXT NOT NULL,
    "notes" TEXT,
    "requested_subdomain" TEXT NOT NULL,
    "status" "TenantApplicationStatus" NOT NULL DEFAULT 'NEW',
    "admin_comment" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "tenant_id" TEXT,
    "privacy_accepted" BOOLEAN NOT NULL DEFAULT true,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_legal_pages" (
    "id" TEXT NOT NULL,
    "page_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "content_html" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_legal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_user_sessions_refresh_token_hash_key" ON "platform_user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "platform_user_sessions_user_id_idx" ON "platform_user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- CreateIndex
CREATE INDEX "User_tenant_id_email_idx" ON "User"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_email_key" ON "User"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_login_tokens_token_hash_key" ON "auth_login_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_login_tokens_tenant_id_user_id_idx" ON "auth_login_tokens"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "auth_login_tokens_expires_at_idx" ON "auth_login_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "Event_tenant_id_idx" ON "Event"("tenant_id");

-- CreateIndex
CREATE INDEX "Event_tenant_id_isActive_idx" ON "Event"("tenant_id", "isActive");

-- CreateIndex
CREATE INDEX "Event_tenant_id_createdAt_idx" ON "Event"("tenant_id", "createdAt");

-- CreateIndex
CREATE INDEX "DailyOrderCounter_tenant_id_idx" ON "DailyOrderCounter"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "DailyOrderCounter_eventId_date_key" ON "DailyOrderCounter"("eventId", "date");

-- CreateIndex
CREATE INDEX "Customer_tenant_id_idx" ON "Customer"("tenant_id");

-- CreateIndex
CREATE INDEX "FoodItem_tenant_id_idx" ON "FoodItem"("tenant_id");

-- CreateIndex
CREATE INDEX "FoodItem_tenant_id_eventId_idx" ON "FoodItem"("tenant_id", "eventId");

-- CreateIndex
CREATE INDEX "FoodItem_eventId_idx" ON "FoodItem"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_lookupToken_key" ON "Order"("lookupToken");

-- CreateIndex
CREATE INDEX "Order_tenant_id_idx" ON "Order"("tenant_id");

-- CreateIndex
CREATE INDEX "Order_tenant_id_status_idx" ON "Order"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "Order_tenant_id_eventId_idx" ON "Order"("tenant_id", "eventId");

-- CreateIndex
CREATE INDEX "Order_tenant_id_createdAt_idx" ON "Order"("tenant_id", "createdAt");

-- CreateIndex
CREATE INDEX "Order_eventId_status_idx" ON "Order"("eventId", "status");

-- CreateIndex
CREATE INDEX "Order_tenant_id_eventId_status_idx" ON "Order"("tenant_id", "eventId", "status");

-- CreateIndex
CREATE INDEX "Order_tenant_id_updatedAt_idx" ON "Order"("tenant_id", "updatedAt");

-- CreateIndex
CREATE INDEX "Order_eventId_status_readyAt_idx" ON "Order"("eventId", "status", "readyAt");

-- CreateIndex
CREATE INDEX "Order_tenant_id_lookupToken_idx" ON "Order"("tenant_id", "lookupToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_eventId_orderDate_orderNumber_key" ON "Order"("eventId", "orderDate", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatus_orderId_idx" ON "OrderStatus"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSettings_tenant_id_key" ON "ClubSettings"("tenant_id");

-- CreateIndex
CREATE INDEX "legal_pages_tenant_id_idx" ON "legal_pages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_tenant_id_page_type_key" ON "legal_pages"("tenant_id", "page_type");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_tenant_id_slug_key" ON "legal_pages"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "modules_tenant_id_idx" ON "modules"("tenant_id");

-- CreateIndex
CREATE INDEX "module_migrations_tenant_id_idx" ON "module_migrations"("tenant_id");

-- CreateIndex
CREATE INDEX "platform_audit_log_module_id_idx" ON "platform_audit_log"("module_id");

-- CreateIndex
CREATE INDEX "platform_audit_log_tenant_id_idx" ON "platform_audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "platform_audit_log_tenant_id_created_at_idx" ON "platform_audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_log_created_at_idx" ON "platform_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "tenant_applications_status_idx" ON "tenant_applications"("status");

-- CreateIndex
CREATE INDEX "tenant_applications_email_idx" ON "tenant_applications"("email");

-- CreateIndex
CREATE INDEX "tenant_applications_created_at_idx" ON "tenant_applications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_applications_requested_subdomain_key" ON "tenant_applications"("requested_subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "platform_legal_pages_slug_key" ON "platform_legal_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_legal_pages_page_type_key" ON "platform_legal_pages"("page_type");

-- AddForeignKey
ALTER TABLE "platform_user_sessions" ADD CONSTRAINT "platform_user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_login_tokens" ADD CONSTRAINT "auth_login_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_login_tokens" ADD CONSTRAINT "auth_login_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOrderCounter" ADD CONSTRAINT "DailyOrderCounter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOrderCounter" ADD CONSTRAINT "DailyOrderCounter_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatus" ADD CONSTRAINT "OrderStatus_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSettings" ADD CONSTRAINT "ClubSettings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_migrations" ADD CONSTRAINT "module_migrations_tenant_id_module_id_fkey" FOREIGN KEY ("tenant_id", "module_id") REFERENCES "modules"("tenant_id", "module_id") ON DELETE CASCADE ON UPDATE CASCADE;

