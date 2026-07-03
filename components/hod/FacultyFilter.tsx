"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FacultyFilterProps {
  facultyMembers: { id: string; name: string }[];
  currentFacultyId?: string;
}

export function FacultyFilter({ facultyMembers, currentFacultyId }: FacultyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("facultyId", e.target.value);
    else params.delete("facultyId");
    router.push(`/hod/sessions?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <label htmlFor="faculty" className="text-sm font-medium text-slate-700">
        Filter by faculty:
      </label>
      <select
        id="faculty"
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        value={currentFacultyId ?? ""}
        onChange={handleChange}
      >
        <option value="">All Faculty</option>
        {facultyMembers.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
