"use client"

import { useEffect, useMemo, useState } from "react"
import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore"
import {
    BadgeCheck,
    Building2,
    Pencil,
    Plus,
    Power,
    Search,
    ShieldCheck,
    UserCog,
    Users,
} from "lucide-react"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { db } from "@/lib/firebase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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

type UserRecord = {
    id: string
    name: string
    email: string
    role: "super_admin" | "department_head" | "employee" | ""
    departmentId: string
    departmentName: string
    status: "active" | "inactive" | "suspended" | ""
    isDeleted: boolean
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [users, setUsers] = useState<UserRecord[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
        "all"
    )

    const [createOpen, setCreateOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const [createName, setCreateName] = useState("")
    const [createDescription, setCreateDescription] = useState("")
    const [createHeadUserId, setCreateHeadUserId] = useState("")
    const [createIsActive, setCreateIsActive] = useState(true)
    const [createError, setCreateError] = useState("")

    const [editOpen, setEditOpen] = useState(false)
    const [editingDepartmentId, setEditingDepartmentId] = useState("")
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editHeadUserId, setEditHeadUserId] = useState("")
    const [editIsActive, setEditIsActive] = useState(true)
    const [editError, setEditError] = useState("")
    const [editSaving, setEditSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)

            const [departmentsSnap, usersSnap] = await Promise.all([
                getDocs(query(collection(db, "departments"), orderBy("name"))),
                getDocs(collection(db, "users")),
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

            const userRows: UserRecord[] = usersSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<UserRecord>

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
                    departmentId: data.departmentId ?? "",
                    departmentName: data.departmentName ?? "",
                    status:
                        data.status === "active" ||
                            data.status === "inactive" ||
                            data.status === "suspended"
                            ? data.status
                            : "",
                    isDeleted: data.isDeleted ?? false,
                }
            })

            setDepartments(departmentRows.filter((item) => !item.isDeleted))
            setUsers(userRows.filter((item) => !item.isDeleted))
        } catch (error) {
            console.error("Failed to load departments:", error)
        } finally {
            setLoading(false)
        }
    }

    const departmentHeadOptions = useMemo(() => {
        return users.filter(
            (user) => user.role === "department_head" && user.status === "active"
        )
    }, [users])

    const filteredDepartments = useMemo(() => {
        return departments.filter((department) => {
            const matchesSearch =
                search.trim() === "" ||
                department.name.toLowerCase().includes(search.toLowerCase()) ||
                department.code.toLowerCase().includes(search.toLowerCase()) ||
                department.description.toLowerCase().includes(search.toLowerCase()) ||
                department.headName.toLowerCase().includes(search.toLowerCase())

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && department.isActive) ||
                (statusFilter === "inactive" && !department.isActive)

            return matchesSearch && matchesStatus
        })
    }, [departments, search, statusFilter])

    const stats = useMemo(() => {
        const activeDepartments = departments.filter((item) => item.isActive).length
        const inactiveDepartments = departments.filter((item) => !item.isActive).length
        const assignedHeads = departments.filter((item) => item.headUserId).length

        return {
            total: departments.length,
            active: activeDepartments,
            inactive: inactiveDepartments,
            heads: assignedHeads,
        }
    }, [departments])

    function resetCreateForm() {
        setCreateName("")
        setCreateDescription("")
        setCreateHeadUserId("")
        setCreateIsActive(true)
        setCreateError("")
    }

    function handleCloseCreate() {
        if (saving) return
        setCreateOpen(false)
        resetCreateForm()
    }

    function resetEditForm() {
        setEditingDepartmentId("")
        setEditName("")
        setEditDescription("")
        setEditHeadUserId("")
        setEditIsActive(true)
        setEditError("")
    }

    function handleCloseEdit() {
        if (editSaving) return
        setEditOpen(false)
        resetEditForm()
    }

    function getHeadName(userId: string) {
        if (!userId) return ""
        return departmentHeadOptions.find((user) => user.id === userId)?.name ?? ""
    }

    function isHeadAlreadyAssignedElsewhere(
        headUserId: string,
        currentDepartmentId?: string
    ) {
        if (!headUserId) return false

        return departments.some(
            (department) =>
                department.headUserId === headUserId &&
                department.id !== currentDepartmentId
        )
    }

    async function handleCreateDepartment() {
        const trimmedName = createName.trim()
        const trimmedDescription = createDescription.trim()

        if (!trimmedName) {
            setCreateError("Department name is required.")
            return
        }

        const duplicateName = departments.some(
            (department) => department.name.trim().toLowerCase() === trimmedName.toLowerCase()
        )

        if (duplicateName) {
            setCreateError("A department with that name already exists.")
            return
        }

        if (isHeadAlreadyAssignedElsewhere(createHeadUserId)) {
            setCreateError("That department head is already assigned to another department.")
            return
        }

        setCreateError("")
        setSaving(true)

        try {
            const nextNumber = departments.length + 1
            const nextCode = `DEPT-${String(nextNumber).padStart(3, "0")}`

            await addDoc(collection(db, "departments"), {
                name: trimmedName,
                code: nextCode,
                description: trimmedDescription,
                headUserId: createHeadUserId,
                headName: getHeadName(createHeadUserId),
                isActive: createIsActive,
                isDeleted: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            handleCloseCreate()
            await loadData()
        } catch (error) {
            console.error("Failed to create department:", error)
            setCreateError("Failed to create department. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    function handleOpenEdit(department: DepartmentRecord) {
        setEditingDepartmentId(department.id)
        setEditName(department.name)
        setEditDescription(department.description)
        setEditHeadUserId(department.headUserId)
        setEditIsActive(department.isActive)
        setEditError("")
        setEditOpen(true)
    }

    async function handleSaveEdit() {
        const trimmedName = editName.trim()
        const trimmedDescription = editDescription.trim()

        if (!editingDepartmentId) {
            setEditError("No department selected.")
            return
        }

        if (!trimmedName) {
            setEditError("Department name is required.")
            return
        }

        const duplicateName = departments.some(
            (department) =>
                department.id !== editingDepartmentId &&
                department.name.trim().toLowerCase() === trimmedName.toLowerCase()
        )

        if (duplicateName) {
            setEditError("A department with that name already exists.")
            return
        }

        if (isHeadAlreadyAssignedElsewhere(editHeadUserId, editingDepartmentId)) {
            setEditError("That department head is already assigned to another department.")
            return
        }

        setEditError("")
        setEditSaving(true)

        try {
            const departmentRef = doc(db, "departments", editingDepartmentId)

            await updateDoc(departmentRef, {
                name: trimmedName,
                description: trimmedDescription,
                headUserId: editHeadUserId,
                headName: getHeadName(editHeadUserId),
                isActive: editIsActive,
                updatedAt: serverTimestamp(),
            })

            handleCloseEdit()
            await loadData()
        } catch (error) {
            console.error("Failed to update department:", error)
            setEditError("Failed to save department changes. Please try again.")
        } finally {
            setEditSaving(false)
        }
    }

    async function handleToggleDepartmentStatus(department: DepartmentRecord) {
        try {
            const departmentRef = doc(db, "departments", department.id)

            await updateDoc(departmentRef, {
                isActive: !department.isActive,
                updatedAt: serverTimestamp(),
            })

            await loadData()
        } catch (error) {
            console.error("Failed to toggle department status:", error)
        }
    }

    function getMemberCount(departmentId: string) {
        return users.filter(
            (user) =>
                user.departmentId === departmentId &&
                user.role !== "super_admin" &&
                user.status !== "suspended"
        ).length
    }

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#84cc16_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)]">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                            Departments
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Department Management
                        </h1>
                        <p className="max-w-2xl text-sm text-white/85 md:text-base">
                            Create departments, assign heads, and manage the structure of the organization.
                        </p>
                    </div>
                </section>

                <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Departments
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Department list
                        </h2>
                        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                            View department codes, assigned heads, member counts, and active status.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Create department
                    </button>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<Building2 className="h-5 w-5" />}
                        label="Total departments"
                        value={String(stats.total)}
                        helper="All departments in system"
                    />
                    <StatCard
                        icon={<ShieldCheck className="h-5 w-5" />}
                        label="Active departments"
                        value={String(stats.active)}
                        helper="Currently active departments"
                    />
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Inactive departments"
                        value={String(stats.inactive)}
                        helper="Departments not in use"
                    />
                    <StatCard
                        icon={<UserCog className="h-5 w-5" />}
                        label="Assigned heads"
                        value={String(stats.heads)}
                        helper="Departments with a head"
                    />
                </section>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by department, code, description, or head"
                                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as "all" | "active" | "inactive")
                                }
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                <option value="all">All statuses</option>
                                <option value="active">Active only</option>
                                <option value="inactive">Inactive only</option>
                            </select>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Departments</h2>
                        <p className="text-sm text-muted-foreground">
                            Department list with codes, heads, status, and member totals.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading departments...
                        </div>
                    ) : filteredDepartments.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No departments found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Department</th>
                                        <th className="px-5 py-4 font-medium">Code</th>
                                        <th className="px-5 py-4 font-medium">Head</th>
                                        <th className="px-5 py-4 font-medium">Members</th>
                                        <th className="px-5 py-4 font-medium">Status</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredDepartments.map((department) => (
                                        <tr key={department.id} className="border-t align-top">
                                            <td className="px-5 py-4 md:px-6">
                                                <div>
                                                    <p className="text-sm font-semibold">{department.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {department.description || "No description"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {department.code || "Pending code"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="text-sm">
                                                    {department.headName || (
                                                        <span className="text-muted-foreground">
                                                            Not assigned
                                                        </span>
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {getMemberCount(department.id)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge active={department.isActive} />
                                            </td>

                                            <td className="px-5 py-4 md:px-6">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <ActionIconButton
                                                        label="Edit department"
                                                        title="Edit"
                                                        onClick={() => handleOpenEdit(department)}
                                                        icon={<Pencil className="h-4 w-4" />}
                                                        tone="blue"
                                                    />
                                                    <ActionIconButton
                                                        label={
                                                            department.isActive
                                                                ? "Deactivate department"
                                                                : "Activate department"
                                                        }
                                                        title={
                                                            department.isActive
                                                                ? "Deactivate"
                                                                : "Activate"
                                                        }
                                                        onClick={() => handleToggleDepartmentStatus(department)}
                                                        icon={
                                                            department.isActive ? (
                                                                <Power className="h-4 w-4" />
                                                            ) : (
                                                                <BadgeCheck className="h-4 w-4" />
                                                            )
                                                        }
                                                        tone={department.isActive ? "red" : "green"}
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
                    <DialogContent className="w-[94vw] max-w-3xl rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Create Department
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Add a new department and optionally assign a department head.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 px-8 py-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department name</label>
                                <input
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    placeholder="Enter department name"
                                    className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={createDescription}
                                    onChange={(e) => setCreateDescription(e.target.value)}
                                    placeholder="Enter department description"
                                    rows={4}
                                    className="w-full rounded-[var(--radius-input)] border bg-white px-4 py-3 text-sm outline-none"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Department head</label>
                                    <select
                                        value={createHeadUserId}
                                        onChange={(e) => setCreateHeadUserId(e.target.value)}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    >
                                        <option value="">No head assigned</option>
                                        {departmentHeadOptions.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <select
                                        value={createIsActive ? "active" : "inactive"}
                                        onChange={(e) => setCreateIsActive(e.target.value === "active")}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                <p className="text-sm font-semibold">Notes</p>
                                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <p>Department code will be auto-generated.</p>
                                    <p>Only one head can be assigned to a department.</p>
                                </div>
                            </div>

                            {createError ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {createError}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t px-8 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handleCloseCreate}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateDepartment}
                                disabled={saving}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? "Creating..." : "Create department"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="w-[94vw] max-w-3xl rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Edit Department
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Update department details, assigned head, and active status.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 px-8 py-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter department name"
                                    className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Enter department description"
                                    rows={4}
                                    className="w-full rounded-[var(--radius-input)] border bg-white px-4 py-3 text-sm outline-none"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Department head</label>
                                    <select
                                        value={editHeadUserId}
                                        onChange={(e) => setEditHeadUserId(e.target.value)}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    >
                                        <option value="">No head assigned</option>
                                        {departmentHeadOptions
                                            .filter(
                                                (user) =>
                                                    !isHeadAlreadyAssignedElsewhere(user.id, editingDepartmentId)
                                            )
                                            .concat(
                                                editHeadUserId
                                                    ? departmentHeadOptions.filter(
                                                        (user) => user.id === editHeadUserId
                                                    )
                                                    : []
                                            )
                                            .filter(
                                                (user, index, array) =>
                                                    array.findIndex((item) => item.id === user.id) === index
                                            )
                                            .map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <select
                                        value={editIsActive ? "active" : "inactive"}
                                        onChange={(e) => setEditIsActive(e.target.value === "active")}
                                        className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {editError ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {editError}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t px-8 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handleCloseEdit}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {editSaving ? "Saving..." : "Save changes"}
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

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={
                active
                    ? "inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            }
        >
            {active ? "Active" : "Inactive"}
        </span>
    )
}

function ActionIconButton({
    label,
    title,
    onClick,
    icon,
    tone,
}: {
    label: string
    title: string
    onClick: () => void
    icon: React.ReactNode
    tone: "blue" | "green" | "red"
}) {
    const classes =
        tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : tone === "green"
                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"

    return (
        <button
            type="button"
            aria-label={label}
            title={title}
            onClick={onClick}
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${classes}`}
        >
            {icon}
        </button>
    )
}