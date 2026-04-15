"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useUserProfile } from "@/components/providers/user-profile-provider"
import { adminShellNav } from "@/components/layout/app-shell"
import { db } from "@/lib/firebase"

type UserRole = "super_admin" | "department_head" | "employee"

type DepartmentRecord = {
    id: string
    name: string
    code: string
    isActive: boolean
    isDeleted: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

type UserRecord = {
    id: string
    name: string
    email: string
    role: UserRole | ""
    status?: string
    isDeleted: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

type RewardRecord = {
    id: string
    title: string
    isActive: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

type ActivityRecord = {
    id: string
    title: string
    isActive: boolean
    createdAt?: unknown
    updatedAt?: unknown
}

type ActivityScanRecord = {
    id: string
    activityTitle: string
    userName: string
    userEmail: string
    pointsAwarded: number
    scannedAt?: unknown
    createdAt?: unknown
}

type FeedItem = {
    title: string
    text: string
    sortTime: number
}

export default function AdminPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [loading, setLoading] = useState(true)

    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [users, setUsers] = useState<UserRecord[]>([])
    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [activities, setActivities] = useState<ActivityRecord[]>([])
    const [activityScans, setActivityScans] = useState<ActivityScanRecord[]>([])

    useEffect(() => {
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        try {
            setLoading(true)

            const [
                departmentsSnap,
                usersSnap,
                rewardsSnap,
                activitiesSnap,
                activityScansSnap,
            ] = await Promise.all([
                getDocs(collection(db, "departments")),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "rewards")),
                getDocs(collection(db, "activities")),
                getDocs(collection(db, "activity_scans")),
            ])

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<DepartmentRecord>

                return {
                    id: docSnap.id,
                    name: data.name ?? "",
                    code: data.code ?? "",
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
                    status: data.status ?? "",
                    isDeleted: data.isDeleted ?? false,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const rewardRows: RewardRecord[] = rewardsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<RewardRecord>

                return {
                    id: docSnap.id,
                    title: data.title ?? "",
                    isActive: data.isActive ?? true,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const activityRows: ActivityRecord[] = activitiesSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<ActivityRecord>

                return {
                    id: docSnap.id,
                    title: data.title ?? "",
                    isActive: data.isActive ?? true,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const activityScanRows: ActivityScanRecord[] = activityScansSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<ActivityScanRecord>

                return {
                    id: docSnap.id,
                    activityTitle: data.activityTitle ?? "",
                    userName: data.userName ?? "",
                    userEmail: data.userEmail ?? "",
                    pointsAwarded:
                        typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
                    scannedAt: data.scannedAt,
                    createdAt: data.createdAt,
                }
            })

            setDepartments(departmentRows)
            setUsers(userRows)
            setRewards(rewardRows)
            setActivities(activityRows)
            setActivityScans(activityScanRows)
        } catch (error) {
            console.error("Failed to load admin dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const activeDepartments = useMemo(() => {
        return departments.filter((department) => !department.isDeleted && department.isActive)
    }, [departments])

    const activeEmployees = useMemo(() => {
        return users.filter(
            (user) =>
                !user.isDeleted &&
                user.role === "employee" &&
                user.status !== "inactive" &&
                user.status !== "suspended"
        )
    }, [users])

    const activeRewards = useMemo(() => {
        return rewards.filter((reward) => reward.isActive)
    }, [rewards])

    const activeActivities = useMemo(() => {
        return activities.filter((activity) => activity.isActive)
    }, [activities])

    const engagementPercent = useMemo(() => {
        if (activeEmployees.length === 0) return 0

        const scannedEmails = new Set(
            activityScans
                .map((scan) => scan.userEmail.trim().toLowerCase())
                .filter(Boolean)
        )

        const engagedEmployees = activeEmployees.filter((employee) =>
            scannedEmails.has(employee.email.trim().toLowerCase())
        ).length

        return Math.round((engagedEmployees / activeEmployees.length) * 100)
    }, [activeEmployees, activityScans])

    const feedItems = useMemo(() => {
        const items: FeedItem[] = []

        const latestDepartment = [...activeDepartments].sort(
            (a, b) => getTimeValue(b.createdAt ?? b.updatedAt) - getTimeValue(a.createdAt ?? a.updatedAt)
        )[0]

        if (latestDepartment) {
            items.push({
                title: "Latest department",
                text: `${latestDepartment.name || latestDepartment.code || "Untitled department"} was added to the workspace.`,
                sortTime: getTimeValue(latestDepartment.createdAt ?? latestDepartment.updatedAt),
            })
        }

        const latestUser = [...users]
            .filter((user) => !user.isDeleted)
            .sort(
                (a, b) => getTimeValue(b.createdAt ?? b.updatedAt) - getTimeValue(a.createdAt ?? a.updatedAt)
            )[0]

        if (latestUser) {
            items.push({
                title: "Latest user",
                text: `${latestUser.name || latestUser.email || "New user"} joined as ${formatRole(latestUser.role)}.`,
                sortTime: getTimeValue(latestUser.createdAt ?? latestUser.updatedAt),
            })
        }

        const latestScan = [...activityScans].sort(
            (a, b) => getTimeValue(b.scannedAt ?? b.createdAt) - getTimeValue(a.scannedAt ?? a.createdAt)
        )[0]

        if (latestScan) {
            items.push({
                title: "Latest activity scan",
                text: `${latestScan.userName || latestScan.userEmail || "A user"} scanned ${latestScan.activityTitle || "an activity"} for ${latestScan.pointsAwarded} points.`,
                sortTime: getTimeValue(latestScan.scannedAt ?? latestScan.createdAt),
            })
        }

        const latestReward = [...activeRewards].sort(
            (a, b) => getTimeValue(b.createdAt ?? b.updatedAt) - getTimeValue(a.createdAt ?? a.updatedAt)
        )[0]

        if (latestReward) {
            items.push({
                title: "Latest reward",
                text: `${latestReward.title || "Untitled reward"} is now available in the rewards catalog.`,
                sortTime: getTimeValue(latestReward.createdAt ?? latestReward.updatedAt),
            })
        }

        if (items.length === 0) {
            return [
                {
                    title: "No activity yet",
                    text: "Create departments, users, activities, and rewards to populate this dashboard.",
                    sortTime: 0,
                },
            ]
        }

        return items.sort((a, b) => b.sortTime - a.sortTime).slice(0, 3)
    }, [activeDepartments, activeRewards, activityScans, users])

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#d61f2c_0%,#d61f2c_48%,#d61f2c_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)]">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                            Company overview
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Welcome back, {profileLoading ? "..." : (profile?.name ?? "Admin")}
                        </h1>
                        <p className="max-w-2xl text-sm text-white/85 md:text-base">
                            Manage departments, department heads, employees, rewards, and company-wide engagement from one clean workspace.
                        </p>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        title="Departments"
                        value={loading ? "..." : String(activeDepartments.length)}
                        helper={
                            loading
                                ? "Loading departments..."
                                : activeDepartments.length === 0
                                    ? "Create the company structure"
                                    : "Active departments in the system"
                        }
                    />
                    <MetricCard
                        title="Employees"
                        value={loading ? "..." : String(activeEmployees.length)}
                        helper={
                            loading
                                ? "Loading employees..."
                                : activeEmployees.length === 0
                                    ? "No employees added yet"
                                    : "Active employees in the system"
                        }
                    />
                    <MetricCard
                        title="Rewards"
                        value={loading ? "..." : String(activeRewards.length)}
                        helper={
                            loading
                                ? "Loading rewards..."
                                : activeRewards.length === 0
                                    ? "Milestones not configured"
                                    : "Active rewards available"
                        }
                    />
                    <MetricCard
                        title="Engagement"
                        value={loading ? "..." : `${engagementPercent}%`}
                        helper={
                            loading
                                ? "Loading participation..."
                                : activeActivities.length === 0
                                    ? "No active activities yet"
                                    : "Employees with at least one scan"
                        }
                    />
                </section>

                <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <SurfaceCard className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">
                            Navigation
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                            Admin areas
                        </h2>

                        <div className="mt-5 grid gap-3">
                            {adminShellNav.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center justify-between rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--primary)] hover:bg-white"
                                >
                                    <span className="text-sm font-medium">{item.label}</span>
                                    <span className="text-xs text-muted-foreground">Open</span>
                                </Link>
                            ))}
                        </div>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">
                            Latest updates
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                            Activity feed
                        </h2>

                        <div className="mt-5 space-y-3">
                            {feedItems.map((item, index) => (
                                <FeedRow
                                    key={`${item.title}-${index}`}
                                    title={item.title}
                                    text={item.text}
                                />
                            ))}
                        </div>
                    </SurfaceCard>
                </section>
            </div>
        </RequireRole>
    )
}

function MetricCard({
    title,
    value,
    helper,
}: {
    title: string
    value: string
    helper: string
}) {
    return (
        <SurfaceCard className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
        </SurfaceCard>
    )
}

function FeedRow({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
    )
}

function formatRole(role: UserRole | "") {
    if (role === "super_admin") return "Super Admin"
    if (role === "department_head") return "Department Head"
    if (role === "employee") return "Employee"
    return "User"
}

function getTimeValue(value: unknown) {
    if (!value) return 0

    if (value instanceof Date) {
        return value.getTime()
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "seconds" in value &&
        typeof (value as { seconds?: unknown }).seconds === "number"
    ) {
        return (value as { seconds: number }).seconds * 1000
    }

    return 0
}