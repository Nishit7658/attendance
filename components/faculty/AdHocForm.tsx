"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  code: string;
  name: string;
}

export default function AdHocForm() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // Fetch courses on mount
  useEffect(() => {
    if (!showForm) return;
    setFetching(true);
    fetch("/api/courses/list")
      .then((r) => r.json())
      .then((data) => {
        setCourses(data.courses ?? []);
        setFilteredCourses(data.courses ?? []);
      })
      .catch(() => setError("Failed to load courses"))
      .finally(() => setFetching(false));
  }, [showForm]);

  // Filter courses based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCourses(courses);
      setHighlightIdx(-1);
      return;
    }
    const q = query.toLowerCase();
    const filtered = courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
    setFilteredCourses(filtered);
    setHighlightIdx(-1);
  }, [query, courses]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((course: Course) => {
    setSelectedCourse(course);
    setQuery(`${course.code} — ${course.name}`);
    setIsOpen(false);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/faculty/sessions/ad-hoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode: selectedCourse.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredCourses.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev < filteredCourses.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev > 0 ? prev - 1 : filteredCourses.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filteredCourses.length) {
          handleSelect(filteredCourses[highlightIdx]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  if (!showForm) {
    return (
      <button
        onClick={() => {
          setShowForm(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="rounded border border-navy-700 px-4 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50 transition-colors"
      >
        Start Ad-Hoc Session
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedCourse(null);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={fetching ? "Loading courses..." : "Search course code or name..."}
            disabled={fetching}
            className="w-64 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-navy-700 focus:outline-none disabled:opacity-50"
          />
          {fetching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy-500 border-t-transparent" />
            </div>
          )}

          {/* Dropdown */}
          {isOpen && !fetching && (
            <div
              ref={dropdownRef}
              className="absolute left-0 top-full z-10 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg"
            >
              {filteredCourses.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">
                  {query.trim()
                    ? "No courses match your search."
                    : "No courses available."}
                </div>
              ) : (
                <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
                  {filteredCourses.map((course, idx) => (
                    <li
                      key={course.id}
                      onClick={() => handleSelect(course)}
                      className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                        idx === highlightIdx
                          ? "bg-navy-50 text-navy-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-medium">{course.code}</span>
                      <span className="ml-2 text-slate-500">{course.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !selectedCourse}
          className="rounded bg-navy-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Starting..." : "Start"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setError(null);
            setQuery("");
            setSelectedCourse(null);
          }}
          className="rounded px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
