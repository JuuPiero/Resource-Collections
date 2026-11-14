import "server-only";

import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  resourceFiles,
  resourcePermissions,
  resourcePreviews,
  resources,
  users,
} from "@/db/schema";
import type { AppUser } from "@/lib/users";

export async function listResourcesForUser(user: AppUser, isAdmin: boolean) {
  const database = getDb();
  const now = new Date();

  const baseQuery = database
    .select({ resource: resources })
    .from(resources)
    .leftJoin(
      resourcePermissions,
      and(
        eq(resourcePermissions.resourceId, resources.id),
        eq(resourcePermissions.userId, user.id),
      ),
    );

  const rows = isAdmin
    ? await baseQuery.orderBy(desc(resources.createdAt))
    : await baseQuery
        .where(
          and(
            eq(resources.status, "published"),
            or(
              eq(resources.accessLevel, "public"),
              eq(resources.accessLevel, "authenticated"),
              and(
                eq(resources.accessLevel, "restricted"),
                eq(resourcePermissions.canDownload, true),
                or(
                  isNull(resourcePermissions.expiresAt),
                  gt(resourcePermissions.expiresAt, now),
                ),
              ),
            ),
          ),
        )
        .orderBy(desc(resources.createdAt));

  const resourceRows = rows.map((row) => row.resource);
  const ids = resourceRows.map((resource) => resource.id);
  if (!ids.length) return [];

  const [previews, files, permissions] = await Promise.all([
    database
      .select()
      .from(resourcePreviews)
      .where(inArray(resourcePreviews.resourceId, ids))
      .orderBy(resourcePreviews.position),
    database
      .select()
      .from(resourceFiles)
      .where(inArray(resourceFiles.resourceId, ids)),
    isAdmin
      ? database
          .select({
            resourceId: resourcePermissions.resourceId,
            email: users.email,
            expiresAt: resourcePermissions.expiresAt,
          })
          .from(resourcePermissions)
          .innerJoin(users, eq(users.id, resourcePermissions.userId))
          .where(inArray(resourcePermissions.resourceId, ids))
      : Promise.resolve([]),
  ]);

  return resourceRows.map((resource) => ({
    ...resource,
    previews: previews.filter((preview) => preview.resourceId === resource.id),
    file: files.find((file) => file.resourceId === resource.id) ?? null,
    permissions: permissions.filter(
      (permission) => permission.resourceId === resource.id,
    ),
  }));
}
