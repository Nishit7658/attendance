import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-error";
import { Role } from "@prisma/client";

export async function requireRole(allowedRoles: Role | Role[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const role = session.user.role as Role | undefined;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (role) {
    if (!roles.includes(role)) {
      throw new AppError("Forbidden", 403);
    }
    return {
      id: session.user.id,
      role,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!roles.includes(user.role)) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const role = session.user.role as Role | undefined;
  if (role) {
    return {
      id: session.user.id,
      role,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  return user;
}
