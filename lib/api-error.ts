import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  
  if (error instanceof ZodError) {
    const message = error.issues?.map((e: import('zod').ZodIssue) => e.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle Prisma Known Request Errors (e.g. Unique constraint violations)
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Record already exists or duplicate entry." }, { status: 409 });
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }

  console.error("Unhandled API Error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
