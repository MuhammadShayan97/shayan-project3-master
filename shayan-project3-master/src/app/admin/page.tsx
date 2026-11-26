
"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Project = {
  id: number;
  title: string;
  description: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  // Project states
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load projects.");
      }

      const data = await response.json();
      setProjects(data);
    } catch {
      setError("Unable to load projects. Check your database connection.");
    }
  }, [router]);

  // Check admin login
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        await loadProjects();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkLogin();
  }, [router, loadProjects]);

  // Reset project form
  function resetForm() {
    setTitle("");
    setDescription("");
    setEditingId(null);
  }

  // Add or update project
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!title.trim() || !description.trim()) {
      setError("Please enter both project title and description.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/projects/${editingId}`
        : "/api/projects";

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to save project.");
      }

      setMessage(
        editingId
          ? "Project updated successfully!"
          : "Project added successfully!"
      );

      resetForm();
      await loadProjects();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // Edit project
  function startEditing(project: Project) {
    setEditingId(project.id);
    setTitle(project.title);
    setDescription(project.description);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete project
  async function deleteProject(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete project.");
      }

      setMessage("Project deleted successfully!");

      if (editingId === id) {
        resetForm();
      }

      await loadProjects();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  // Change admin password
  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New password and confirm password do not match."
      );
      return;
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      setPasswordError(
        "New password must be between 12 and 128 characters."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to change password."
        );
      }

      setPasswordMessage(
        data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      window.alert(
        "Password changed successfully! Please log in with your new password."
      );

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  // Logout
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  // Loading screen
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <p className="animate-pulse text-cyan-300">
          Loading admin dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
              Muhammad Shayan
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage your portfolio projects.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              View Website ↗
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        </header>

        {/* DASHBOARD STATISTICS */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">
              Total Projects
            </p>

            <p className="mt-3 text-4xl font-bold text-cyan-300">
              {projects.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400">
              Dashboard Status
            </p>

            <p className="mt-3 text-xl font-semibold text-emerald-400">
              Admin Area
            </p>
          </div>
        </section>

        {/* CHANGE ADMIN PASSWORD */}

        <section className="mb-10 rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Account Security
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Change Admin Password
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Update your admin login password securely.
            </p>
          </div>

          <form
            onSubmit={handleChangePassword}
            className="max-w-xl space-y-5"
          >
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Current Password
              </label>

              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                autoComplete="current-password"
                maxLength={128}
                required
                placeholder="Enter current password"
                className="w-full rounded-xl border border-white/10 bg-[#080e20] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                placeholder="Minimum 12 characters"
                className="w-full rounded-xl border border-white/10 bg-[#080e20] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                Use a unique password that you do not use on other websites.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                placeholder="Confirm your new password"
                className="w-full rounded-xl border border-white/10 bg-[#080e20] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {passwordError && (
              <p role="alert" className="text-sm text-red-300">
                {passwordError}
              </p>
            )}

            {passwordMessage && (
              <p role="status" className="text-sm text-emerald-300">
                {passwordMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {passwordSaving
                ? "Updating Password..."
                : "Update Password"}
            </button>
          </form>
        </section>

        {/* PROJECT MANAGER */}

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Project Manager
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {editingId ? "Edit Project" : "Add New Project"}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Add your work to the portfolio database.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="project-title"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Project Title
              </label>

              <input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={255}
                required
                placeholder="e.g. TruthLens AI"
                className="w-full rounded-xl border border-white/10 bg-[#080e20] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
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
                maxLength={10000}
                required
                rows={5}
                placeholder="Describe what your project does..."
                className="w-full resize-y rounded-xl border border-white/10 bg-[#080e20] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-sm text-emerald-300">
                {message}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Project"
                    : "Add Project"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-6 py-3 text-slate-300 transition hover:border-white/30"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* MANAGE PROJECTS */}

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                Your Work
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Manage Projects
              </h2>
            </div>

            <button
              type="button"
              onClick={loadProjects}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              ↻ Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
              <p className="text-3xl">🚀</p>

              <h3 className="mt-4 text-lg font-semibold">
                No projects yet
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Use the form above to add your first project.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-cyan-400/40"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      Project #{project.id}
                    </span>

                    <span className="text-xl">💻</span>
                  </div>

                  <h3 className="text-xl font-bold">
                    {project.title}
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                    {project.description}
                  </p>

                  <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => startEditing(project)}
                      className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProject(project.id)}
                      className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/20"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <footer className="mt-16 border-t border-white/10 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Muhammad Shayan · Admin Dashboard
        </footer>

      </div>
    </main>
  );
}
