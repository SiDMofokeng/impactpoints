"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import {
    Gift,
    Medal,
    QrCode,
    ScanLine,
    Sparkles,
    Target,
    Trophy,
    UserCircle2,
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
}

type ActivityScanRecord = {
    id: string
    activityId: string
    activityCode: string
    activityTitle: string
    activityType: string
    notes: string
    pointsAwarded: number
    scannedAt?: unknown
    source?: string
    userId: string
    userEmail: string
    userName: string
}

export default function EmployeeOverviewPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [userRecord, setUserRecord] = useState<WorkspaceUser | null>(null)
    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [scans, setScans] = useState<ActivityScanRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profileLoading) return
        loadEmployeeDashboard()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile?.email])

    async function loadEmployeeDashboard() {
        try {
            setLoading(true)

            const [usersSnap, rewardsSnap, scansSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "rewards")),
                getDocs(collection(db, "activity_scans")),
            ])

            const normalizedEmail = (profile?.email ?? "").toLowerCase()

            const currentUser =
                usersSnap.docs
                    .map((docSnap) => {
                        const data = docSnap.data() as Partial<WorkspaceUser>

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
                            totalPoints:
                                typeof data.totalPoints === "number" ? data.totalPoints : 0,
                            isDeleted: data.isDeleted ?? false,
                        }
                    })
                    .find(
                        (user) =>
                            !user.isDeleted &&
                            user.email.toLowerCase() === normalizedEmail
                    ) ?? null

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
                }
            })

            const scanRows: ActivityScanRecord[] = scansSnap.docs
                .map((docSnap) => {
                    const data = docSnap.data() as Partial<ActivityScanRecord>

                    return {
                        id: docSnap.id,
                        activityId: data.activityId ?? "",
                        activityCode: data.activityCode ?? "",
                        activityTitle: data.activityTitle ?? "",
                        activityType: data.activityType ?? "",
                        notes: data.notes ?? "",
                        pointsAwarded:
                            typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
                        scannedAt: data.scannedAt,
                        source: data.source ?? "",
                        userId: data.userId ?? "",
                        userEmail: data.userEmail ?? "",
                        userName: data.userName ?? "",
                    }
                })
                .filter((scan) => scan.userEmail.toLowerCase() === normalizedEmail)

            setUserRecord(currentUser)
            setRewards(rewardRows.filter((reward) => reward.isActive))
            setScans(scanRows)
        } catch (error) {
            console.error("Failed to load employee dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    const totalPoints = userRecord?.totalPoints ?? 0

    const nextReward = useMemo(() => {
        const sorted = [...rewards]
            .filter((reward) => reward.pointsRequired > totalPoints)
            .sort((a, b) => a.pointsRequired - b.pointsRequired)

        return sorted[0] ?? null
    }, [rewards, totalPoints])

    const claimableRewards = useMemo(() => {
        return rewards.filter((reward) => reward.pointsRequired <= totalPoints).length
    }, [rewards, totalPoints])

    const recentScans = useMemo(() => {
        return [...scans].slice(0, 5)
    }, [scans])

    const scanCount = scans.length

    const progressPercent = useMemo(() => {
        if (!nextReward) return 100
        if (nextReward.pointsRequired <= 0) return 0
        return Math.min(100, Math.round((totalPoints / nextReward.pointsRequired) * 100))
    }, [nextReward, totalPoints])

    const pointsToNextReward = nextReward
        ? Math.max(nextReward.pointsRequired - totalPoints, 0)
        : 0

    return (
        <RequireRole allowedRoles={["employee"]}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">My progress</p>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {profileLoading ? "..." : (profile?.name ?? "Employee")}
                    </h1>
                    <p className="text-muted-foreground">
                        Track your points, rewards, scans, and achievements in one place.
                    </p>
                </div>

                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-lime-500 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            My rewards dashboard
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Keep earning. Keep unlocking.
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Scan activities, grow your points, and work your way toward real
                            rewards like vouchers, meals, airtime, and time off.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Total Points"
                        value={loading ? "..." : String(totalPoints)}
                        helper="Points earned so far"
                        icon={<Sparkles className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="My Scans"
                        value={loading ? "..." : String(scanCount)}
                        helper="Recorded activity scans"
                        icon={<ScanLine className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Claimable Rewards"
                        value={loading ? "..." : String(claimableRewards)}
                        helper="Rewards you can unlock now"
                        icon={<Gift className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Next Reward"
                        value={
                            loading
                                ? "..."
                                : nextReward
                                    ? String(pointsToNextReward)
                                    : "0"
                        }
                        helper={
                            loading
                                ? "Loading milestone"
                                : nextReward
                                    ? "Points remaining"
                                    : "All current rewards reached"
                        }
                        icon={<Target className="h-5 w-5" />}
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <SurfaceCard className="p-6">
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Progress
                                </p>
                                <h2 className="text-xl font-semibold">Milestone journey</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                {loading ? (
                                    <p className="text-sm text-muted-foreground">
                                        Loading progress...
                                    </p>
                                ) : nextReward ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            {progressPercent}% toward {nextReward.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            You need {pointsToNextReward} more points to unlock this
                                            reward at {nextReward.pointsRequired} points.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        You have reached all currently available active rewards.
                                    </p>
                                )}
                            </div>

                            {nextReward ? (
                                <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {nextReward.title}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {nextReward.description || "No description provided."}
                                            </p>
                                        </div>
                                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                            {formatRewardType(nextReward.type)}
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Account
                                </p>
                                <h2 className="text-xl font-semibold">Current profile</h2>
                            </div>

                            <div className="space-y-3 text-sm">
                                <InfoRow
                                    label="Name"
                                    value={profile?.name ?? userRecord?.name ?? "Unknown"}
                                />
                                <InfoRow
                                    label="Email"
                                    value={profile?.email ?? userRecord?.email ?? "Unknown"}
                                />
                                <InfoRow
                                    label="Role"
                                    value={formatRole(profile?.role ?? userRecord?.role ?? "")}
                                />
                                <InfoRow
                                    label="Department"
                                    value={userRecord?.departmentName || "Not assigned"}
                                />
                                <InfoRow
                                    label="Status"
                                    value={formatStatus(userRecord?.status ?? "")}
                                />
                            </div>
                        </div>
                    </SurfaceCard>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        My activity
                                    </p>
                                    <h2 className="text-xl font-semibold">Recent scans</h2>
                                </div>
                                <div className="text-slate-500">
                                    <QrCode className="h-5 w-5" />
                                </div>
                            </div>

                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading scans...</p>
                            ) : recentScans.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No scans recorded yet. Start by scanning an activity QR code.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentScans.map((scan) => (
                                        <div
                                            key={scan.id}
                                            className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {scan.activityTitle || "Untitled activity"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {scan.activityCode || "No code"} ·{" "}
                                                        {formatActivityType(scan.activityType)}
                                                    </p>
                                                    {scan.notes ? (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            Note: {scan.notes}
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                                    +{scan.pointsAwarded}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Rewards
                                    </p>
                                    <h2 className="text-xl font-semibold">Available rewards</h2>
                                </div>
                                <div className="text-slate-500">
                                    <Trophy className="h-5 w-5" />
                                </div>
                            </div>

                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading rewards...</p>
                            ) : rewards.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No rewards are available yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {rewards.slice(0, 4).map((reward) => {
                                        const unlocked = totalPoints >= reward.pointsRequired

                                        return (
                                            <div
                                                key={reward.id}
                                                className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {reward.title || "Untitled reward"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {reward.description || "No description"}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={
                                                            unlocked
                                                                ? "inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                                : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                                        }
                                                    >
                                                        {unlocked
                                                            ? "Unlocked"
                                                            : `${reward.pointsRequired} pts`}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </SurfaceCard>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <MiniInfoCard
                        icon={<Medal className="h-5 w-5" />}
                        title="Badges"
                        text="Badge logic can be added next based on milestones or streaks."
                    />
                    <MiniInfoCard
                        icon={<UserCircle2 className="h-5 w-5" />}
                        title="Department"
                        text={userRecord?.departmentName || "No department linked yet."}
                    />
                    <MiniInfoCard
                        icon={<Gift className="h-5 w-5" />}
                        title="Reward focus"
                        text={
                            nextReward
                                ? `Your next target is ${nextReward.title}.`
                                : "You have reached all active rewards."
                        }
                    />
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

function MiniInfoCard({
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

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    )
}

function formatRole(role: string) {
    if (role === "super_admin") return "Super Admin"
    if (role === "department_head") return "Department Head"
    if (role === "employee") return "Employee"
    return "Unknown"
}

function formatStatus(status: string) {
    if (status === "active") return "Active"
    if (status === "inactive") return "Inactive"
    if (status === "suspended") return "Suspended"
    return "Unknown"
}

function formatRewardType(type: RewardType | "") {
    if (type === "voucher") return "Voucher"
    if (type === "meal") return "Meal"
    if (type === "time_off") return "Time Off"
    if (type === "airtime") return "Airtime"
    if (type === "gift") return "Gift"
    if (type === "cash_bonus") return "Cash Bonus"
    if (type === "experience") return "Experience"
    if (type === "other") return "Other"
    return "Reward"
}

function formatActivityType(type: string) {
    if (type === "check_in") return "Check-in"
    if (type === "check_out") return "Check-out"
    if (type === "meeting") return "Meeting"
    if (type === "training") return "Training"
    if (type === "general") return "General"
    return "Activity"
}