import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getNumberParam(searchParams, key, fallback) {
  const value = parseInt(searchParams.get(key) || "", 10);
  if (Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false });

  const query = useMemo(() => {
    const q = searchParams.get("q") || "";
    const page = getNumberParam(searchParams, "page", 1);
    const limit = Math.min(getNumberParam(searchParams, "limit", 20), 200);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = (searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const plan = (searchParams.get("plan") || "all").toLowerCase();
    return { q, page, limit, sortBy, sortDir, plan };
  }, [searchParams]);

  useEffect(() => {
    setSearchTerm(query.q);
  }, [query.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchTerm.trim();
      if (next === query.q) return;

      const nextParams = new URLSearchParams(searchParams);
      if (next) nextParams.set("q", next);
      else nextParams.delete("q");
      nextParams.set("page", "1");
      setSearchParams(nextParams, { replace: true });
    }, 300);

    return () => clearTimeout(handle);
  }, [query.q, searchParams, searchTerm, setSearchParams]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/users", {
          params: {
            q: query.q || undefined,
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            plan: query.plan && query.plan !== "all" ? query.plan : undefined
          }
        });

        const nextUsers = Array.isArray(res.data?.data) ? res.data.data : [];
        const nextMeta = res.data?.meta || null;

        if (nextMeta?.totalPages && query.page > nextMeta.totalPages) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("page", String(nextMeta.totalPages));
          setSearchParams(nextParams, { replace: true });
          return;
        }

        setUsers(nextUsers);
        setMeta({
          page: nextMeta?.page ?? query.page,
          limit: nextMeta?.limit ?? query.limit,
          total: nextMeta?.total ?? 0,
          totalPages: nextMeta?.totalPages ?? 1,
          hasPrev: Boolean(nextMeta?.hasPrev),
          hasNext: Boolean(nextMeta?.hasNext)
        });
      } catch (fetchError) {
        console.error("Admin users fetch error:", fetchError);
        setError(fetchError?.response?.data?.message || "Unable to load users right now.");
        setUsers([]);
        setMeta((prev) => ({ ...prev, total: 0, totalPages: 1, hasPrev: false, hasNext: false }));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [query.limit, query.page, query.plan, query.q, query.sortBy, query.sortDir, searchParams, setSearchParams]);

  const shownCountLabel = useMemo(() => {
    if (loading) return "Loading...";
    if (!meta.total) return "0 users";
    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    return `${start}-${end} of ${meta.total}`;
  }, [loading, meta.limit, meta.page, meta.total]);

  const setSort = (nextSortBy) => {
    const nextParams = new URLSearchParams(searchParams);
    const currentSortBy = query.sortBy;
    const currentSortDir = query.sortDir;
    const nextSortDir = currentSortBy === nextSortBy && currentSortDir === "asc" ? "desc" : "asc";
    nextParams.set("sortBy", nextSortBy);
    nextParams.set("sortDir", nextSortDir);
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const setPage = (nextPage) => {
    const page = Math.max(nextPage, 1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page));
    setSearchParams(nextParams);
  };

  const setLimit = (nextLimit) => {
    const limit = Math.min(Math.max(nextLimit, 1), 200);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("limit", String(limit));
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const setPlan = (nextPlan) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!nextPlan || nextPlan === "all") nextParams.delete("plan");
    else nextParams.set("plan", nextPlan);
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  return (
    <AdminLayout
      title="Users"
      subtitle="View registered users, filter by plan, and search by name or email."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">All Users</p>
            <p className="text-sm text-slate-300">
              {shownCountLabel}
            </p>
          </div>

          <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" htmlFor="admin-users-plan">
                Plan
              </label>
              <select
                id="admin-users-plan"
                value={query.plan}
                onChange={(event) => setPlan(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" htmlFor="admin-users-limit">
                Rows
              </label>
              <select
                id="admin-users-limit"
                value={query.limit}
                onChange={(event) => setLimit(parseInt(event.target.value, 10))}
                className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="w-full sm:w-[320px]">
              <label className="sr-only" htmlFor="admin-users-search">
                Search by name or email
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                <Search size={16} className="text-slate-400" />
                <input
                  id="admin-users-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search name or email"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="px-6 pt-5 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/30 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => setSort("name")} className="transition hover:text-white">
                    Name
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => setSort("email")} className="transition hover:text-white">
                    Email
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => setSort("plan")} className="transition hover:text-white">
                    Plan
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => setSort("createdAt")} className="transition hover:text-white">
                    Joined Date
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t border-white/5">
                  <td className="px-6 py-4 font-medium text-slate-100">{user.name || "-"}</td>
                  <td className="px-6 py-4 text-slate-300">{user.email || "-"}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                      {user.plan || "free"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{formatDate(user.createdAt)}</td>
                </tr>
              ))}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                    No users matched that email search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(meta.page - 1)}
              disabled={loading || !meta.hasPrev}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition enabled:hover:bg-white/10 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage(meta.page + 1)}
              disabled={loading || !meta.hasNext}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition enabled:hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

export default AdminUsers;
