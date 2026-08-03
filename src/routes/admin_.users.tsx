import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createAdminUser, listAdminUsers, updateAdminUser } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin_/users")({
  head: () => ({
    meta: [
      { title: "User management — FarmacoPlants" },
      { name: "description", content: "Admin user and profile management for FarmacoPlants." },
      { property: "og:title", content: "User management — FarmacoPlants" },
      { property: "og:description", content: "Admin user and profile management for FarmacoPlants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserManagement,
});

type Role = "admin" | "curator" | "user";
type EditableUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listUsers = useServerFn(listAdminUsers);
  const createUser = useServerFn(createAdminUser);
  const updateUser = useServerFn(updateAdminUser);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableUser | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setCurrentUserId(id);
      if (!id) navigate({ to: "/login" });
    });
  }, [navigate]);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: Boolean(currentUserId),
  });

  const createMutation = useMutation({
    mutationFn: () => createUser({ data: { displayName, email, password, role } }),
    onSuccess: async () => {
      setDisplayName(""); setEmail(""); setPassword(""); setRole("user");
      setMessage("User created and ready to sign in.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => setMessage(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (user: EditableUser) => updateUser({ data: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      active: user.active,
    } }),
    onSuccess: async () => {
      setEditing(null);
      setMessage("User and profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => setMessage(error.message),
  });

  const toggleActive = (user: EditableUser) => {
    setMessage(null);
    updateMutation.mutate({ ...user, active: !user.active });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    createMutation.mutate();
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="font-display text-3xl font-semibold">Users & profiles</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create accounts, assign access, and control sign-in status.</p>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Back to curation</Link>
        </div>

        <section className="border-y border-border py-6">
          <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add user</h2>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className={inputClass} />
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className={inputClass} />
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Temporary password" className={inputClass} />
            <select value={role} onChange={(event) => setRole(event.target.value as Role)} className={inputClass}>
              <option value="user">User</option><option value="curator">Curator</option><option value="admin">Admin</option>
            </select>
            <Button disabled={createMutation.isPending} className="md:col-start-4">
              {createMutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </form>
          {message && <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p>}
        </section>

        <section className="py-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Accounts</h2>
            <span className="text-xs text-muted-foreground">{usersQuery.data?.length ?? 0} users</span>
          </div>
          {usersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}
          {usersQuery.error && <p className="text-sm text-destructive">{usersQuery.error.message}</p>}
          <div className="overflow-x-auto border-y border-border">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-3 pr-4">Profile</th><th className="py-3 pr-4">Role</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Last sign-in</th><th className="py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersQuery.data?.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4"><div className="font-medium">{user.displayName || "Unnamed user"}</div><div className="text-xs text-muted-foreground">{user.email}</div></td>
                    <td className="py-3 pr-4 capitalize">{user.role}</td>
                    <td className="py-3 pr-4"><span className={user.active ? "text-primary" : "text-destructive"}>{user.active ? "Active" : "Deactivated"}</span></td>
                    <td className="py-3 pr-4 text-muted-foreground">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "Never"}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={user.active ? "outline" : "default"}
                          disabled={user.id === currentUserId || updateMutation.isPending}
                          title={user.id === currentUserId ? "You cannot deactivate your own account" : undefined}
                          onClick={() => toggleActive(user as EditableUser)}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(user as EditableUser)}>Edit</Button>
                      </div>
                    </td>
                  </tr>

                ))}
              </tbody>
            </table>
          </div>
        </section>

        {editing && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4" role="dialog" aria-modal="true" aria-label="Edit user">
            <form onSubmit={(event) => { event.preventDefault(); updateMutation.mutate(editing); }} className="w-full max-w-md rounded-md bg-card p-6 shadow-xl">
              <h2 className="text-xl font-semibold">Edit user</h2>
              <p className="mt-1 text-sm text-muted-foreground">{editing.email}</p>
              <div className="mt-5 space-y-4">
                <label className="block text-sm">Display name<input required value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} className={`${inputClass} mt-1`} /></label>
                <label className="block text-sm">Role<select value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as Role })} className={`${inputClass} mt-1`}><option value="user">User</option><option value="curator">Curator</option><option value="admin">Admin</option></select></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} disabled={editing.id === currentUserId} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Account active</label>
              </div>
              <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving…" : "Save changes"}</Button></div>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}