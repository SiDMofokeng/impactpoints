"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import {
    Gift,
    LayoutGrid,
    Lock,
    Sparkles,
    Table2,
    Ticket,
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

export default function EmployeeRewardsPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [userRecord, setUserRecord] = useState<WorkspaceUser | null>(null)
    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<"table" | "cards">("table")

    useEffect(() => {
        if (profileLoading) return
        loadRewardsPageData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile?.email])

    async function loadRewardsPageData() {
        try {
            setLoading(true)

            const [usersSnap, rewardsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "rewards")),
            ])

            const normalizedEmail = (profile?.email ?? "").toLowerCase()

            const currentUser: WorkspaceUser | null =
                usersSnap.docs
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
                    .find(
                        (user) =>
                            !user.isDeleted &&
                            user.email.toLowerCase() === normalizedEmail
                    ) ?? null

            const rewardRows: RewardRecord[] = rewardsSnap.docs
                .map((docSnap): RewardRecord => {
                    const data = docSnap.data() as Record<string, unknown>

                    const rewardType: RewardRecord["type"] =
                        data.type === "voucher" ||
                            data.type === "meal" ||
                            data.type === "time_off" ||
                            data.type === "airtime" ||
                            data.type === "gift" ||
                            data.type === "cash_bonus" ||
                            data.type === "experience" ||
                            data.type === "other"
                            ? data.type
                            : ""

                    return {
                        id: docSnap.id,
                        title: typeof data.title === "string" ? data.title : "",
                        description:
                            typeof data.description === "string" ? data.description : "",
                        type: rewardType,
                        pointsRequired:
                            typeof data.pointsRequired === "number"
                                ? data.pointsRequired
                                : 0,
                        stock: typeof data.stock === "number" ? data.stock : 0,
                        isActive:
                            typeof data.isActive === "boolean" ? data.isActive : true,
                    }
                })
                .filter((reward) => reward.isActive)

            setUserRecord(currentUser)
            setRewards(
                rewardRows.sort((a, b) => a.pointsRequired - b.pointsRequired)
            )
        } catch (error) {
            console.error("Failed to load employee rewards:", error)
        } finally {
            setLoading(false)
        }
    }

    const totalPoints = userRecord?.totalPoints ?? 0

    const claimableRewards = useMemo(() => {
        return rewards.filter((reward) => reward.pointsRequired <= totalPoints).length
    }, [rewards, totalPoints])

    const lockedRewards = useMemo(() => {
        return rewards.filter((reward) => reward.pointsRequired > totalPoints).length
    }, [rewards, totalPoints])

    const nextReward = useMemo(() => {
        return rewards.find((reward) => reward.pointsRequired > totalPoints) ?? null
    }, [rewards, totalPoints])

    return (
        <RequireRole allowedRoles={["employee"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] border bg-[linear-gradient(135deg,#d61f2c_0%,#d61f2c_48%,#d61f2c_100%)] px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            My reward progress
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            You currently have {loading ? "..." : totalPoints} points
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Use your points to unlock real rewards like vouchers, meals,
                            airtime, gifts, and time off.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="My Points"
                        value={loading ? "..." : String(totalPoints)}
                        helper="Current available points"
                        icon={<Sparkles className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Claimable"
                        value={loading ? "..." : String(claimableRewards)}
                        helper="Rewards ready to unlock"
                        icon={<Gift className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Locked"
                        value={loading ? "..." : String(lockedRewards)}
                        helper="Rewards still in progress"
                        icon={<Lock className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Next Reward"
                        value={
                            loading
                                ? "..."
                                : nextReward
                                    ? String(nextReward.pointsRequired - totalPoints)
                                    : "0"
                        }
                        helper={
                            loading
                                ? "Loading next reward"
                                : nextReward
                                    ? "Points remaining"
                                    : "Nothing pending"
                        }
                        icon={<Ticket className="h-5 w-5" />}
                    />
                </div>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Rewards
                            </p>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Reward list
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                View every reward, your progress toward it, and claim it when fully unlocked.
                            </p>
                        </div>

                        <div className="inline-flex rounded-[var(--radius-input)] border bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={
                                    viewMode === "table"
                                        ? "inline-flex items-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
                                        : "inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                                }
                            >
                                <Table2 className="h-4 w-4" />
                                Table
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("cards")}
                                className={
                                    viewMode === "cards"
                                        ? "inline-flex items-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
                                        : "inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                                }
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Cards
                            </button>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">All rewards</h2>
                        <p className="text-sm text-muted-foreground">
                            Rewards unlock as your points grow. Claim becomes available once a reward is fully reached.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading rewards...
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No rewards are available yet.
                        </div>
                    ) : viewMode === "table" ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Reward</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium">Progress</th>
                                        <th className="px-5 py-4 font-medium">Status</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rewards.map((reward) => {
                                        const pointsGained = Math.min(totalPoints, reward.pointsRequired)
                                        const pointsLeft = Math.max(reward.pointsRequired - totalPoints, 0)
                                        const progressPercent =
                                            reward.pointsRequired > 0
                                                ? Math.min(
                                                    100,
                                                    Math.round((pointsGained / reward.pointsRequired) * 100)
                                                )
                                                : 0
                                        const isClaimable = totalPoints >= reward.pointsRequired

                                        return (
                                            <tr key={reward.id} className="border-t align-top">
                                                <td className="px-5 py-4 md:px-6">
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {reward.title || "Untitled reward"}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {reward.description || "No description provided."}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                        {formatRewardType(reward.type)}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-sm">
                                                    <div className="space-y-1">
                                                        <p className="font-medium">
                                                            {pointsGained} / {reward.pointsRequired}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {pointsLeft === 0
                                                                ? "Fully unlocked"
                                                                : `${pointsLeft} pts left`}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 min-w-[240px]">
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                                                            <div
                                                                className={
                                                                    isClaimable
                                                                        ? "h-full rounded-full bg-green-500 transition-all"
                                                                        : "h-full rounded-full bg-[var(--primary)] transition-all"
                                                                }
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {progressPercent}% complete
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={
                                                            isClaimable
                                                                ? "inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                                : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                                        }
                                                    >
                                                        {isClaimable ? "Claimable" : "Locked"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right md:px-6">
                                                    <button
                                                        type="button"
                                                        disabled={!isClaimable}
                                                        className={
                                                            isClaimable
                                                                ? "inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                                                                : "inline-flex items-center justify-center rounded-[var(--radius-button)] border bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                                                        }
                                                    >
                                                        Claim reward
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
                            {rewards.map((reward) => {
                                const pointsGained = Math.min(totalPoints, reward.pointsRequired)
                                const pointsLeft = Math.max(reward.pointsRequired - totalPoints, 0)
                                const progressPercent =
                                    reward.pointsRequired > 0
                                        ? Math.min(
                                            100,
                                            Math.round((pointsGained / reward.pointsRequired) * 100)
                                        )
                                        : 0
                                const isClaimable = totalPoints >= reward.pointsRequired

                                return (
                                    <RewardCard
                                        key={reward.id}
                                        reward={reward}
                                        pointsGained={pointsGained}
                                        pointsLeft={pointsLeft}
                                        progressPercent={progressPercent}
                                        isClaimable={isClaimable}
                                    />
                                )
                            })}
                        </div>
                    )}
                </SurfaceCard>
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

function RewardCard({
    reward,
    pointsGained,
    pointsLeft,
    progressPercent,
    isClaimable,
}: {
    reward: RewardRecord
    pointsGained: number
    pointsLeft: number
    progressPercent: number
    isClaimable: boolean
}) {
    return (
        <div className="overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-sm transition hover:shadow-md">
            <div className="flex aspect-[16/10] items-center justify-center border-b bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_48%,#ecfccb_100%)]">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-sm">
                    <Gift className="h-10 w-10 text-[var(--primary)]" />
                </div>
            </div>

            <div className="space-y-4 p-5">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">
                            {reward.title || "Untitled reward"}
                        </p>
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {formatRewardType(reward.type)}
                        </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {reward.description || "No description provided."}
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Points gained" value={String(pointsGained)} />
                    <InfoTile label="Points required" value={String(reward.pointsRequired)} />
                    <InfoTile
                        label="Points left"
                        value={pointsLeft === 0 ? "0" : String(pointsLeft)}
                    />
                    <InfoTile
                        label="Stock"
                        value={reward.stock === 0 ? "Unlimited" : String(reward.stock)}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{progressPercent}% complete</span>
                        <span>{isClaimable ? "Fully unlocked" : `${pointsLeft} pts left`}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className={
                                isClaimable
                                    ? "h-full rounded-full bg-green-500 transition-all"
                                    : "h-full rounded-full bg-[var(--primary)] transition-all"
                            }
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <span
                        className={
                            isClaimable
                                ? "inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        }
                    >
                        {isClaimable ? "Claimable" : "Locked"}
                    </span>

                    <button
                        type="button"
                        disabled={!isClaimable}
                        className={
                            isClaimable
                                ? "inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                                : "inline-flex items-center justify-center rounded-[var(--radius-button)] border bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                        }
                    >
                        Claim reward
                    </button>
                </div>
            </div>
        </div>
    )
}

function InfoTile({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-2 text-sm font-semibold">{value}</p>
        </div>
    )
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