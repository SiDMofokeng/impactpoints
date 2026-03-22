"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Gift, Lock, Sparkles, Ticket } from "lucide-react"

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
            setRewards(rewardRows)
        } catch (error) {
            console.error("Failed to load employee rewards:", error)
        } finally {
            setLoading(false)
        }
    }

    const totalPoints = userRecord?.totalPoints ?? 0

    const claimableRewards = useMemo(() => {
        return [...rewards]
            .filter((reward) => reward.pointsRequired <= totalPoints)
            .sort((a, b) => a.pointsRequired - b.pointsRequired)
    }, [rewards, totalPoints])

    const lockedRewards = useMemo(() => {
        return [...rewards]
            .filter((reward) => reward.pointsRequired > totalPoints)
            .sort((a, b) => a.pointsRequired - b.pointsRequired)
    }, [rewards, totalPoints])

    const nextReward = lockedRewards[0] ?? null

    return (
        <RequireRole allowedRoles={["employee"]}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">My rewards</p>
                    <h1 className="text-3xl font-bold tracking-tight">Reward Wallet</h1>
                    <p className="text-muted-foreground">
                        See which rewards you can unlock with your current points and what you
                        are working toward next.
                    </p>
                </div>

                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-lime-500 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
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
                        value={loading ? "..." : String(claimableRewards.length)}
                        helper="Rewards ready to unlock"
                        icon={<Gift className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Locked"
                        value={loading ? "..." : String(lockedRewards.length)}
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

                <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="overflow-hidden">
                        <div className="border-b px-5 py-4 md:px-6">
                            <h2 className="text-lg font-semibold">Claimable rewards</h2>
                            <p className="text-sm text-muted-foreground">
                                Rewards you have enough points to unlock right now.
                            </p>
                        </div>

                        {loading ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                Loading rewards...
                            </div>
                        ) : claimableRewards.length === 0 ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                You have not unlocked any rewards yet.
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {claimableRewards.map((reward) => (
                                    <RewardRow
                                        key={reward.id}
                                        reward={reward}
                                        statusLabel="Claimable"
                                        statusTone="green"
                                        helperText="You have enough points for this reward."
                                    />
                                ))}
                            </div>
                        )}
                    </SurfaceCard>

                    <SurfaceCard className="overflow-hidden">
                        <div className="border-b px-5 py-4 md:px-6">
                            <h2 className="text-lg font-semibold">Locked rewards</h2>
                            <p className="text-sm text-muted-foreground">
                                Rewards you can unlock by earning more points.
                            </p>
                        </div>

                        {loading ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                Loading rewards...
                            </div>
                        ) : lockedRewards.length === 0 ? (
                            <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                                All current active rewards are already within your reach.
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {lockedRewards.map((reward) => (
                                    <RewardRow
                                        key={reward.id}
                                        reward={reward}
                                        statusLabel={`${reward.pointsRequired - totalPoints} pts left`}
                                        statusTone="slate"
                                        helperText="Keep scanning activities to unlock this reward."
                                    />
                                ))}
                            </div>
                        )}
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

function RewardRow({
    reward,
    statusLabel,
    statusTone,
    helperText,
}: {
    reward: RewardRecord
    statusLabel: string
    statusTone: "green" | "slate"
    helperText: string
}) {
    const badgeClass =
        statusTone === "green"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-slate-200 bg-slate-100 text-slate-700"

    return (
        <div className="border-t px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                            {reward.title || "Untitled reward"}
                        </p>
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {formatRewardType(reward.type)}
                        </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {reward.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{reward.pointsRequired} points required</span>
                        <span>
                            {reward.stock === 0 ? "Unlimited stock" : `Stock: ${reward.stock}`}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{helperText}</p>
                </div>

                <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}
                >
                    {statusLabel}
                </span>
            </div>
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