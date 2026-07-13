-- Speisen-Katalog mandantenweit; Zuordnung je Veranstaltung über event_food_items

CREATE TABLE "event_food_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "food_item_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "sold_out" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_food_items_pkey" PRIMARY KEY ("id")
);

INSERT INTO "event_food_items" ("id", "tenant_id", "event_id", "food_item_id", "sort_order", "sold_out", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    fi."tenant_id",
    fi."eventId",
    fi."id",
    fi."sortOrder",
    fi."soldOut",
    fi."createdAt",
    fi."updatedAt"
FROM "FoodItem" fi;

CREATE UNIQUE INDEX "event_food_items_event_id_food_item_id_key" ON "event_food_items"("event_id", "food_item_id");
CREATE INDEX "event_food_items_tenant_id_idx" ON "event_food_items"("tenant_id");
CREATE INDEX "event_food_items_event_id_idx" ON "event_food_items"("event_id");
CREATE INDEX "event_food_items_food_item_id_idx" ON "event_food_items"("food_item_id");

ALTER TABLE "event_food_items" ADD CONSTRAINT "event_food_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_food_items" ADD CONSTRAINT "event_food_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_food_items" ADD CONSTRAINT "event_food_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FoodItem" DROP CONSTRAINT IF EXISTS "FoodItem_eventId_fkey";
DROP INDEX IF EXISTS "FoodItem_eventId_idx";
DROP INDEX IF EXISTS "FoodItem_tenant_id_eventId_idx";
ALTER TABLE "FoodItem" DROP COLUMN IF EXISTS "eventId";
ALTER TABLE "FoodItem" DROP COLUMN IF EXISTS "soldOut";
