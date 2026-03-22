"use client"

import { useEffect, useMemo, useState } from "react"
import {
    collection,
    doc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore"
import { sendPasswordResetEmail } from "firebase/auth"
import {
    Building2,
    KeyRound,
    Pencil,
    Plus,
    Power,
    Search,
    Shield,
    Trash2,
    UserCog,
    Users,
} from "lucide-react"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { auth, db } from "@/lib/firebase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type UserRole = "super_admin" | "department_head" | "employee"
type UserStatus = "active" | "inactive" | "suspended"

type WorkspaceUser = {
    id: string
    name: string
    email: string
    role: UserRole | ""
    departmentId: string
    departmentName: string
    status: UserStatus | ""
    totalPoints: number
    isDeleted: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

type DepartmentRecord = {
    id: string
    name: string
    code: string
    description: string
    headUserId: string
    headName: string
    isActive: boolean
    isDeleted: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

const ROLE_OPTIONS: Array<{ label: string; value: UserRole | "all" }> = [
    { label: "All roles", value: "all" },
    { label: "Super Admin", value: "super_admin" },
    { label: "Department Head", value: "department_head" },
    { label: "Employee", value: "employee" },
]

const STATUS_OPTIONS: Array<{ label: string; value: UserStatus | "all" }> = [
    { label: "All statuses", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Suspended", value: "suspended" },
]

export default function AdminWorkspacePage() {
    const [users, setUsers] = useState<WorkspaceUser[]>([])
    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all")
    const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all")
    const [departmentFilter, setDepartmentFilter] = useState<string>("all")

    const [createOpen, setCreateOpen] = useState(false)
    const [createName, setCreateName] = useState("")
    const [createEmail, setCreateEmail] = useState("")
    const [createPassword, setCreatePassword] = useState("")
    const [createRole, setCreateRole] = useState<UserRole>("employee")
    const [createDepartmentId, setCreateDepartmentId] = useState("")
    const [createStatus, setCreateStatus] = useState<UserStatus>("active")
    const [createError, setCreateError] = useState("")
    const [createSuccess, setCreateSuccess] = useState("")
    const [creatingUser, setCreatingUser] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [editingUserId, setEditingUserId] = useState("")
    const [editName, setEditName] = useState("")
    const [editEmail, setEditEmail] = useState("")
    const [editRole, setEditRole] = useState<UserRole>("employee")
    const [editDepartmentId, setEditDepartmentId] = useState("")
    const [editStatus, setEditStatus] = useState<UserStatus>("active")
    const [editError, setEditError] = useState("")
    const [editSuccess, setEditSuccess] = useState("")
    const [savingEdit, setSavingEdit] = useState(false)

    const [actionMessage, setActionMessage] = useState("")
    const [actionError, setActionError] = useState("")
    const [busyUserId, setBusyUserId] = useState("")

    useEffect(() => {
        loadWorkspaceData()
    }, [])

    useEffect(() => {
        if (createRole === "super_admin") {
            setCreateDepartmentId("")
        }
    }, [createRole])

    useEffect(() => {
        if (editRole === "super_admin") {
            setEditDepartmentId("")
        }
    }, [editRole])

    async function loadWorkspaceData() {
        try {
            setLoading(true)

            const [usersSnap, departmentsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "departments")),
            ])

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<DepartmentRecord>

                return {
                    id: docSnap.id,
                    name: data.name ?? "",
                    code: data.code ?? "",
                    description: data.description ?? "",
                    headUserId: data.headUserId ?? "",
                    headName: data.headName ?? "",
                    isActive: data.isActive ?? true,
                    isDeleted: data.isDeleted ?? false,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const departmentNameMap = new Map(
                departmentRows.map((department) => [department.id, department.name])
            )

            const userRows: WorkspaceUser[] = usersSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<WorkspaceUser>

                const departmentId = data.departmentId ?? ""
                const mappedDepartmentName =
                    data.departmentName ??
                    (departmentId ? departmentNameMap.get(departmentId) ?? "" : "")

                return {
                    id: docSnap.id,
                    name: data.name ?? "",
                    email: data.email ?? "",
                    role:
                        data.role === "super_admin" ||
                            data.role === "department_head" ||
                            data.role === "employee"
                            ? data.role
                            : "",
                    departmentId,
                    departmentName: mappedDepartmentName,
                    status:
                        data.status === "active" ||
                            data.status === "inactive" ||
                            data.status === "suspended"
                            ? data.status
                            : "",
                    totalPoints:
                        typeof data.totalPoints === "number" ? data.totalPoints : 0,
                    isDeleted: data.isDeleted ?? false,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            setDepartments(
                departmentRows.filter(
                    (department) => !department.isDeleted && department.isActive
                )
            )
            setUsers(userRows.filter((user) => !user.isDeleted))
        } catch (error) {
            console.error("Failed to load workspace data:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                search.trim() === "" ||
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase()) ||
                user.departmentName.toLowerCase().includes(search.toLowerCase())

            const matchesRole = roleFilter === "all" || user.role === roleFilter
            const matchesStatus =
                statusFilter === "all" || user.status === statusFilter
            const matchesDepartment =
                departmentFilter === "all" || user.departmentId === departmentFilter

            return matchesSearch && matchesRole && matchesStatus && matchesDepartment
        })
    }, [users, search, roleFilter, statusFilter, departmentFilter])

    const stats = useMemo(() => {
        return {
            totalUsers: users.length,
            superAdmins: users.filter((user) => user.role === "super_admin").length,
            departmentHeads: users.filter((user) => user.role === "department_head").length,
            employees: users.filter((user) => user.role === "employee").length,
        }
    }, [users])

    function resetCreateForm() {
        setCreateName("")
        setCreateEmail("")
        setCreatePassword("")
        setCreateRole("employee")
        setCreateDepartmentId("")
        setCreateStatus("active")
        setCreateError("")
        setCreateSuccess("")
    }

    function handleCloseCreate() {
        if (creatingUser) return
        setCreateOpen(false)
        resetCreateForm()
    }

    const departmentRequired =
        createRole === "department_head" || createRole === "employee"

    const selectedDepartmentName = createDepartmentId
        ? departments.find((department) => department.id === createDepartmentId)?.name ?? ""
        : ""

    async function handleCreateUser() {
        const trimmedName = createName.trim()
        const normalizedEmail = createEmail.trim().toLowerCase()
        const trimmedPassword = createPassword.trim()

        setCreateError("")
        setCreateSuccess("")

        if (!trimmedName) {
            setCreateError("Full name is required.")
            return
        }

        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            setCreateError("Enter a valid email address.")
            return
        }

        if (!trimmedPassword || trimmedPassword.length < 6) {
            setCreateError("Password must be at least 6 characters.")
            return
        }

        if (departmentRequired && !createDepartmentId) {
            setCreateError("Please select a department.")
            return
        }

        setCreatingUser(true)

        try {
            const selectedDepartment =
                departments.find((department) => department.id === createDepartmentId) ?? null

            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: trimmedName,
                    email: normalizedEmail,
                    password: trimmedPassword,
                    role: createRole,
                    status: createStatus,
                    departmentId: createRole === "super_admin" ? "" : createDepartmentId,
                    departmentName:
                        createRole === "super_admin"
                            ? ""
                            : selectedDepartment?.name ?? "",
                    departmentCode:
                        createRole === "super_admin"
                            ? ""
                            : selectedDepartment?.code ?? "",
                    totalPoints: 0,
                }),
            })

            const result = (await response.json()) as {
                ok?: boolean
                error?: string
            }

            if (!response.ok || !result.ok) {
                setCreateError(result.error ?? "Failed to create user.")
                return
            }

            setCreateSuccess("User created successfully.")
            await loadWorkspaceData()

            window.setTimeout(() => {
                setCreateOpen(false)
                resetCreateForm()
            }, 800)
        } catch (error) {
            console.error("Failed to create user:", error)
            setCreateError("Failed to create user.")
        } finally {
            setCreatingUser(false)
        }
    }

    function openEditUser(user: WorkspaceUser) {
        setEditError("")
        setEditSuccess("")
        setEditingUserId(user.id)
        setEditName(user.name)
        setEditEmail(user.email)
        setEditRole((user.role || "employee") as UserRole)
        setEditDepartmentId(user.departmentId || "")
        setEditStatus((user.status || "active") as UserStatus)
        setEditOpen(true)
    }

    function closeEditUser() {
        if (savingEdit) return
        setEditOpen(false)
        setEditingUserId("")
        setEditName("")
        setEditEmail("")
        setEditRole("employee")
        setEditDepartmentId("")
        setEditStatus("active")
        setEditError("")
        setEditSuccess("")
    }

    async function handleSaveEdit() {
        const trimmedName = editName.trim()
        const normalizedEmail = editEmail.trim().toLowerCase()
        const editDepartmentRequired =
            editRole === "department_head" || editRole === "employee"

        setEditError("")
        setEditSuccess("")

        if (!editingUserId) {
            setEditError("No user selected.")
            return
        }

        if (!trimmedName) {
            setEditError("Full name is required.")
            return
        }

        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            setEditError("Enter a valid email address.")
            return
        }

        if (editDepartmentRequired && !editDepartmentId) {
            setEditError("Please select a department.")
            return
        }

        setSavingEdit(true)

        try {
            const selectedDepartment =
                departments.find((department) => department.id === editDepartmentId) ?? null

            await updateDoc(doc(db, "users", editingUserId), {
                name: trimmedName,
                email: normalizedEmail,
                role: editRole,
                status: editStatus,
                departmentId: editRole === "super_admin" ? "" : editDepartmentId,
                departmentName:
                    editRole === "super_admin" ? "" : selectedDepartment?.name ?? "",
                updatedAt: serverTimestamp(),
            })

            setEditSuccess("User updated successfully.")
            await loadWorkspaceData()

            window.setTimeout(() => {
                closeEditUser()
            }, 800)
        } catch (error) {
            console.error("Failed to update user:", error)
            setEditError("Failed to update user.")
        } finally {
            setSavingEdit(false)
        }
    }

    async function handleToggleUserStatus(user: WorkspaceUser) {
        setActionMessage("")
        setActionError("")
        setBusyUserId(user.id)

        try {
            const nextStatus: UserStatus =
                user.status === "active" ? "inactive" : "active"

            await updateDoc(doc(db, "users", user.id), {
                status: nextStatus,
                updatedAt: serverTimestamp(),
            })

            setActionMessage(
                nextStatus === "active"
                    ? `${user.name || user.email} activated successfully.`
                    : `${user.name || user.email} deactivated successfully.`
            )

            await loadWorkspaceData()
        } catch (error) {
            console.error("Failed to toggle user status:", error)
            setActionError("Failed to update user status.")
        } finally {
            setBusyUserId("")
        }
    }

    async function handleResetPassword(user: WorkspaceUser) {
        setActionMessage("")
        setActionError("")
        setBusyUserId(user.id)

        try {
            if (!user.email) {
                setActionError("This user does not have an email address.")
                return
            }

            await sendPasswordResetEmail(auth, user.email)
            setActionMessage(`Password reset email sent to ${user.email}.`)
        } catch (error) {
            console.error("Failed to send password reset email:", error)
            setActionError("Failed to send password reset email.")
        } finally {
            setBusyUserId("")
        }
    }

    async function handleDeleteUser(user: WorkspaceUser) {
        const confirmed = window.confirm(
            `Delete ${user.name || user.email}? This will hide the user from the workspace list.`
        )
        if (!confirmed) return

        setActionMessage("")
        setActionError("")
        setBusyUserId(user.id)

        try {
            await updateDoc(doc(db, "users", user.id), {
                isDeleted: true,
                status: "inactive",
                updatedAt: serverTimestamp(),
            })

            setActionMessage(`${user.name || user.email} deleted successfully.`)
            await loadWorkspaceData()
        } catch (error) {
            console.error("Failed to delete user:", error)
            setActionError("Failed to delete user.")
        } finally {
            setBusyUserId("")
        }
    }

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-lime-500 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            Workspace management
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            People & Assignments
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Manage users, roles, departments, account access, and user lifecycle
                            actions from one central workspace.
                        </p>
                    </div>
                </section>

                <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Workspace
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight">
                            People & Assignments
                        </h2>
                        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                            Manage users, assign departments, define roles, and control how
                            each person accesses the system.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Create user
                    </button>
                </section>

                {actionError || actionMessage ? (
                    <div className="space-y-3">
                        {actionError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {actionError}
                            </div>
                        ) : null}

                        {actionMessage ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                {actionMessage}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Total users"
                        value={String(stats.totalUsers)}
                        helper="All non-deleted users"
                    />
                    <StatCard
                        icon={<Shield className="h-5 w-5" />}
                        label="Super Admins"
                        value={String(stats.superAdmins)}
                        helper="Full-access accounts"
                    />
                    <StatCard
                        icon={<UserCog className="h-5 w-5" />}
                        label="Department Heads"
                        value={String(stats.departmentHeads)}
                        helper="Assigned department leaders"
                    />
                    <StatCard
                        icon={<Building2 className="h-5 w-5" />}
                        label="Employees"
                        value={String(stats.employees)}
                        helper="Standard user accounts"
                    />
                </section>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, email, or department"
                                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(e.target.value as "all" | UserRole)
                                }
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                {ROLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as "all" | UserStatus)
                                }
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Department</label>
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                <option value="all">All departments</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name || department.code || department.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Users</h2>
                        <p className="text-sm text-muted-foreground">
                            Existing users in the system, including department and access
                            details.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading users...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No users found for the current filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">User</th>
                                        <th className="px-5 py-4 font-medium">Role</th>
                                        <th className="px-5 py-4 font-medium">Department</th>
                                        <th className="px-5 py-4 font-medium">Status</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-t align-top">
                                            <td className="px-5 py-4 md:px-6">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {user.name || "Unnamed user"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.email || "No email"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <BadgeText
                                                    text={formatRole(user.role)}
                                                    tone={
                                                        user.role === "super_admin"
                                                            ? "blue"
                                                            : user.role === "department_head"
                                                                ? "green"
                                                                : "neutral"
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="text-sm">
                                                    {user.departmentName || (
                                                        <span className="text-muted-foreground">
                                                            Not assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <BadgeText
                                                    text={formatStatus(user.status)}
                                                    tone={
                                                        user.status === "active"
                                                            ? "green"
                                                            : user.status === "suspended"
                                                                ? "red"
                                                                : "neutral"
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {user.totalPoints}
                                            </td>

                                            <td className="px-5 py-4 md:px-6">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <ActionIconButton
                                                        label="Edit user"
                                                        title="Edit"
                                                        onClick={() => openEditUser(user)}
                                                        icon={<Pencil className="h-4 w-4" />}
                                                        tone="blue"
                                                        disabled={busyUserId === user.id}
                                                    />
                                                    <ActionIconButton
                                                        label={
                                                            user.status === "active"
                                                                ? "Deactivate user"
                                                                : "Activate user"
                                                        }
                                                        title={
                                                            user.status === "active"
                                                                ? "Deactivate"
                                                                : "Activate"
                                                        }
                                                        onClick={() => handleToggleUserStatus(user)}
                                                        icon={<Power className="h-4 w-4" />}
                                                        tone={
                                                            user.status === "active"
                                                                ? "red"
                                                                : "green"
                                                        }
                                                        disabled={busyUserId === user.id}
                                                    />
                                                    <ActionIconButton
                                                        label="Reset password"
                                                        title="Reset password"
                                                        onClick={() => handleResetPassword(user)}
                                                        icon={<KeyRound className="h-4 w-4" />}
                                                        tone="violet"
                                                        disabled={busyUserId === user.id}
                                                    />
                                                    <ActionIconButton
                                                        label="Delete user"
                                                        title="Delete"
                                                        onClick={() => handleDeleteUser(user)}
                                                        icon={<Trash2 className="h-4 w-4" />}
                                                        tone="red"
                                                        disabled={busyUserId === user.id}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SurfaceCard>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="w-[94vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Create User
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Create a new system user, assign their role, and link them to a department where needed.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-8 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full name</label>
                                    <input
                                        value={createName}
                                        onChange={(e) => setCreateName(e.target.value)}
                                        placeholder="Enter full name"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input
                                        value={createEmail}
                                        onChange={(e) => setCreateEmail(e.target.value)}
                                        type="email"
                                        placeholder="Enter email address"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <input
                                        value={createPassword}
                                        onChange={(e) => setCreatePassword(e.target.value)}
                                        type="password"
                                        placeholder="Enter temporary password"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <select
                                            value={createRole}
                                            onChange={(e) => setCreateRole(e.target.value as UserRole)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="super_admin">Super Admin</option>
                                            <option value="department_head">Department Head</option>
                                            <option value="employee">Employee</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <select
                                            value={createStatus}
                                            onChange={(e) => setCreateStatus(e.target.value as UserStatus)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Department {departmentRequired ? "*" : "(optional)"}
                                    </label>
                                    <select
                                        value={createDepartmentId}
                                        onChange={(e) => setCreateDepartmentId(e.target.value)}
                                        disabled={!departmentRequired}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            {departmentRequired
                                                ? "Select a department"
                                                : "No department required"}
                                        </option>
                                        {departments.map((department) => (
                                            <option key={department.id} value={department.id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Super Admins can exist without a department. Department Heads and Employees must be assigned to one.
                                    </p>
                                </div>

                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Access summary</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Role</span>
                                            <span className="font-medium text-foreground">
                                                {formatRole(createRole)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Status</span>
                                            <span className="font-medium text-foreground">
                                                {formatStatus(createStatus)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Department</span>
                                            <span className="text-right font-medium text-foreground">
                                                {departmentRequired
                                                    ? selectedDepartmentName || "Required"
                                                    : "Not required"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {createError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {createError}
                                    </div>
                                ) : null}

                                {createSuccess ? (
                                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                        {createSuccess}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t px-8 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handleCloseCreate}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={creatingUser}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateUser}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={creatingUser}
                            >
                                {creatingUser ? "Creating..." : "Create user"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="w-[94vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Edit User
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Update the user's details, role, department, and status.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-8 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full name</label>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Enter full name"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        type="email"
                                        placeholder="Enter email address"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <select
                                            value={editRole}
                                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="super_admin">Super Admin</option>
                                            <option value="department_head">Department Head</option>
                                            <option value="employee">Employee</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Department {(editRole === "department_head" || editRole === "employee") ? "*" : "(optional)"}
                                    </label>
                                    <select
                                        value={editDepartmentId}
                                        onChange={(e) => setEditDepartmentId(e.target.value)}
                                        disabled={editRole === "super_admin"}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            {editRole === "super_admin"
                                                ? "No department required"
                                                : "Select a department"}
                                        </option>
                                        {departments.map((department) => (
                                            <option key={department.id} value={department.id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {editError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {editError}
                                    </div>
                                ) : null}

                                {editSuccess ? (
                                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                        {editSuccess}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t px-8 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeEditUser}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={savingEdit}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={savingEdit}
                            >
                                {savingEdit ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </RequireRole>
    )
}

function StatCard({
    icon,
    label,
    value,
    helper,
}: {
    icon: React.ReactNode
    label: string
    value: string
    helper: string
}) {
    return (
        <SurfaceCard className="p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="text-slate-500">{icon}</div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
        </SurfaceCard>
    )
}

function BadgeText({
    text,
    tone,
}: {
    text: string
    tone: "blue" | "green" | "red" | "neutral"
}) {
    const toneClass =
        tone === "blue"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : tone === "green"
                ? "bg-green-50 text-green-700 border-green-200"
                : tone === "red"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"

    return (
        <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
        >
            {text}
        </span>
    )
}

function ActionIconButton({
    label,
    title,
    onClick,
    icon,
    tone,
    disabled = false,
}: {
    label: string
    title: string
    onClick: () => void
    icon: React.ReactNode
    tone: "blue" | "violet" | "green" | "red"
    disabled?: boolean
}) {
    const classes =
        tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            : tone === "violet"
                ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300"
                : tone === "green"
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300"
                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300"

    return (
        <button
            type="button"
            aria-label={label}
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition-colors duration-200 ${classes} disabled:cursor-not-allowed disabled:opacity-50`}
        >
            {icon}
        </button>
    )
}

function formatRole(role: WorkspaceUser["role"] | UserRole) {
    if (role === "super_admin") return "Super Admin"
    if (role === "department_head") return "Department Head"
    if (role === "employee") return "Employee"
    return "Missing role"
}

function formatStatus(status: WorkspaceUser["status"] | UserStatus) {
    if (status === "active") return "Active"
    if (status === "inactive") return "Inactive"
    if (status === "suspended") return "Suspended"
    return "Missing status"
}