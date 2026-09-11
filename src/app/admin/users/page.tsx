"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Shield,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const roles = [
  "SUPERADMIN",
  "ADMIN",
  "MANAGER",
  "STOREKEEPER",
  "PRODUCTION",
  "QC",
  "PURCHASE",
  "VIEWER",
  "USER",
] as const;

const roleLabels: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STOREKEEPER: "Storekeeper",
  PRODUCTION: "Production",
  QC: "Quality Control",
  PURCHASE: "Purchase",
  VIEWER: "Viewer",
  USER: "Customer / Visitor",
};

type FormState = {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

const emptyForm: FormState = {
  username: "",
  name: "",
  email: "",
  password: "",
  role: "VIEWER",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      username: user.username,
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role,
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (editingUser) {
        const body: Record<string, string> = {};
        if (form.name.trim()) body.name = form.name.trim();
        if (form.email.trim()) body.email = form.email.trim();
        if (form.password.trim()) body.password = form.password.trim();

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to update user");
          return;
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.trim().toLowerCase(),
            name: form.name.trim(),
            email: form.email.trim() || undefined,
            password: form.password,
            role: form.role,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create user");
          return;
        }
      }

      setDialogOpen(false);
      fetchUsers();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      fetchUsers();
    } catch {
    }
  }

  async function deactivateUser(user: User) {
    try {
      await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      fetchUsers();
    } catch {
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage application users, roles and permissions.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Create User"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="e.g. john.doe"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "New Password (leave blank to keep)" : "Password *"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={editingUser ? "••••••••" : "Enter password"}
                  required={!editingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            No users found. Create the first admin user to get started.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{user.name || user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                            {user.email && ` · ${user.email}`}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="capitalize">
                          <Shield className="mr-1 h-3 w-3" />
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={user.isActive ? "default" : "destructive"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(user)}
                          >
                            {user.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          {user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateUser(user)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
