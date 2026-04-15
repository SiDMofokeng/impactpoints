"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import {
    Activity,
    BarChart3,
    Building2,
    Medal,
    PieChart as PieChartIcon,
    QrCode,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Line,
    LineChart,
} from "recharts"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
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

type DepartmentRecord = {
    id: string
    name: string
    code: string
    isActive: boolean
    isDeleted: boolean
}

type ActivityScanRecord = {
    id: string
    activityId: string
    activityCode: string
    activityTitle: string
    activityType: string
    notes: string
    pointsAwarded: number
    scannedAt?: {
        seconds?: number
        nanoseconds?: number
    } | null
    source?: string
    userEmail: string
    userId: string
    userName: string
    userDepartmentId?: string
}

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#84cc16", "#f59e0b", "#8b5cf6", "#ef4444"]

export default function AdminAnalyticsPage() {
    const [users, setUsers] = useState<WorkspaceUser[]>([])
    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [scans, setScans] = useState<ActivityScanRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAnalyticsData()
    }, [])

    async function loadAnalyticsData() {
        try {
            setLoading(true)

            const [usersSnap, departmentsSnap, scansSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "departments")),
                getDocs(collection(db, "activity_scans")),
            ])

            const userRows: WorkspaceUser[] = usersSnap.docs
                .map((docSnap): WorkspaceUser => {
                    const data = docSnap.data() as Record<string, unknown>

                    const role: WorkspaceUser["role"] =
                        data.role === "super_admin" ||
                            data.role === "department_head" ||
                            data.role === "employee"
                            ? data.role
                            : ""

                    const status: WorkspaceUser["status"] =
                        data.status === "active" ||
                            data.status === "inactive" ||
                            data.status === "suspended"
                            ? data.status
                            : ""

                    return {
                        id: docSnap.id,
                        name: typeof data.name === "string" ? data.name : "",
                        email: typeof data.email === "string" ? data.email : "",
                        role,
                        departmentId:
                            typeof data.departmentId === "string" ? data.departmentId : "",
                        departmentName:
                            typeof data.departmentName === "string"
                                ? data.departmentName
                                : "",
                        status,
                        totalPoints:
                            typeof data.totalPoints === "number" ? data.totalPoints : 0,
                        isDeleted:
                            typeof data.isDeleted === "boolean" ? data.isDeleted : false,
                    }
                })
                .filter((user) => !user.isDeleted)

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs
                .map((docSnap): DepartmentRecord => {
                    const data = docSnap.data() as Record<string, unknown>

                    return {
                        id: docSnap.id,
                        name: typeof data.name === "string" ? data.name : "",
                        code: typeof data.code === "string" ? data.code : "",
                        isActive:
                            typeof data.isActive === "boolean" ? data.isActive : true,
                        isDeleted:
                            typeof data.isDeleted === "boolean" ? data.isDeleted : false,
                    }
                })
                .filter((department) => !department.isDeleted)

            const scanRows: ActivityScanRecord[] = scansSnap.docs.map(
                (docSnap): ActivityScanRecord => {
                    const data = docSnap.data() as Record<string, unknown>

                    const scannedAtValue =
                        typeof data.scannedAt === "object" && data.scannedAt !== null
                            ? (data.scannedAt as {
                                seconds?: number
                                nanoseconds?: number
                            })
                            : null

                    return {
                        id: docSnap.id,
                        activityId:
                            typeof data.activityId === "string" ? data.activityId : "",
                        activityCode:
                            typeof data.activityCode === "string" ? data.activityCode : "",
                        activityTitle:
                            typeof data.activityTitle === "string"
                                ? data.activityTitle
                                : "",
                        activityType:
                            typeof data.activityType === "string"
                                ? data.activityType
                                : "",
                        notes: typeof data.notes === "string" ? data.notes : "",
                        pointsAwarded:
                            typeof data.pointsAwarded === "number"
                                ? data.pointsAwarded
                                : 0,
                        scannedAt: scannedAtValue,
                        source: typeof data.source === "string" ? data.source : "",
                        userEmail:
                            typeof data.userEmail === "string" ? data.userEmail : "",
                        userId: typeof data.userId === "string" ? data.userId : "",
                        userName:
                            typeof data.userName === "string" ? data.userName : "",
                        userDepartmentId:
                            typeof data.userDepartmentId === "string"
                                ? data.userDepartmentId
                                : "",
                    }
                }
            )

            setUsers(userRows)
            setDepartments(departmentRows)
            setScans(scanRows)
        } catch (error) {
            console.error("Failed to load analytics data:", error)
        } finally {
            setLoading(false)
        }
    }

    const employeeUsers = useMemo(() => {
        return users.filter(
            (user) => user.role === "employee" && user.status === "active"
        )
    }, [users])

    const departmentHeadUsers = useMemo(() => {
        return users.filter(
            (user) => user.role === "department_head" && user.status === "active"
        )
    }, [users])

    const leaderboard = useMemo(() => {
        return [...users]
            .filter(
                (user) =>
                    user.role !== "super_admin" &&
                    user.status === "active"
            )
            .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name))
    }, [users])

    const recentScans = useMemo(() => {
        return [...scans]
            .sort((a, b) => {
                const aSeconds = a.scannedAt?.seconds ?? 0
                const bSeconds = b.scannedAt?.seconds ?? 0
                return bSeconds - aSeconds
            })
            .slice(0, 8)
    }, [scans])

    const stats = useMemo(() => {
        const activeDepartments = departments.filter((department) => department.isActive).length
        const totalEmployees = employeeUsers.length
        const totalHeads = departmentHeadUsers.length
        const totalScans = scans.length
        const totalPoints = leaderboard.reduce((sum, user) => sum + user.totalPoints, 0)

        return {
            activeDepartments,
            totalEmployees,
            totalHeads,
            totalScans,
            totalPoints,
        }
    }, [departments, departmentHeadUsers.length, employeeUsers.length, leaderboard, scans])

    const topLeaderboardChart = useMemo(() => {
        return leaderboard.slice(0, 8).map((user) => ({
            name: user.name || "Unknown",
            points: user.totalPoints,
        }))
    }, [leaderboard])

    const departmentPointsChart = useMemo(() => {
        return departments
            .filter((department) => department.isActive)
            .map((department) => {
                const members = users.filter(
                    (user) =>
                        user.departmentId === department.id &&
                        user.role !== "super_admin" &&
                        user.status === "active"
                )

                const totalPoints = members.reduce(
                    (sum, member) => sum + member.totalPoints,
                    0
                )

                return {
                    name: department.name || department.code || "Department",
                    points: totalPoints,
                    members: members.length,
                }
            })
            .sort((a, b) => b.points - a.points)
    }, [departments, users])

    const activityTypeChart = useMemo(() => {
        const grouped = scans.reduce<Record<string, number>>((acc, scan) => {
            const key = formatActivityType(scan.activityType)
            acc[key] = (acc[key] ?? 0) + 1
            return acc
        }, {})

        return Object.entries(grouped).map(([name, value]) => ({
            name,
            value,
        }))
    }, [scans])

    const scanTrendChart = useMemo(() => {
        const grouped = scans.reduce<Record<string, number>>((acc, scan) => {
            const seconds = scan.scannedAt?.seconds
            if (!seconds) return acc

            const date = new Date(seconds * 1000)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

            acc[key] = (acc[key] ?? 0) + 1
            return acc
        }, {})

        return Object.entries(grouped)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-10)
            .map(([date, scansCount]) => ({
                date,
                scans: scansCount,
            }))
    }, [scans])

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#d61f2c_0%,#d61f2c_48%,#d61f2c_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)]">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                            Company leaderboard
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Analytics & Performance
                        </h1>
                        <p className="max-w-2xl text-sm text-white/85 md:text-base">
                            Track company participation, compare departments, and see who is
                            leading the points race across the organization.
                        </p>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        icon={<Building2 className="h-5 w-5" />}
                        label="Active Departments"
                        value={loading ? "..." : String(stats.activeDepartments)}
                        helper="Departments currently running"
                    />
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Employees"
                        value={loading ? "..." : String(stats.totalEmployees)}
                        helper="Active employees in system"
                    />
                    <StatCard
                        icon={<Medal className="h-5 w-5" />}
                        label="Department Heads"
                        value={loading ? "..." : String(stats.totalHeads)}
                        helper="Active leaders assigned"
                    />
                    <StatCard
                        icon={<QrCode className="h-5 w-5" />}
                        label="Total Scans"
                        value={loading ? "..." : String(stats.totalScans)}
                        helper="Recorded activity scans"
                    />
                    <StatCard
                        icon={<Sparkles className="h-5 w-5" />}
                        label="Points Awarded"
                        value={loading ? "..." : String(stats.totalPoints)}
                        helper="Total points in circulation"
                    />
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="p-6">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">Top Performers</h2>
                                <p className="text-sm text-muted-foreground">
                                    Highest point earners in the company
                                </p>
                            </div>
                            <div className="text-slate-500">
                                <Trophy className="h-5 w-5" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                Loading chart...
                            </div>
                        ) : topLeaderboardChart.length === 0 ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                No leaderboard data available yet.
                            </div>
                        ) : (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topLeaderboardChart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="points" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">Activity Type Mix</h2>
                                <p className="text-sm text-muted-foreground">
                                    Distribution of scans by activity type
                                </p>
                            </div>
                            <div className="text-slate-500">
                                <PieChartIcon className="h-5 w-5" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                Loading chart...
                            </div>
                        ) : activityTypeChart.length === 0 ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                No activity data available yet.
                            </div>
                        ) : (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={activityTypeChart}
                                            dataKey="value"
                                            nameKey="name"
                                            outerRadius={100}
                                            innerRadius={55}
                                            paddingAngle={3}
                                        >
                                            {activityTypeChart.map((entry, index) => (
                                                <Cell
                                                    key={`${entry.name}-${index}`}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </SurfaceCard>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="p-6">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">Department Points</h2>
                                <p className="text-sm text-muted-foreground">
                                    Compare departments by total points earned
                                </p>
                            </div>
                            <div className="text-slate-500">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                Loading chart...
                            </div>
                        ) : departmentPointsChart.length === 0 ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                No department point data available yet.
                            </div>
                        ) : (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentPointsChart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="points" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">Scan Trend</h2>
                                <p className="text-sm text-muted-foreground">
                                    Recent scan activity over time
                                </p>
                            </div>
                            <div className="text-slate-500">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                Loading chart...
                            </div>
                        ) : scanTrendChart.length === 0 ? (
                            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                                No scan trend data available yet.
                            </div>
                        ) : (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={scanTrendChart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="scans"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </SurfaceCard>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <SurfaceCard className="overflow-hidden">
                        <div className="border-b px-5 py-4 md:px-6">
                            <h2 className="text-lg font-semibold">Overall Leaderboard</h2>
                            <p className="text-sm text-muted-foreground">
                                Top point earners across all active users in the company.
                            </p>
                        </div>

                        {loading ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                Loading leaderboard...
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                No leaderboard data available yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left">
                                    <thead className="bg-[var(--surface)]">
                                        <tr className="text-sm text-muted-foreground">
                                            <th className="px-5 py-4 font-medium md:px-6">Rank</th>
                                            <th className="px-5 py-4 font-medium">User</th>
                                            <th className="px-5 py-4 font-medium">Role</th>
                                            <th className="px-5 py-4 font-medium">Department</th>
                                            <th className="px-5 py-4 font-medium text-right md:px-6">
                                                Points
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((user, index) => (
                                            <tr key={user.id} className="border-t align-top">
                                                <td className="px-5 py-4 md:px-6">
                                                    <RankBadge rank={index + 1} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {user.name || "Unnamed user"}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {user.email || "No email"}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-sm">
                                                    {formatRole(user.role)}
                                                </td>
                                                <td className="px-5 py-4 text-sm">
                                                    {user.departmentName || "Not assigned"}
                                                </td>
                                                <td className="px-5 py-4 text-right text-sm font-semibold md:px-6">
                                                    {user.totalPoints}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SurfaceCard>

                    <SurfaceCard className="overflow-hidden">
                        <div className="border-b px-5 py-4 md:px-6">
                            <h2 className="text-lg font-semibold">Recent Scan Activity</h2>
                            <p className="text-sm text-muted-foreground">
                                Latest recorded activity across the company.
                            </p>
                        </div>

                        {loading ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                Loading recent activity...
                            </div>
                        ) : recentScans.length === 0 ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                No recent scans have been recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {recentScans.map((scan) => (
                                    <RecentScanRow
                                        key={scan.id}
                                        title={scan.activityTitle || "Untitled activity"}
                                        userName={scan.userName || "Unknown user"}
                                        points={scan.pointsAwarded}
                                        date={formatScanDate(scan.scannedAt)}
                                    />
                                ))}
                            </div>
                        )}
                    </SurfaceCard>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <MiniCard
                        icon={<Trophy className="h-5 w-5" />}
                        title="Top performer"
                        text={
                            loading
                                ? "Loading..."
                                : leaderboard[0]
                                    ? `${leaderboard[0].name} is currently leading with ${leaderboard[0].totalPoints} points.`
                                    : "No top performer yet."
                        }
                    />
                    <MiniCard
                        icon={<Building2 className="h-5 w-5" />}
                        title="Top department"
                        text={
                            loading
                                ? "Loading..."
                                : departmentPointsChart[0]
                                    ? `${departmentPointsChart[0].name} currently leads on total points.`
                                    : "No top department yet."
                        }
                    />
                    <MiniCard
                        icon={<Activity className="h-5 w-5" />}
                        title="Participation insight"
                        text={
                            loading
                                ? "Loading..."
                                : stats.totalScans > 0
                                    ? `${stats.totalScans} total scans have been recorded so far across the company.`
                                    : "Participation data will appear once scanning begins."
                        }
                    />
                </div>
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

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                #1
            </span>
        )
    }

    if (rank === 2) {
        return (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                #2
            </span>
        )
    }

    if (rank === 3) {
        return (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                #3
            </span>
        )
    }

    return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            #{rank}
        </span>
    )
}

function RecentScanRow({
    title,
    userName,
    points,
    date,
}: {
    title: string
    userName: string
    points: number
    date: string
}) {
    return (
        <div className="border-t px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">
                        {userName} · {date}
                    </p>
                </div>
                <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    +{points}
                </span>
            </div>
        </div>
    )
}

function MiniCard({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode
    title: string
    text: string
}) {
    return (
        <SurfaceCard className="p-5">
            <div className="flex items-center gap-3">
                <div className="text-slate-500">{icon}</div>
                <p className="text-sm font-semibold">{title}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{text}</p>
        </SurfaceCard>
    )
}

function formatRole(role: WorkspaceUser["role"]) {
    if (role === "super_admin") return "Super Admin"
    if (role === "department_head") return "Department Head"
    if (role === "employee") return "Employee"
    return "Unknown"
}

function formatActivityType(type: string) {
    if (type === "check_in") return "Check-in"
    if (type === "check_out") return "Check-out"
    if (type === "meeting") return "Meeting"
    if (type === "training") return "Training"
    if (type === "general") return "General"
    return "Other"
}

function formatScanDate(
    scannedAt?: {
        seconds?: number
        nanoseconds?: number
    } | null
) {
    const seconds = scannedAt?.seconds
    if (!seconds) return "Unknown date"
    return new Date(seconds * 1000).toLocaleString()
}