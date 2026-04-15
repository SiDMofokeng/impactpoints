"use client"

import { useEffect, useMemo, useState } from "react"
import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore"
import {
    Gift,
    LayoutGrid,
    List,
    Pencil,
    Plus,
    Power,
    Search,
    ShieldAlert,
    ShieldCheck,
    Ticket,
    Wallet,
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
    approvalMode?: string
    allowedDepartments?: string[]
    createdAt?: unknown
    updatedAt?: unknown
}

type DepartmentRecord = {
    id: string
    name: string
    code: string
    isActive: boolean
    isDeleted: boolean
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

export default function HeadRewardsPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [rewards, setRewards] = useState<RewardRecord[]>([])
    const [department, setDepartment] = useState<DepartmentRecord | null>(null)
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<RewardType | "all">("all")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [viewMode, setViewMode] = useState<"table" | "cards">("table")

    const [createOpen, setCreateOpen] = useState(false)
    const [createTitle, setCreateTitle] = useState("")
    const [createType, setCreateType] = useState<RewardType>("voucher")
    const [createPointsRequired, setCreatePointsRequired] = useState("")
    const [createDescription, setCreateDescription] = useState("")
    const [createStock, setCreateStock] = useState("0")
    const [createIsActive, setCreateIsActive] = useState(true)
    const [createError, setCreateError] = useState("")
    const [creating, setCreating] = useState(false)

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

    const departmentId = profile?.departmentId ?? ""

    useEffect(() => {
        if (profileLoading) return

        if (!departmentId) {
            setRewards([])
            setDepartment(null)
            setLoading(false)
            return
        }

        loadDepartmentRewards()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, departmentId])

    async function loadDepartmentRewards() {
        if (!departmentId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)

            const [rewardsSnap, departmentsSnap] = await Promise.all([
                getDocs(collection(db, "rewards")),
                getDocs(query(collection(db, "departments"), where("__name__", "==", departmentId))),
            ])

            const departmentDoc = departmentsSnap.docs[0]

            if (departmentDoc) {
                const departmentData = departmentDoc.data() as Partial<DepartmentRecord>

                setDepartment({
                    id: departmentDoc.id,
                    name: departmentData.name ?? "",
                    code: departmentData.code ?? "",
                    isActive: departmentData.isActive ?? true,
                    isDeleted: departmentData.isDeleted ?? false,
                })
            } else {
                setDepartment(null)
            }

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
                    approvalMode: data.approvalMode ?? "auto",
                    allowedDepartments: Array.isArray(data.allowedDepartments)
                        ? data.allowedDepartments
                        : [],
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const departmentRewards = rewardRows.filter((reward) => {
                const allowedDepartments = Array.isArray(reward.allowedDepartments)
                    ? reward.allowedDepartments
                    : []

                if (allowedDepartments.length === 0) {
                    return true
                }

                return allowedDepartments.includes(departmentId)
            })

            setRewards(departmentRewards)
        } catch (error) {
            console.error("Failed to load department rewards:", error)
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
        if (creating) return
        setCreateOpen(false)
        resetCreateForm()
    }

    async function handleCreateReward() {
        const trimmedTitle = createTitle.trim()
        const trimmedDescription = createDescription.trim()
        const pointsRequiredNumber = Number(createPointsRequired)
        const stockNumber = Number(createStock)

        setCreateError("")

        if (!departmentId) {
            setCreateError("No department is assigned to your profile.")
            return
        }

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

        setCreating(true)

        try {
            await addDoc(collection(db, "rewards"), {
                title: trimmedTitle,
                description: trimmedDescription,
                type: createType,
                pointsRequired: pointsRequiredNumber,
                stock: stockNumber,
                isActive: createIsActive,
                approvalMode: "auto",
                allowedDepartments: [departmentId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            handleCloseCreate()
            await loadDepartmentRewards()
        } catch (error) {
            console.error("Failed to create reward:", error)
            setCreateError("Failed to create reward. Please try again.")
        } finally {
            setCreating(false)
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

        setEditError("")

        if (!editingRewardId) {
            setEditError("No reward selected.")
            return
        }

        if (!departmentId) {
            setEditError("No department is assigned to your profile.")
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
                allowedDepartments: [departmentId],
                updatedAt: serverTimestamp(),
            })

            handleCloseEdit()
            await loadDepartmentRewards()
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

            await loadDepartmentRewards()
        } catch (error) {
            console.error("Failed to toggle reward status:", error)
        }
    }

    return (
        <RequireRole allowedRoles={["department_head"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#d61f2c_0%,#d61f2c_48%,#d61f2c_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)]">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                            Department rewards
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Reward Catalog
                        </h1>
                        <p className="max-w-2xl text-sm text-white/85 md:text-base">
                            Create and manage department rewards for{" "}
                            {department?.name || "your team"}, including point thresholds,
                            stock limits, and reward availability.
                        </p>
                    </div>
                </section>

                <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Rewards</p>
                        <h2 className="text-3xl font-bold tracking-tight">Department Rewards</h2>
                        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                            Create and manage rewards for {department?.name || "your department"}.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        disabled={!departmentId}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Plus className="h-4 w-4" />
                        Create reward
                    </button>
                </section>

                {!departmentId ? (
                    <SurfaceCard className="p-6">
                        <div className="flex items-start gap-3 text-sm text-amber-700">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                Your account is not linked to a department yet. Ask the super admin
                                to assign your department before using this page.
                            </div>
                        </div>
                    </SurfaceCard>
                ) : null}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<Gift className="h-5 w-5" />}
                        label="Total rewards"
                        value={String(stats.totalRewards)}
                        helper="All visible department rewards"
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
                    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">View</label>
                            <div className="flex h-11 items-center rounded-[var(--radius-input)] border bg-white p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("table")}
                                    className={`inline-flex h-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === "table"
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                        }`}
                                >
                                    <List className="h-4 w-4" />
                                    Table
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("cards")}
                                    className={`inline-flex h-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === "cards"
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                        }`}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    Cards
                                </button>
                            </div>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Reward list</h2>
                        <p className="text-sm text-muted-foreground">
                            Rewards available to your department, including global rewards.
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
                    ) : viewMode === "table" ? (
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
                    ) : (
                        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-3">
                            {filteredRewards.map((reward) => (
                                <RewardCard
                                    key={reward.id}
                                    reward={reward}
                                    onEdit={() => handleOpenEdit(reward)}
                                    onToggle={() => handleToggleRewardStatus(reward)}
                                />
                            ))}
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
                                Create a reward for your department.
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
                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Department allocation</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Department</span>
                                            <span className="text-right font-medium text-foreground">
                                                {department?.name || "Not assigned"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Scope</span>
                                            <span className="text-right font-medium text-foreground">
                                                This department only
                                            </span>
                                        </div>
                                    </div>
                                </div>

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
                                disabled={creating}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {creating ? "Creating..." : "Create reward"}
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
                                Update department reward details.
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
                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Department allocation</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Department</span>
                                            <span className="text-right font-medium text-foreground">
                                                {department?.name || "Not assigned"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Scope</span>
                                            <span className="text-right font-medium text-foreground">
                                                This department only
                                            </span>
                                        </div>
                                    </div>
                                </div>

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

function RewardCard({
    reward,
    onEdit,
    onToggle,
}: {
    reward: RewardRecord
    onEdit: () => void
    onToggle: () => void
}) {
    return (
        <div className="overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-sm transition hover:shadow-md">
            <div className="flex aspect-[16/10] items-center justify-center border-b bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_48%,#ecfccb_100%)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-sm">
                    <Gift className="h-10 w-10 text-[var(--primary)]" />
                </div>
            </div>

            <div className="space-y-4 p-5">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">
                            {reward.title || "Untitled reward"}
                        </p>
                        <RewardTypeBadge type={reward.type} />
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {reward.description || "No description"}
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Points required" value={String(reward.pointsRequired)} />
                    <InfoTile
                        label="Stock"
                        value={reward.stock === 0 ? "Unlimited" : String(reward.stock)}
                    />
                    <InfoTile
                        label="Status"
                        value={reward.isActive ? "Active" : "Inactive"}
                    />
                    <InfoTile
                        label="Approval"
                        value={reward.approvalMode === "auto" ? "Auto" : reward.approvalMode || "Auto"}
                    />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                    <StatusBadge active={reward.isActive} />

                    <div className="flex items-center gap-2">
                        <ActionIconButton
                            label="Edit reward"
                            title="Edit"
                            onClick={onEdit}
                            icon={<Pencil className="h-4 w-4" />}
                            tone="blue"
                        />
                        <ActionIconButton
                            label={reward.isActive ? "Deactivate reward" : "Activate reward"}
                            title={reward.isActive ? "Deactivate" : "Activate"}
                            onClick={onToggle}
                            icon={<Power className="h-4 w-4" />}
                            tone={reward.isActive ? "red" : "green"}
                        />
                    </div>
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
