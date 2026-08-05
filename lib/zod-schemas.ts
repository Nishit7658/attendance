import { z } from "zod";

// Base schemas
export const idSchema = z.string().cuid();
export const emailSchema = z.string().email();

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: emailSchema,
  role: z.enum(["STUDENT", "FACULTY", "HOD", "ADMIN"]),
  department: z.string().optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const updateUserSchema = createUserSchema.partial();

// Course schemas
export const createCourseSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  department: z.string().optional().nullable(),
  credits: z.coerce.number().int().min(1).optional(),
  branchId: z.string().optional(),
});

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(1)), // Can refine to actual dates if needed
  endDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  scopeType: z.enum(["DEPARTMENT", "SAVED_GROUP", "CUSTOM_LIST"]),
  department: z.string().optional().nullable(),
  savedGroupId: z.string().optional().nullable(),
  studentIds: z.array(z.string()).optional(),
});

// Timetable schemas
export const createTimetableSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
  courseId: z.string(),
  facultyId: z.string(),
  room: z.string().min(1),
  section: z.string().optional().nullable(),
  divisionId: z.string(),
  batchId: z.string().optional().nullable(),
});

// Settings schemas
export const updateSettingsSchema = z.object({
  lan_restriction_enabled: z.boolean().optional(),
  lan_allowed_ips: z.string().optional(),
  slots_per_day: z.coerce.number().int().min(1).max(24).optional(),
  qr_refresh_interval: z.coerce.number().int().min(1).max(60).optional(),
});

export function validatePayload<T>(schema: z.ZodType<T>, data: unknown): { data?: T; error?: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { error: `Validation Error: ${errorMessages}` };
  }
  return { data: result.data };
}
