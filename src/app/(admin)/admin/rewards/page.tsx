"use client"

import { useEffect, useMemo, useState } from "react"
import {
    addDoc,
    collection,
    doc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore"
import {
    Gift,
    Pencil,
    Plus,
    Power,
    Search,
    ShieldCheck,
    Ticket,
    Wallet,
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
    createdAt?: unknown
    updatedAt?: unknown
}

const REWARD_TYPE_OPTIONS: Array<{ label: string; value: RewardType | "all" }> = [
    { label: "All types", value: "all" },
    { label: "Voucher", value: "voucher" },
    { label: "Meal", value: "meal" },
    { label: "Time Off", value: "time_off" },
    { label: "Airtime", value: "airtime" },
    { label: "Gift", value: "gift" },
    { label: "Cash Bonus", value: "cash_bonus" },
    { label: "Experience", value: "experience" },
    { label: "Other", value: "other" },
]

export default function AdminRewardsPage() {
    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<RewardType | "all">("all")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

    const [createOpen, setCreateOpen] = useState(false)
    const [createTitle, setCreateTitle] = useState("")
    const [createType, setCreateType] = useState<RewardType>("voucher")
    const [createPointsRequired, setCreatePointsRequired] = useState("")
    const [createDescription, setCreateDescription] = useState("")
    const [createStock, setCreateStock] = useState("0")
    const [createIsActive, setCreateIsActive] = useState(true)
    const [createError, setCreateError] = useState("")
    const [saving, setSaving] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [editingRewardId, setEditingRewardId] = useState("")
    const [editTitle, setEditTitle] = useState("")
    const [editType, setEditType] = useState<RewardType>("voucher")
    const [editPointsRequired, setEditPointsRequired] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editStock, setEditStock] = useState("0")
    const [editIsActive, setEditIsActive] = useState(true)
    const [editError, setEditError] = useState("")
    const [editSaving, setEditSaving] = useState(false)

    useEffect(() => {
        loadRewards()
    }, [])

    async function loadRewards() {
        try {
            setLoading(true)

            const rewardsSnap = await getDocs(collection(db, "rewards"))

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
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            setRewards(rewardRows)
        } catch (error) {
            console.error("Failed to load rewards:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredRewards = useMemo(() => {
        return rewards.filter((reward) => {
            const matchesSearch =
                search.trim() === "" ||
                reward.title.toLowerCase().includes(search.toLowerCase()) ||
                reward.description.toLowerCase().includes(search.toLowerCase()) ||
                formatRewardType(reward.type).toLowerCase().includes(search.toLowerCase())

            const matchesType = typeFilter === "all" || reward.type === typeFilter
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && reward.isActive) ||
                (statusFilter === "inactive" && !reward.isActive)

            return matchesSearch && matchesType && matchesStatus
        })
    }, [rewards, search, typeFilter, statusFilter])

    const stats = useMemo(() => {
        return {
            totalRewards: rewards.length,
            activeRewards: rewards.filter((reward) => reward.isActive).length,
            inactiveRewards: rewards.filter((reward) => !reward.isActive).length,
            limitedStockRewards: rewards.filter((reward) => reward.stock > 0).length,
        }
    }, [rewards])

    function resetCreateForm() {
        setCreateTitle("")
        setCreateType("voucher")
        setCreatePointsRequired("")
        setCreateDescription("")
        setCreateStock("0")
        setCreateIsActive(true)
        setCreateError("")
    }

    function handleCloseCreate() {
        if (saving) return
        setCreateOpen(false)
        resetCreateForm()
    }

    async function handleCreateReward() {
        const trimmedTitle = createTitle.trim()
        const trimmedDescription = createDescription.trim()
        const pointsRequiredNumber = Number(createPointsRequired)
        const stockNumber = Number(createStock)

        if (!trimmedTitle) {
            setCreateError("Reward title is required.")
            return
        }

        if (
            !createPointsRequired ||
            Number.isNaN(pointsRequiredNumber) ||
            pointsRequiredNumber <= 0
        ) {
            setCreateError("Points required must be greater than 0.")
            return
        }

        if (createStock === "" || Number.isNaN(stockNumber) || stockNumber < 0) {
            setCreateError("Stock must be 0 or more.")
            return
        }

        setCreateError("")
        setSaving(true)

        try {
            await addDoc(collection(db, "rewards"), {
                title: trimmedTitle,
                description: trimmedDescription,
                type: createType,
                pointsRequired: pointsRequiredNumber,
                stock: stockNumber,
                isActive: createIsActive,
                approvalMode: "auto",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            handleCloseCreate()
            await loadRewards()
        } catch (error) {
            console.error("Failed to create reward:", error)
            setCreateError("Failed to create reward. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    function handleOpenEdit(reward: RewardRecord) {
        setEditingRewardId(reward.id)
        setEditTitle(reward.title)
        setEditType((reward.type || "voucher") as RewardType)
        setEditPointsRequired(String(reward.pointsRequired))
        setEditDescription(reward.description)
        setEditStock(String(reward.stock))
        setEditIsActive(reward.isActive)
        setEditError("")
        setEditOpen(true)
    }

    function resetEditForm() {
        setEditingRewardId("")
        setEditTitle("")
        setEditType("voucher")
        setEditPointsRequired("")
        setEditDescription("")
        setEditStock("0")
        setEditIsActive(true)
        setEditError("")
    }

    function handleCloseEdit() {
        if (editSaving) return
        setEditOpen(false)
        resetEditForm()
    }

    async function handleSaveEdit() {
        const trimmedTitle = editTitle.trim()
        const trimmedDescription = editDescription.trim()
        const pointsRequiredNumber = Number(editPointsRequired)
        const stockNumber = Number(editStock)

        if (!editingRewardId) {
            setEditError("No reward selected.")
            return
        }

        if (!trimmedTitle) {
            setEditError("Reward title is required.")
            return
        }

        if (
            !editPointsRequired ||
            Number.isNaN(pointsRequiredNumber) ||
            pointsRequiredNumber <= 0
        ) {
            setEditError("Points required must be greater than 0.")
            return
        }

        if (editStock === "" || Number.isNaN(stockNumber) || stockNumber < 0) {
            setEditError("Stock must be 0 or more.")
            return
        }

        setEditError("")
        setEditSaving(true)

        try {
            const rewardRef = doc(db, "rewards", editingRewardId)

            await updateDoc(rewardRef, {
                title: trimmedTitle,
                description: trimmedDescription,
                type: editType,
                pointsRequired: pointsRequiredNumber,
                stock: stockNumber,
                isActive: editIsActive,
                updatedAt: serverTimestamp(),
            })

            handleCloseEdit()
            await loadRewards()
        } catch (error) {
            console.error("Failed to update reward:", error)
            setEditError("Failed to save reward changes. Please try again.")
        } finally {
            setEditSaving(false)
        }
    }

    async function handleToggleRewardStatus(reward: RewardRecord) {
        try {
            const rewardRef = doc(db, "rewards", reward.id)

            await updateDoc(rewardRef, {
                isActive: !reward.isActive,
                updatedAt: serverTimestamp(),
            })

            await loadRewards()
        } catch (error) {
            console.error("Failed to toggle reward status:", error)
        }
    }

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-lime-500 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            Reward management
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Reward Catalog
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Create and manage the rewards employees can unlock with their points,
                            including vouchers, meals, airtime, gifts, experiences, and more.
                        </p>
                    </div>
                </section>

                <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Rewards</p>
                        <h2 className="text-3xl font-bold tracking-tight">Reward Catalog</h2>
                        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                            Create the real rewards employees can claim after reaching the
                            required number of points.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Create reward
                    </button>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<Gift className="h-5 w-5" />}
                        label="Total rewards"
                        value={String(stats.totalRewards)}
                        helper="All claimable rewards"
                    />
                    <StatCard
                        icon={<ShieldCheck className="h-5 w-5" />}
                        label="Active rewards"
                        value={String(stats.activeRewards)}
                        helper="Available for claiming"
                    />
                    <StatCard
                        icon={<Ticket className="h-5 w-5" />}
                        label="Inactive rewards"
                        value={String(stats.inactiveRewards)}
                        helper="Currently disabled"
                    />
                    <StatCard
                        icon={<Wallet className="h-5 w-5" />}
                        label="Limited stock"
                        value={String(stats.limitedStockRewards)}
                        helper="Rewards with stock caps"
                    />
                </section>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by title, type, or description"
                                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reward type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as RewardType | "all")}
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                {REWARD_TYPE_OPTIONS.map((option) => (
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
                        <h2 className="text-lg font-semibold">Reward list</h2>
                        <p className="text-sm text-muted-foreground">
                            Claimable incentives such as vouchers, meals, airtime, gifts, and
                            days off.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading rewards...
                        </div>
                    ) : filteredRewards.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No rewards found yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Reward</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium">Stock</th>
                                        <th className="px-5 py-4 font-medium">Status</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRewards.map((reward) => (
                                        <tr key={reward.id} className="border-t align-top">
                                            <td className="px-5 py-4 md:px-6">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {reward.title || "Untitled reward"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {reward.description || "No description"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <RewardTypeBadge type={reward.type} />
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {reward.pointsRequired}
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {reward.stock === 0 ? "Unlimited" : reward.stock}
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge active={reward.isActive} />
                                            </td>

                                            <td className="px-5 py-4 md:px-6">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <ActionIconButton
                                                        label="Edit reward"
                                                        title="Edit"
                                                        onClick={() => handleOpenEdit(reward)}
                                                        icon={<Pencil className="h-4 w-4" />}
                                                        tone="blue"
                                                    />
                                                    <ActionIconButton
                                                        label={
                                                            reward.isActive
                                                                ? "Deactivate reward"
                                                                : "Activate reward"
                                                        }
                                                        title={reward.isActive ? "Deactivate" : "Activate"}
                                                        onClick={() => handleToggleRewardStatus(reward)}
                                                        icon={<Power className="h-4 w-4" />}
                                                        tone={reward.isActive ? "red" : "green"}
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
                    <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Create Reward
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Add a real reward employees can claim after accumulating enough points.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reward title</label>
                                    <input
                                        value={createTitle}
                                        onChange={(e) => setCreateTitle(e.target.value)}
                                        placeholder="Coffee Voucher"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Reward type</label>
                                        <select
                                            value={createType}
                                            onChange={(e) => setCreateType(e.target.value as RewardType)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="voucher">Voucher</option>
                                            <option value="meal">Meal</option>
                                            <option value="time_off">Time Off</option>
                                            <option value="airtime">Airtime</option>
                                            <option value="gift">Gift</option>
                                            <option value="cash_bonus">Cash Bonus</option>
                                            <option value="experience">Experience</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Points required</label>
                                        <input
                                            value={createPointsRequired}
                                            onChange={(e) => setCreatePointsRequired(e.target.value)}
                                            type="number"
                                            min="1"
                                            placeholder="50"
                                            className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        value={createDescription}
                                        onChange={(e) => setCreateDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Redeem for a free coffee at selected vendors."
                                        className="w-full rounded-[var(--radius-input)] border bg-white px-4 py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Stock</label>
                                        <input
                                            value={createStock}
                                            onChange={(e) => setCreateStock(e.target.value)}
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Use 0 for unlimited stock.
                                        </p>
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
                                    <p className="text-sm font-semibold">Reward summary</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Type</span>
                                            <span className="font-medium text-foreground">
                                                {formatRewardType(createType)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Points required</span>
                                            <span className="font-medium text-foreground">
                                                {createPointsRequired || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Stock</span>
                                            <span className="font-medium text-foreground">
                                                {createStock === "0" ? "Unlimited" : createStock || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Approval</span>
                                            <span className="font-medium text-foreground">
                                                Auto approved
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {createError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {createError}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white px-8 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handleCloseCreate}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateReward}
                                disabled={saving}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? "Creating..." : "Create reward"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Edit Reward
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Update reward details, points, stock, and status.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reward title</label>
                                    <input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Coffee Voucher"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Reward type</label>
                                        <select
                                            value={editType}
                                            onChange={(e) => setEditType(e.target.value as RewardType)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="voucher">Voucher</option>
                                            <option value="meal">Meal</option>
                                            <option value="time_off">Time Off</option>
                                            <option value="airtime">Airtime</option>
                                            <option value="gift">Gift</option>
                                            <option value="cash_bonus">Cash Bonus</option>
                                            <option value="experience">Experience</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Points required</label>
                                        <input
                                            value={editPointsRequired}
                                            onChange={(e) => setEditPointsRequired(e.target.value)}
                                            type="number"
                                            min="1"
                                            placeholder="50"
                                            className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Reward description"
                                        className="w-full rounded-[var(--radius-input)] border bg-white px-4 py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Stock</label>
                                        <input
                                            value={editStock}
                                            onChange={(e) => setEditStock(e.target.value)}
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Use 0 for unlimited stock.
                                        </p>
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

                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Reward summary</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Type</span>
                                            <span className="font-medium text-foreground">
                                                {formatRewardType(editType)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Points required</span>
                                            <span className="font-medium text-foreground">
                                                {editPointsRequired || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Stock</span>
                                            <span className="font-medium text-foreground">
                                                {editStock === "0" ? "Unlimited" : editStock || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Status</span>
                                            <span className="font-medium text-foreground">
                                                {editIsActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {editError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {editError}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white px-8 py-4 sm:flex-row sm:justify-end">
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

function RewardTypeBadge({ type }: { type: RewardType | "" }) {
    return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {formatRewardType(type)}
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

function formatRewardType(type: RewardType | "") {
    if (type === "voucher") return "Voucher"
    if (type === "meal") return "Meal"
    if (type === "time_off") return "Time Off"
    if (type === "airtime") return "Airtime"
    if (type === "gift") return "Gift"
    if (type === "cash_bonus") return "Cash Bonus"
    if (type === "experience") return "Experience"
    if (type === "other") return "Other"
    return "Unknown"
}