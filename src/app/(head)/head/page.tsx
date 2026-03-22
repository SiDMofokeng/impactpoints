"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import {
    Building2,
    Gift,
    QrCode,
    ShieldCheck,
    Users,
} from "lucide-react"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useUserProfile } from "@/components/providers/user-profile-provider"
import { db } from "@/lib/firebase"

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
}

type ActivityType = "check_in" | "check_out" | "meeting" | "training" | "general"

type ActivityRecord = {
    id: string
    title: string
    code: string
    type: ActivityType | ""
    points: number
    description: string
    allowedDepartments: string[]
    isActive: boolean
    requiresEmail: boolean
}

type RewardType =
    | "voucher"
    | "meal"
    | "time_off"
    | "airtime"
    | "gift"
    | "cash_bonus"
    | "experience"
    | "other"

type RewardRecord = {
    id: string
    title: string
    description: string
    type: RewardType | ""
    pointsRequired: number
    stock: number
    isActive: boolean
    allowedDepartments: string[]
}

type DepartmentRecord = {
    id: string
    name: string
    code: string
    isActive: boolean
    isDeleted: boolean
}

export default function DepartmentHeadPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [users, setUsers] = useState<WorkspaceUser[]>([])
    const [activities, setActivities] = useState<ActivityRecord[]>([])
    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [department, setDepartment] = useState<DepartmentRecord | null>(null)
    const [loading, setLoading] = useState(true)

    const departmentId = profile?.departmentId ?? ""

    useEffect(() => {
        if (profileLoading) return

        if (!departmentId) {
            setUsers([])
            setActivities([])
            setRewards([])
            setDepartment(null)
            setLoading(false)
            return
        }

        loadOverviewData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, departmentId])

    async function loadOverviewData() {
        try {
            setLoading(true)

            const [usersSnap, activitiesSnap, rewardsSnap, departmentsSnap] =
                await Promise.all([
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "activities")),
                    getDocs(collection(db, "rewards")),
                    getDocs(collection(db, "departments")),
                ])

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<DepartmentRecord>

                return {
                    id: docSnap.id,
                    name: data.name ?? "",
                    code: data.code ?? "",
                    isActive: data.isActive ?? true,
                    isDeleted: data.isDeleted ?? false,
                }
            })

            const currentDepartment =
                departmentRows.find((item) => item.id === departmentId) ?? null

            const departmentNameMap = new Map(
                departmentRows.map((item) => [item.id, item.name])
            )

            const userRows: WorkspaceUser[] = usersSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<WorkspaceUser>
                const mappedDepartmentId = data.departmentId ?? ""
                const mappedDepartmentName =
                    data.departmentName ??
                    (mappedDepartmentId
                        ? departmentNameMap.get(mappedDepartmentId) ?? ""
                        : "")

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
                    departmentId: mappedDepartmentId,
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
                }
            })

            const activityRows: ActivityRecord[] = activitiesSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<ActivityRecord>

                return {
                    id: docSnap.id,
                    title: data.title ?? "",
                    code: data.code ?? "",
                    type:
                        data.type === "check_in" ||
                            data.type === "check_out" ||
                            data.type === "meeting" ||
                            data.type === "training" ||
                            data.type === "general"
                            ? data.type
                            : "",
                    points: typeof data.points === "number" ? data.points : 0,
                    description: data.description ?? "",
                    allowedDepartments: Array.isArray(data.allowedDepartments)
                        ? data.allowedDepartments
                        : [],
                    isActive: data.isActive ?? true,
                    requiresEmail: data.requiresEmail ?? true,
                }
            })

            const rewardRows: RewardRecord[] = rewardsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<RewardRecord>

                return {
                    id: docSnap.id,
                    title: data.title ?? "",
                    description: data.description ?? "",
                    type:
                        data.type === "voucher" ||
                            data.type === "meal" ||
                            data.type === "time_off" ||
                            data.type === "airtime" ||
                            data.type === "gift" ||
                            data.type === "cash_bonus" ||
                            data.type === "experience" ||
                            data.type === "other"
                            ? data.type
                            : "",
                    pointsRequired:
                        typeof data.pointsRequired === "number" ? data.pointsRequired : 0,
                    stock: typeof data.stock === "number" ? data.stock : 0,
                    isActive: data.isActive ?? true,
                    allowedDepartments: Array.isArray(data.allowedDepartments)
                        ? data.allowedDepartments
                        : [],
                }
            })

            const departmentUsers = userRows.filter((user) => {
                return (
                    !user.isDeleted &&
                    user.role === "employee" &&
                    user.departmentId === departmentId
                )
            })

            const departmentActivities = activityRows.filter((activity) => {
                if (activity.allowedDepartments.length === 0) return true
                return activity.allowedDepartments.includes(departmentId)
            })

            const departmentRewards = rewardRows.filter((reward) => {
                if (reward.allowedDepartments.length === 0) return true
                return reward.allowedDepartments.includes(departmentId)
            })

            setDepartment(currentDepartment)
            setUsers(departmentUsers)
            setActivities(departmentActivities)
            setRewards(departmentRewards)
        } catch (error) {
            console.error("Failed to load department overview:", error)
        } finally {
            setLoading(false)
        }
    }

    const metrics = useMemo(() => {
        const activeActivities = activities.filter((activity) => activity.isActive).length
        const employees = users.length
        const pendingReviews = 0
        const milestones = rewards.length
        const activeRewards = rewards.filter((reward) => reward.isActive).length
        const totalTeamPoints = users.reduce((sum, user) => sum + user.totalPoints, 0)

        return {
            activeActivities,
            employees,
            pendingReviews,
            milestones,
            activeRewards,
            totalTeamPoints,
        }
    }, [activities, users, rewards])

    const topEmployees = useMemo(() => {
        return [...users]
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5)
    }, [users])

    const recentActivities = useMemo(() => {
        return activities.slice(0, 4)
    }, [activities])

    return (
        <RequireRole allowedRoles={["department_head"]}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        Department overview
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {profileLoading ? "..." : (profile?.name ?? "Department Head")}
                    </h1>
                    <p className="text-muted-foreground">
                        Manage activities, rewards, and participation inside your department.
                    </p>
                </div>

                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-lime-500 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            Department overview
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            {profileLoading ? "Welcome back" : `Welcome back, ${profile?.name ?? "Department Head"}`}
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Manage your team, activities, rewards, and participation across{" "}
                            {department?.name || "your department"} from one clean workspace.
                        </p>
                    </div>
                </section>

                {!departmentId ? (
                    <SurfaceCard className="p-6">
                        <p className="text-sm text-amber-700">
                            Your account is not linked to a department yet. Ask the super admin
                            to assign your department before using this portal fully.
                        </p>
                    </SurfaceCard>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Active Activities"
                        value={loading ? "..." : String(metrics.activeActivities)}
                        helper={
                            loading
                                ? "Loading activities"
                                : metrics.activeActivities === 0
                                    ? "No active activities yet"
                                    : "Currently available for scanning"
                        }
                        icon={<QrCode className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Employees"
                        value={loading ? "..." : String(metrics.employees)}
                        helper={
                            loading
                                ? "Loading employees"
                                : metrics.employees === 0
                                    ? "No team members assigned"
                                    : "Employees in your department"
                        }
                        icon={<Users className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Pending Reviews"
                        value={loading ? "..." : String(metrics.pendingReviews)}
                        helper="Currently auto-approved"
                        icon={<ShieldCheck className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Milestones"
                        value={loading ? "..." : String(metrics.milestones)}
                        helper={
                            loading
                                ? "Loading rewards"
                                : metrics.milestones === 0
                                    ? "No rewards configured"
                                    : "Rewards available to your department"
                        }
                        icon={<Gift className="h-5 w-5" />}
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Top employees
                                </p>
                                <h2 className="text-xl font-semibold">Points leaderboard</h2>
                            </div>

                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading team data...</p>
                            ) : topEmployees.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No employees found for this department yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {topEmployees.map((employee, index) => (
                                        <div
                                            key={employee.id}
                                            className="flex items-center justify-between rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {index + 1}. {employee.name || "Unnamed employee"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {employee.email || "No email"}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold">
                                                {employee.totalPoints} pts
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Department activities
                                </p>
                                <h2 className="text-xl font-semibold">Available activities</h2>
                            </div>

                            {loading ? (
                                <p className="text-sm text-muted-foreground">
                                    Loading activities...
                                </p>
                            ) : recentActivities.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No activities available yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {activity.title || "Untitled activity"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatActivityType(activity.type)} · {activity.points} pts
                                                </p>
                                            </div>
                                            <span
                                                className={
                                                    activity.isActive
                                                        ? "inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                        : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                                }
                                            >
                                                {activity.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SurfaceCard>
                </div>
            </div>
        </RequireRole>
    )
}

function MetricCard({
    label,
    value,
    helper,
    icon,
}: {
    label: string
    value: string
    helper: string
    icon: React.ReactNode
}) {
    return (
        <SurfaceCard className="p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="text-slate-500">{icon}</div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
        </SurfaceCard>
    )
}

function formatActivityType(type: ActivityType | "") {
    if (type === "check_in") return "Check-in"
    if (type === "check_out") return "Check-out"
    if (type === "meeting") return "Meeting"
    if (type === "training") return "Training"
    if (type === "general") return "General"
    return "Unknown"
}