
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Project = {
  id: number;
  title: string;
  description: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  // Dashboard states
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Message states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load projects from NeonDB through the API
  const loadProjects = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/projects", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load projects.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid projects response.");
      }

      setProjects(data);
      setError("");

      return true;
    } catch (err) {
      console.error("Load projects error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading projects."
      );

      return false;
    }
  }, []);

  // Check authentication before loading dashboard data
  useEffect(() => {
    let cancelled = false;

    async function checkLogin() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        // Important: HTTP 200 alone does not mean authenticated.
        if (data.authenticated !== true) {
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          await loadProjects();
        }
      } catch (err) {
        console.error("Admin authentication check failed:", err);

        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, loadProjects]);

  // Reset project form
  function resetForm() {
    setTitle("");
    setDescription("");
    setEditingId(null);
  }

  // Add or update a project
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription) {
      setError("Please enter both project title and description.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `/api/projects/${editingId}` : "/api/projects",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: cleanTitle,
            description: cleanDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        throw new Error(
          data.error || "Unable to save project."
        );
      }

      resetForm();

      const refreshed = await loadProjects();

      if (refreshed) {
        setSuccess(
          isEditing
            ? "Project updated successfully!"
            : "New project added successfully!"
        );
      }
    } catch (err) {
      console.error("Save project error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the project."
      );
    } finally {
      setSaving(false);
    }
  }

  // Start editing a project
  function handleEdit(project: Project) {
    setEditingId(project.id);
    setTitle(project.title);
    setDescription(project.description);

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // Delete a project
  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(id);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        throw new Error(
          data.error || "Unable to delete project."
        );
      }

      const refreshed = await loadProjects();

      if (refreshed) {
        setSuccess("Project deleted successfully!");
      }
    } catch (err) {
      console.error("Delete project error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the project."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // Refresh dashboard projects
  async function handleRefresh() {
    setError("");
    setSuccess("");

    const refreshed = await loadProjects();

    if (refreshed) {
      setSuccess("Projects refreshed successfully.");
    }
  }

  // Admin logout
  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Logout failed. Please try again."
      );

      setLoggingOut(false);
    }
  }

  // Loading screen
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b16] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-cyan-400" />

          <h2 className="text-xl font-semibold">
            Loading Dashboard
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Verifying your admin session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b16] text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-[#101827]/80 p-5 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Admin Control Center
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
              <span className="text-cyan-400">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage your portfolio projects and content.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
            >
              <span className="mr-2">↗</span>
              View Website
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* Dashboard statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#101827]/80 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Total Projects
                </p>

                <h2 className="mt-3 text-4xl font-bold text-white">
                  {projects.length}
                </h2>

                <p className="mt-2 text-xs text-slate-500">
                  Projects stored in your database
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl">
                📁
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827]/80 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Dashboard Status
                </p>

                <h2 className="mt-3 text-2xl font-bold text-emerald-400">
                  Active
                </h2>

                <p className="mt-2 text-xs text-slate-500">
                  Admin session verified
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-2xl">
                ✓
              </div>
            </div>
          </div>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <span className="text-lg">⚠</span>
            <p>{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            <span className="text-lg">✓</span>
            <p>{success}</p>
          </div>
        )}

        {/* Add / Edit project form */}
        <section className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-[#101827]/80 shadow-xl">
          <div className="border-b border-white/10 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                  Project Management
                </p>

                <h2 className="text-xl font-bold">
                  {editingId !== null
                    ? "Edit Project"
                    : "Add New Project"}
                </h2>
              </div>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Cancel Editing
                </button>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-5 sm:p-7"
          >
            <div>
              <label
                htmlFor="project-title"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Project Title
              </label>

              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. TruthLens AI"
                maxLength={255}
                required
                className="w-full rounded-xl border border-white/10 bg-[#080f1d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Project Description
              </label>

              <textarea
                id="project-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Describe what your project does..."
                rows={5}
                maxLength={10000}
                required
                className="w-full resize-y rounded-xl border border-white/10 bg-[#080f1d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
              />

              <p className="mt-2 text-right text-xs text-slate-500">
                {description.length}/10000 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Please wait..."
                : editingId !== null
                  ? "✓ Update Project"
                  : "+ Add Project"}
            </button>
          </form>
        </section>

        {/* Projects section */}
        <section className="rounded-2xl border border-white/10 bg-[#101827]/80 p-5 shadow-xl sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Your Portfolio
              </p>

              <h2 className="text-xl font-bold">
                Manage Projects
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add, edit or remove projects from your portfolio.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
            >
              ↻ Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-[#080f1d]/70 px-5 py-14 text-center">
              <div className="mb-4 text-4xl">📂</div>

              <h3 className="text-lg font-semibold text-white">
                No Projects Found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Your project list is currently empty. Use the form
                above to add your first portfolio project.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group rounded-xl border border-white/10 bg-[#080f1d]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
                      ✦
                    </div>

                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      Published
                    </span>
                  </div>

                  <h3 className="mb-3 text-lg font-bold text-white transition group-hover:text-cyan-300">
                    {project.title}
                  </h3>

                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <span className="text-xs text-slate-500">
                      Project ID: #{project.id}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(project)}
                        disabled={saving || deletingId !== null}
                        className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        disabled={deletingId !== null || saving}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === project.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="py-8 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Muhammad Shayan.
            <span className="text-cyan-400">
              {" "}Admin Dashboard
            </span>
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Manage your portfolio projects from one place.
          </p>
        </footer>
      </div>
    </main>
  );
}
