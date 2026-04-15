"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import {
    Building2,
    Eye,
    Search,
    ShieldAlert,
    Sparkles,
    UserCheck,
    UserCog,
    Users,
} from "lucide-react"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { db } from "@/lib/firebase"
import { useUserProfile } from "@/components/providers/user-profile-provider"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type UserRole = "super_admin" | "department_head" | "employee"
type UserStatus = "active" | "inactive" | "suspended"

type TeamUser = {
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

const STATUS_OPTIONS: Array<{ label: string; value: UserStatus | "all" }> = [
    { label: "All statuses", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Suspended", value: "suspended" },
]

export default function HeadTeamPage() {
    const { profile } = useUserProfile()

    const [users, setUsers] = useState<TeamUser[]>([])
    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all")

    const [viewOpen, setViewOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null)

    useEffect(() => {
        loadTeamData()
    }, [])

    async function loadTeamData() {
        try {
            setLoading(true)

            const [usersSnap, departmentsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "departments")),
            ])

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs.map((doc) => {
                const data = doc.data() as Partial<DepartmentRecord>

                return {
                    id: doc.id,
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

            const userRows: TeamUser[] = usersSnap.docs.map((doc) => {
                const data = doc.data() as Partial<TeamUser>

                const departmentId = data.departmentId ?? ""
                const mappedDepartmentName =
                    data.departmentName ??
                    (departmentId ? departmentNameMap.get(departmentId) ?? "" : "")

                return {
                    id: doc.id,
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
            console.error("Failed to load head team data:", error)
        } finally {
            setLoading(false)
        }
    }

    const headDepartmentId = profile?.departmentId ?? ""

    const headDepartmentName = useMemo(() => {
        if (!headDepartmentId) return ""
        return (
            departments.find((department) => department.id === headDepartmentId)?.name ?? ""
        )
    }, [departments, headDepartmentId])

    const departmentUsers = useMemo(() => {
        if (!headDepartmentId) return []

        return users.filter((user) => {
            const sameDepartment = user.departmentId === headDepartmentId
            const isEmployee = user.role === "employee"
            return sameDepartment && isEmployee
        })
    }, [users, headDepartmentId])

    const filteredUsers = useMemo(() => {
        return departmentUsers.filter((user) => {
            const matchesSearch =
                search.trim() === "" ||
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase()) ||
                user.departmentName.toLowerCase().includes(search.toLowerCase())

            const matchesStatus =
                statusFilter === "all" || user.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [departmentUsers, search, statusFilter])

    const stats = useMemo(() => {
        return {
            totalEmployees: departmentUsers.length,
            activeEmployees: departmentUsers.filter((user) => user.status === "active").length,
            inactiveEmployees: departmentUsers.filter((user) => user.status === "inactive").length,
            suspendedEmployees: departmentUsers.filter((user) => user.status === "suspended").length,
            totalPoints: departmentUsers.reduce((sum, user) => sum + user.totalPoints, 0),
        }
    }, [departmentUsers])

    function handleOpenView(user: TeamUser) {
        setSelectedUser(user)
        setViewOpen(true)
    }

    return (
        <RequireRole allowedRoles={["department_head"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] border bg-[linear-gradient(135deg,#d61f2c_0%,#d61f2c_48%,#d61f2c_100%)] px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            Department team
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Team Members & Performance
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            View the employees in your department, monitor their status,
                            and keep track of the points your team is building over time.
                        </p>
                    </div>
                </section>

                <section className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Team</p>
                    <h2 className="text-3xl font-bold tracking-tight">Department Team</h2>
                    <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                        View the employees assigned to your department, their account status,
                        and their total points.
                    </p>
                    <p className="text-sm font-medium text-foreground">
                        Department: {headDepartmentName || "Not assigned"}
                    </p>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Employees"
                        value={String(stats.totalEmployees)}
                        helper="Total department employees"
                    />
                    <StatCard
                        icon={<UserCheck className="h-5 w-5" />}
                        label="Active"
                        value={String(stats.activeEmployees)}
                        helper="Currently active users"
                    />
                    <StatCard
                        icon={<UserCog className="h-5 w-5" />}
                        label="Inactive"
                        value={String(stats.inactiveEmployees)}
                        helper="Inactive employee accounts"
                    />
                    <StatCard
                        icon={<ShieldAlert className="h-5 w-5" />}
                        label="Suspended"
                        value={String(stats.suspendedEmployees)}
                        helper="Suspended employee accounts"
                    />
                    <StatCard
                        icon={<Sparkles className="h-5 w-5" />}
                        label="Team points"
                        value={String(stats.totalPoints)}
                        helper="Combined employee points"
                    />
                </section>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name or email"
                                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
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
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Team members</h2>
                        <p className="text-sm text-muted-foreground">
                            Employees assigned to your department.
                        </p>
                    </div>

                    {!headDepartmentId ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Your account is not assigned to a department yet.
                        </div>
                    ) : loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading team members...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No team members found for the current filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Employee</th>
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
                                                        {user.name || "Unnamed employee"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.email || "No email"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span>{user.departmentName || "Not assigned"}</span>
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <ActionIconButton
                                                        label="View employee"
                                                        title="View employee"
                                                        onClick={() => handleOpenView(user)}
                                                        icon={<Eye className="h-4 w-4" />}
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

                <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                    <DialogContent className="w-[94vw] max-w-3xl rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Employee details
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                View employee account and department details.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-8 py-6 md:grid-cols-2">
                            <DetailCard
                                label="Full name"
                                value={selectedUser?.name || "Unnamed employee"}
                            />
                            <DetailCard
                                label="Email"
                                value={selectedUser?.email || "No email"}
                            />
                            <DetailCard
                                label="Role"
                                value={formatRole(selectedUser?.role ?? "")}
                            />
                            <DetailCard
                                label="Status"
                                value={formatStatus(selectedUser?.status ?? "")}
                            />
                            <DetailCard
                                label="Department"
                                value={selectedUser?.departmentName || "Not assigned"}
                            />
                            <DetailCard
                                label="Total points"
                                value={String(selectedUser?.totalPoints ?? 0)}
                            />
                        </div>

                        <div className="flex justify-end border-t px-8 py-4">
                            <button
                                type="button"
                                onClick={() => setViewOpen(false)}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                            >
                                Close
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

function DetailCard({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
        </div>
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
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : tone === "green"
                ? "border-green-200 bg-green-50 text-green-700"
                : tone === "red"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-100 text-slate-700"

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
}: {
    label: string
    title: string
    onClick: () => void
    icon: React.ReactNode
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={title}
            onClick={onClick}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
        >
            {icon}
        </button>
    )
}

function formatRole(role: TeamUser["role"] | UserRole | "") {
    if (role === "super_admin") return "Super Admin"
    if (role === "department_head") return "Department Head"
    if (role === "employee") return "Employee"
    return "Missing role"
}

function formatStatus(status: TeamUser["status"] | UserStatus | "") {
    if (status === "active") return "Active"
    if (status === "inactive") return "Inactive"
    if (status === "suspended") return "Suspended"
    return "Missing status"
}