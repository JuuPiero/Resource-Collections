import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  resourceFiles,
  downloadAudits,
  resourcePermissions,
  resourcePreviews,
  resources,
  users,
} from "@/db/schema";
import type { AppUser } from "@/lib/users";

export async function listResourcesForUser(user: AppUser | null, isAdmin: boolean) {
  const database = getDb();
  const now = new Date();

  const baseQuery = database.select({ resource: resources }).from(resources);
  const rows = isAdmin
    ? await baseQuery.orderBy(desc(resources.createdAt))
    : await baseQuery
        .where(eq(resources.status, "published"))
        .orderBy(desc(resources.createdAt));

  const resourceRows = rows.map((row) => row.resource);
  const ids = resourceRows.map((resource) => resource.id);
  if (!ids.length) return [];

  const [previews, files, permissions, userPermissions] = await Promise.all([
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
    user
      ? database
          .select({
            resourceId: resourcePermissions.resourceId,
            canDownload: resourcePermissions.canDownload,
            expiresAt: resourcePermissions.expiresAt,
          })
          .from(resourcePermissions)
          .where(
            and(
              inArray(resourcePermissions.resourceId, ids),
              eq(resourcePermissions.userId, user.id),
            ),
          )
      : Promise.resolve([]),
  ]);

  const previewsByResource = new Map<string, typeof previews>();
  for (const preview of previews) {
    const resourcePreviews = previewsByResource.get(preview.resourceId);
    if (resourcePreviews) resourcePreviews.push(preview);
    else previewsByResource.set(preview.resourceId, [preview]);
  }

  const fileByResource = new Map<string, (typeof files)[number]>();
  for (const file of files) {
    if (!fileByResource.has(file.resourceId)) {
      fileByResource.set(file.resourceId, file);
    }
  }

  const permissionsByResource = new Map<
    string,
    { resourceId: string; email: string; expiresAt: Date | null }[]
  >();
  for (const permission of permissions) {
    const resourcePermissions = permissionsByResource.get(permission.resourceId);
    if (resourcePermissions) resourcePermissions.push(permission);
    else permissionsByResource.set(permission.resourceId, [permission]);
  }

  const userPermissionByResource = new Map(
    userPermissions.map((permission) => [permission.resourceId, permission]),
  );

  return resourceRows.map((resource) => {
    const userPermission = userPermissionByResource.get(resource.id);
    return {
      ...resource,
      previews: previewsByResource.get(resource.id) ?? [],
      file: fileByResource.get(resource.id) ?? null,
      permissions: permissionsByResource.get(resource.id) ?? [],
      canDownload:
        isAdmin ||
        resource.accessLevel === "public" ||
        (resource.accessLevel === "authenticated" && Boolean(user)) ||
        (resource.accessLevel === "restricted" &&
          Boolean(
            userPermission?.canDownload &&
              (!userPermission.expiresAt || userPermission.expiresAt > now),
          )),
    };
  });
}

export async function getResourceBySlugForUser(
  slug: string,
  user: AppUser | null,
  isAdmin: boolean,
) {
  const database = getDb();
  const accessCondition = isAdmin
    ? eq(resources.slug, slug)
    : and(
        eq(resources.slug, slug),
        eq(resources.status, "published"),
      );

  const [row] = await database
    .select({ resource: resources })
    .from(resources)
    .where(accessCondition)
    .limit(1);
  if (!row) return null;

  const [previews, files, permission] = await Promise.all([
    database
      .select()
      .from(resourcePreviews)
      .where(eq(resourcePreviews.resourceId, row.resource.id))
      .orderBy(resourcePreviews.position),
    database
      .select()
      .from(resourceFiles)
      .where(eq(resourceFiles.resourceId, row.resource.id))
      .limit(1),
    user && row.resource.accessLevel === "restricted"
      ? database
          .select({
            canDownload: resourcePermissions.canDownload,
            expiresAt: resourcePermissions.expiresAt,
          })
          .from(resourcePermissions)
          .where(
            and(
              eq(resourcePermissions.resourceId, row.resource.id),
              eq(resourcePermissions.userId, user.id),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const grant = permission[0];
  return {
    ...row.resource,
    previews,
    file: files[0] ?? null,
    canDownload:
      isAdmin ||
      row.resource.accessLevel === "public" ||
      (row.resource.accessLevel === "authenticated" && Boolean(user)) ||
      (row.resource.accessLevel === "restricted" &&
        Boolean(
          grant?.canDownload &&
            (!grant.expiresAt || grant.expiresAt > new Date()),
        )),
  };
}

export type ResourceListItem = Awaited<
  ReturnType<typeof listResourcesForUser>
>[number];

export async function getAdminDashboardStats() {
  const database = getDb();
  const [resourceRows, userRows, downloadRows] = await Promise.all([
    database
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${resources.status} = 'published')`,
        restricted: sql<number>`count(*) filter (where ${resources.accessLevel} = 'restricted')`,
      })
      .from(resources),
    database.select({ total: count() }).from(users),
    database.select({ total: count() }).from(downloadAudits),
  ]);

  return {
    resources: Number(resourceRows[0]?.total ?? 0),
    published: Number(resourceRows[0]?.published ?? 0),
    restricted: Number(resourceRows[0]?.restricted ?? 0),
    users: Number(userRows[0]?.total ?? 0),
    downloads: Number(downloadRows[0]?.total ?? 0),
  };
}
