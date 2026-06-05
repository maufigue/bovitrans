"use client";

import { Save, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAppUser,
  deleteAppUser,
  fetchAppUsers,
  updateAppUser,
} from "@/lib/client/api";
import type { AppModulePermission, AppUser } from "@/lib/domain/types";

type UserForm = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  active: boolean;
  permissions: AppModulePermission[];
};

const moduleLabels: Record<AppModulePermission, string> = {
  logistics: "Panel Logístico",
  fleet: "Administración de Flotas",
  users: "Usuarios",
};

const emptyForm: UserForm = {
  username: "",
  email: "",
  fullName: "",
  password: "",
  active: true,
  permissions: ["logistics"],
};

function toForm(user: AppUser): UserForm {
  return {
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    password: "",
    active: user.active,
    permissions: user.permissions,
  };
}

export function UserManagementView({ currentUser }: { currentUser: AppUser }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );
  const selectedIsAdmin = Boolean(selectedUser?.superuser);

  async function loadUsers() {
    setError(null);
    const nextUsers = await fetchAppUsers();
    setUsers(nextUsers);
    setSelectedUserId((current) => current ?? nextUsers[0]?.id ?? null);
  }

  useEffect(() => {
    loadUsers()
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setForm(selectedUser ? toForm(selectedUser) : emptyForm);
  }, [selectedUser]);

  function togglePermission(permission: AppModulePermission) {
    if (selectedIsAdmin) return;

    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function handleCreate() {
    if (!form.username || !form.email || !form.fullName || !form.password || form.permissions.length === 0) {
      setError("Completa usuario, correo, nombre, contraseña y al menos un permiso.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const user = await createAppUser(form);
      await loadUsers();
      setSelectedUserId(user.id);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo crear el usuario.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!selectedUser) return;

    setBusy(true);
    setError(null);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        fullName: form.fullName,
        active: form.active,
        permissions: form.permissions,
        ...(form.password ? { password: form.password } : {}),
      };
      await updateAppUser(selectedUser.id, payload);
      await loadUsers();
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo actualizar el usuario.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;

    setBusy(true);
    setError(null);
    try {
      await deleteAppUser(selectedUser.id);
      setSelectedUserId(null);
      await loadUsers();
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo eliminar el usuario.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-[1440px] p-5">
        <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Cargando usuarios...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase text-zinc-500">Seguridad</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950">Administración de Usuarios</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Gestiona cuentas internas y permisos de acceso por módulo. El usuario admin es superuser y conserva acceso total.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-950">Usuarios registrados</p>
          </div>
          <div className="divide-y divide-zinc-200">
            {users.map((user) => {
              const active = user.id === selectedUserId;
              return (
                <button
                  key={user.id}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                    active ? "user-row-selected bg-zinc-950 text-white" : "hover:bg-zinc-50"
                  }`}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{user.fullName}</p>
                    <p className={`mt-1 text-sm ${active ? "user-row-muted text-white/70" : "text-zinc-500"}`}>
                      {user.username} · {user.email}
                    </p>
                  </div>
                  <span className={`user-row-status shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                    user.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {user.superuser ? "Superuser" : user.active ? "Activo" : "Inactivo"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Cuenta</p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                {selectedUser ? selectedUser.fullName : "Nuevo usuario"}
              </h3>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              title="Nuevo usuario"
              type="button"
              onClick={() => {
                setSelectedUserId(null);
                setForm(emptyForm);
                setError(null);
              }}
            >
              <UserPlus size={17} />
            </button>
          </div>

          {selectedIsAdmin ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} />Usuario protegido</div>
              <p className="mt-1">El admin conserva todos los permisos y no puede eliminarse ni desactivarse.</p>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-zinc-700">
              Usuario
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" disabled={selectedIsAdmin} value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Correo
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Nombre
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Contraseña {selectedUser ? "(opcional)" : ""}
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <input checked={form.active} disabled={selectedIsAdmin} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Usuario activo
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-zinc-700">Accesos por módulo</p>
            <div className="mt-3 grid gap-2">
              {(Object.keys(moduleLabels) as AppModulePermission[]).map((permission) => (
                <label key={permission} className="flex min-h-10 items-center gap-3 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700">
                  <input
                    checked={selectedIsAdmin || form.permissions.includes(permission)}
                    disabled={selectedIsAdmin}
                    type="checkbox"
                    onChange={() => togglePermission(permission)}
                  />
                  {moduleLabels[permission]}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy}
              type="button"
              onClick={() => void (selectedUser ? handleUpdate() : handleCreate())}
            >
              {selectedUser ? <Save size={18} /> : <UserPlus size={18} />}
              {busy ? "Guardando..." : selectedUser ? "Guardar Cambios" : "Crear Usuario"}
            </button>
            {selectedUser ? (
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                disabled={busy || selectedIsAdmin || selectedUser.id === currentUser.id}
                type="button"
                onClick={() => void handleDelete()}
              >
                <Trash2 size={17} />
                Eliminar Usuario
              </button>
            ) : (
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                type="button"
                onClick={() => setForm(emptyForm)}
              >
                <X size={17} />
                Limpiar
              </button>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
