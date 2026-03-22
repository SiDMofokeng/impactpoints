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
import { QRCodeSVG } from "qrcode.react"
import {
    CheckCircle2,
    ClipboardCheck,
    Copy,
    LayoutGrid,
    List,
    Pencil,
    Plus,
    Power,
    QrCode,
    Search,
    ShieldAlert,
    ShieldCheck,
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
    createdByName: string
    creatorRole: string
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

const ACTIVITY_TYPE_OPTIONS: Array<{ label: string; value: ActivityType | "all" }> = [
    { label: "All types", value: "all" },
    { label: "Check-in", value: "check_in" },
    { label: "Check-out", value: "check_out" },
    { label: "Meeting", value: "meeting" },
    { label: "Training", value: "training" },
    { label: "General", value: "general" },
]

export default function HeadActivitiesPage() {
    const { profile, loading: profileLoading } = useUserProfile()

    const [activities, setActivities] = useState<ActivityRecord[]>([])
    const [department, setDepartment] = useState<DepartmentRecord | null>(null)
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [viewMode, setViewMode] = useState<"table" | "cards">("table")

    const [createOpen, setCreateOpen] = useState(false)
    const [createTitle, setCreateTitle] = useState("")
    const [createType, setCreateType] = useState<ActivityType>("check_in")
    const [createPoints, setCreatePoints] = useState("")
    const [createDescription, setCreateDescription] = useState("")
    const [createIsActive, setCreateIsActive] = useState(true)
    const [createRequiresEmail, setCreateRequiresEmail] = useState(true)
    const [createError, setCreateError] = useState("")
    const [creating, setCreating] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [editingActivityId, setEditingActivityId] = useState("")
    const [editTitle, setEditTitle] = useState("")
    const [editType, setEditType] = useState<ActivityType>("check_in")
    const [editPoints, setEditPoints] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editIsActive, setEditIsActive] = useState(true)
    const [editRequiresEmail, setEditRequiresEmail] = useState(true)
    const [editError, setEditError] = useState("")
    const [editSaving, setEditSaving] = useState(false)

    const [qrOpen, setQrOpen] = useState(false)
    const [qrActivity, setQrActivity] = useState<ActivityRecord | null>(null)
    const [copyMessage, setCopyMessage] = useState("")

    const departmentId = profile?.departmentId ?? ""

    useEffect(() => {
        if (profileLoading) return

        if (!departmentId) {
            setActivities([])
            setDepartment(null)
            setLoading(false)
            return
        }

        loadDepartmentActivities()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, departmentId])

    async function loadDepartmentActivities() {
        if (!departmentId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)

            const [activitiesSnap, departmentsSnap] = await Promise.all([
                getDocs(collection(db, "activities")),
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

            const allActivities: ActivityRecord[] = activitiesSnap.docs.map((docSnap) => {
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
                    createdByName: data.createdByName ?? "",
                    creatorRole: data.creatorRole ?? "",
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            const departmentActivities = allActivities.filter((activity) => {
                if (activity.allowedDepartments.length === 0) return true
                return activity.allowedDepartments.includes(departmentId)
            })

            setActivities(departmentActivities)
        } catch (error) {
            console.error("Failed to load department activities:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredActivities = useMemo(() => {
        return activities.filter((activity) => {
            const matchesSearch =
                search.trim() === "" ||
                activity.title.toLowerCase().includes(search.toLowerCase()) ||
                activity.code.toLowerCase().includes(search.toLowerCase()) ||
                activity.description.toLowerCase().includes(search.toLowerCase()) ||
                formatActivityType(activity.type).toLowerCase().includes(search.toLowerCase())

            const matchesType = typeFilter === "all" || activity.type === typeFilter
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && activity.isActive) ||
                (statusFilter === "inactive" && !activity.isActive)

            return matchesSearch && matchesType && matchesStatus
        })
    }, [activities, search, typeFilter, statusFilter])

    const stats = useMemo(() => {
        return {
            totalActivities: activities.length,
            activeActivities: activities.filter((activity) => activity.isActive).length,
            inactiveActivities: activities.filter((activity) => !activity.isActive).length,
            totalPoints: activities.reduce((sum, activity) => sum + activity.points, 0),
        }
    }, [activities])

    const qrScanUrl = useMemo(() => {
        if (!qrActivity) return ""
        if (typeof window === "undefined") return `/scan/${qrActivity.id}`
        return `${window.location.origin}/scan/${qrActivity.id}`
    }, [qrActivity])

    function getActivityScanUrl(activityId: string) {
        if (typeof window === "undefined") return `/scan/${activityId}`
        return `${window.location.origin}/scan/${activityId}`
    }

    function resetCreateForm() {
        setCreateTitle("")
        setCreateType("check_in")
        setCreatePoints("")
        setCreateDescription("")
        setCreateIsActive(true)
        setCreateRequiresEmail(true)
        setCreateError("")
    }

    function handleCloseCreate() {
        if (creating) return
        setCreateOpen(false)
        resetCreateForm()
    }

    async function handleCreateActivity() {
        const trimmedTitle = createTitle.trim()
        const trimmedDescription = createDescription.trim()
        const pointsNumber = Number(createPoints)

        setCreateError("")

        if (!departmentId) {
            setCreateError("No department is assigned to your profile.")
            return
        }

        if (!trimmedTitle) {
            setCreateError("Activity title is required.")
            return
        }

        if (!createPoints || Number.isNaN(pointsNumber) || pointsNumber <= 0) {
            setCreateError("Points must be greater than 0.")
            return
        }

        setCreating(true)

        try {
            const nextNumber = activities.length + 1
            const activityCode = `ACT-${String(nextNumber).padStart(4, "0")}`

            await addDoc(collection(db, "activities"), {
                title: trimmedTitle,
                code: activityCode,
                type: createType,
                points: pointsNumber,
                description: trimmedDescription,
                allowedDepartments: [departmentId],
                isActive: createIsActive,
                requiresEmail: createRequiresEmail,
                createdByName: profile?.name ?? "Unknown",
                creatorRole: profile?.role ?? "department_head",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            handleCloseCreate()
            await loadDepartmentActivities()
        } catch (error) {
            console.error("Failed to create activity:", error)
            setCreateError("Failed to create activity. Please try again.")
        } finally {
            setCreating(false)
        }
    }

    function handleOpenEdit(activity: ActivityRecord) {
        setEditingActivityId(activity.id)
        setEditTitle(activity.title)
        setEditType((activity.type || "check_in") as ActivityType)
        setEditPoints(String(activity.points))
        setEditDescription(activity.description)
        setEditIsActive(activity.isActive)
        setEditRequiresEmail(activity.requiresEmail)
        setEditError("")
        setEditOpen(true)
    }

    function resetEditForm() {
        setEditingActivityId("")
        setEditTitle("")
        setEditType("check_in")
        setEditPoints("")
        setEditDescription("")
        setEditIsActive(true)
        setEditRequiresEmail(true)
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
        const pointsNumber = Number(editPoints)

        setEditError("")

        if (!editingActivityId) {
            setEditError("No activity selected.")
            return
        }

        if (!departmentId) {
            setEditError("No department is assigned to your profile.")
            return
        }

        if (!trimmedTitle) {
            setEditError("Activity title is required.")
            return
        }

        if (!editPoints || Number.isNaN(pointsNumber) || pointsNumber <= 0) {
            setEditError("Points must be greater than 0.")
            return
        }

        setEditSaving(true)

        try {
            const activityRef = doc(db, "activities", editingActivityId)

            await updateDoc(activityRef, {
                title: trimmedTitle,
                type: editType,
                points: pointsNumber,
                description: trimmedDescription,
                allowedDepartments: [departmentId],
                isActive: editIsActive,
                requiresEmail: editRequiresEmail,
                updatedAt: serverTimestamp(),
            })

            handleCloseEdit()
            await loadDepartmentActivities()
        } catch (error) {
            console.error("Failed to update activity:", error)
            setEditError("Failed to save activity changes. Please try again.")
        } finally {
            setEditSaving(false)
        }
    }

    async function handleToggleActivityStatus(activity: ActivityRecord) {
        try {
            const activityRef = doc(db, "activities", activity.id)

            await updateDoc(activityRef, {
                isActive: !activity.isActive,
                updatedAt: serverTimestamp(),
            })

            await loadDepartmentActivities()
        } catch (error) {
            console.error("Failed to toggle activity status:", error)
        }
    }

    function handleOpenQr(activity: ActivityRecord) {
        setQrActivity(activity)
        setCopyMessage("")
        setQrOpen(true)
    }

    async function handleCopyQrLink() {
        if (!qrScanUrl) return

        try {
            await navigator.clipboard.writeText(qrScanUrl)
            setCopyMessage("Scan link copied.")
            window.setTimeout(() => setCopyMessage(""), 2000)
        } catch (error) {
            console.error("Failed to copy scan link:", error)
            setCopyMessage("Failed to copy link.")
            window.setTimeout(() => setCopyMessage(""), 2000)
        }
    }

    return (
        <RequireRole allowedRoles={["department_head"]}>
            <div className="space-y-6">
                <section className="rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#84cc16_100%)] px-6 py-7 text-white shadow-[var(--shadow-card)]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                                Department activities
                            </p>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                                QR Activity Management
                            </h1>
                            <p className="max-w-2xl text-sm text-white/85 md:text-base">
                                Create and manage QR-based activities for{" "}
                                {department?.name || "your department"}, track active scans,
                                and keep point-awarding actions organized.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            disabled={!departmentId}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-white px-5 py-3 text-sm font-medium text-[var(--primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            Create activity
                        </button>
                    </div>
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
                        icon={<QrCode className="h-5 w-5" />}
                        label="Total activities"
                        value={String(stats.totalActivities)}
                        helper="All visible department activities"
                    />
                    <StatCard
                        icon={<ShieldCheck className="h-5 w-5" />}
                        label="Active activities"
                        value={String(stats.activeActivities)}
                        helper="Available for scanning"
                    />
                    <StatCard
                        icon={<ClipboardCheck className="h-5 w-5" />}
                        label="Inactive activities"
                        value={String(stats.inactiveActivities)}
                        helper="Currently disabled"
                    />
                    <StatCard
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        label="Total points"
                        value={String(stats.totalPoints)}
                        helper="Points across all activities"
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
                                    placeholder="Search by title, code, type, or description"
                                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Activity type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as ActivityType | "all")}
                                className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-3 text-sm outline-none"
                            >
                                {ACTIVITY_TYPE_OPTIONS.map((option) => (
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
                                    className={`inline-flex h-full cursor-pointer items-center gap-2 rounded-[10px] px-3 text-sm font-medium transition ${viewMode === "table"
                                            ? "bg-[var(--primary)] text-white"
                                            : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                >
                                    <List className="h-4 w-4" />
                                    Table
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setViewMode("cards")}
                                    className={`inline-flex h-full cursor-pointer items-center gap-2 rounded-[10px] px-3 text-sm font-medium transition ${viewMode === "cards"
                                            ? "bg-[var(--primary)] text-white"
                                            : "text-slate-700 hover:bg-slate-100"
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
                        <h2 className="text-lg font-semibold">Activity list</h2>
                        <p className="text-sm text-muted-foreground">
                            Activities available to your department, including global activities.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading activities...
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No activities found yet.
                        </div>
                    ) : viewMode === "table" ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Activity</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium">Department scope</th>
                                        <th className="px-5 py-4 font-medium">Status</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredActivities.map((activity) => (
                                        <tr key={activity.id} className="border-t align-top">
                                            <td className="px-5 py-4 md:px-6">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {activity.title || "Untitled activity"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {activity.code || "No code"} ·{" "}
                                                        {activity.description || "No description"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <ActivityTypeBadge type={activity.type} />
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {activity.points}
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {activity.allowedDepartments.length === 0
                                                    ? "All departments"
                                                    : department?.name || "Assigned department"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge active={activity.isActive} />
                                            </td>

                                            <td className="px-5 py-4 md:px-6">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <ActionIconButton
                                                        label="Edit activity"
                                                        title="Edit"
                                                        onClick={() => handleOpenEdit(activity)}
                                                        icon={<Pencil className="h-4 w-4" />}
                                                        tone="blue"
                                                    />
                                                    <ActionIconButton
                                                        label="View QR code"
                                                        title="View QR"
                                                        onClick={() => handleOpenQr(activity)}
                                                        icon={<QrCode className="h-4 w-4" />}
                                                        tone="violet"
                                                    />
                                                    <ActionIconButton
                                                        label={
                                                            activity.isActive
                                                                ? "Deactivate activity"
                                                                : "Activate activity"
                                                        }
                                                        title={activity.isActive ? "Deactivate" : "Activate"}
                                                        onClick={() => handleToggleActivityStatus(activity)}
                                                        icon={<Power className="h-4 w-4" />}
                                                        tone={activity.isActive ? "red" : "green"}
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
                            {filteredActivities.map((activity) => {
                                const activityUrl = getActivityScanUrl(activity.id)

                                return (
                                    <div
                                        key={activity.id}
                                        className="overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-sm"
                                    >
                                        <div className="flex items-center justify-center border-b bg-[var(--surface)] p-5">
                                            <QRCodeSVG value={activityUrl} size={180} />
                                        </div>

                                        <div className="space-y-4 p-5">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-base font-semibold">
                                                        {activity.title || "Untitled activity"}
                                                    </p>
                                                    <ActivityTypeBadge type={activity.type} />
                                                </div>

                                                <p className="text-sm text-muted-foreground">
                                                    {activity.code || "No code"}
                                                </p>
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                {activity.description || "No description provided."}
                                            </p>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <MiniDetail
                                                    label="Points"
                                                    value={String(activity.points)}
                                                />
                                                <MiniDetail
                                                    label="Status"
                                                    value={activity.isActive ? "Active" : "Inactive"}
                                                />
                                                <MiniDetail
                                                    label="Scope"
                                                    value={
                                                        activity.allowedDepartments.length === 0
                                                            ? "All departments"
                                                            : department?.name || "Assigned department"
                                                    }
                                                />
                                                <MiniDetail
                                                    label="Email"
                                                    value={
                                                        activity.requiresEmail
                                                            ? "Required"
                                                            : "Not required"
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <ActionIconButton
                                                    label="Edit activity"
                                                    title="Edit"
                                                    onClick={() => handleOpenEdit(activity)}
                                                    icon={<Pencil className="h-4 w-4" />}
                                                    tone="blue"
                                                />
                                                <ActionIconButton
                                                    label="View QR code"
                                                    title="View QR"
                                                    onClick={() => handleOpenQr(activity)}
                                                    icon={<QrCode className="h-4 w-4" />}
                                                    tone="violet"
                                                />
                                                <ActionIconButton
                                                    label={
                                                        activity.isActive
                                                            ? "Deactivate activity"
                                                            : "Activate activity"
                                                    }
                                                    title={activity.isActive ? "Deactivate" : "Activate"}
                                                    onClick={() => handleToggleActivityStatus(activity)}
                                                    icon={<Power className="h-4 w-4" />}
                                                    tone={activity.isActive ? "red" : "green"}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SurfaceCard>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Create Activity
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Create a QR activity for your department.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Activity title</label>
                                    <input
                                        value={createTitle}
                                        onChange={(e) => setCreateTitle(e.target.value)}
                                        placeholder="Morning Check-In"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Activity type</label>
                                        <select
                                            value={createType}
                                            onChange={(e) => setCreateType(e.target.value as ActivityType)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="check_in">Check-in</option>
                                            <option value="check_out">Check-out</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="training">Training</option>
                                            <option value="general">General</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Points</label>
                                        <input
                                            value={createPoints}
                                            onChange={(e) => setCreatePoints(e.target.value)}
                                            type="number"
                                            min="1"
                                            placeholder="5"
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
                                        placeholder="Award points for department attendance or participation."
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email required</label>
                                        <select
                                            value={createRequiresEmail ? "yes" : "no"}
                                            onChange={(e) => setCreateRequiresEmail(e.target.value === "yes")}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Activity summary</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Type</span>
                                            <span className="font-medium text-foreground">
                                                {formatActivityType(createType)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Points</span>
                                            <span className="font-medium text-foreground">
                                                {createPoints || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Department</span>
                                            <span className="text-right font-medium text-foreground">
                                                {department?.name || "Not assigned"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Email verification</span>
                                            <span className="font-medium text-foreground">
                                                {createRequiresEmail ? "Required" : "Not required"}
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
                                onClick={handleCreateActivity}
                                disabled={creating}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {creating ? "Creating..." : "Create activity"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-5">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Edit Activity
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm">
                                Update department activity details.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Activity title</label>
                                    <input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Morning Check-In"
                                        className="h-11 w-full rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Activity type</label>
                                        <select
                                            value={editType}
                                            onChange={(e) => setEditType(e.target.value as ActivityType)}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="check_in">Check-in</option>
                                            <option value="check_out">Check-out</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="training">Training</option>
                                            <option value="general">General</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Points</label>
                                        <input
                                            value={editPoints}
                                            onChange={(e) => setEditPoints(e.target.value)}
                                            type="number"
                                            min="1"
                                            placeholder="5"
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
                                        placeholder="Activity description"
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email required</label>
                                        <select
                                            value={editRequiresEmail ? "yes" : "no"}
                                            onChange={(e) => setEditRequiresEmail(e.target.value === "yes")}
                                            className="h-11 w-full cursor-pointer rounded-[var(--radius-input)] border bg-white px-4 text-sm outline-none"
                                        >
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-semibold">Activity summary</p>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Type</span>
                                            <span className="font-medium text-foreground">
                                                {formatActivityType(editType)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Points</span>
                                            <span className="font-medium text-foreground">
                                                {editPoints || "0"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Department</span>
                                            <span className="text-right font-medium text-foreground">
                                                {department?.name || "Not assigned"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Email verification</span>
                                            <span className="font-medium text-foreground">
                                                {editRequiresEmail ? "Required" : "Not required"}
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

                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <DialogContent className="w-[92vw] max-w-2xl rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-6">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Activity QR Code
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm leading-6">
                                Share or scan this QR code to open the activity scan page.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 px-8 py-6">
                            <div className="space-y-1">
                                <p className="text-xl font-semibold">
                                    {qrActivity?.title ?? "Selected activity"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {qrActivity?.code ?? "No code"} ·{" "}
                                    {formatActivityType(qrActivity?.type ?? "")}
                                </p>
                            </div>

                            <div className="flex justify-center rounded-[var(--radius-card)] border bg-white p-6">
                                {qrScanUrl ? (
                                    <QRCodeSVG value={qrScanUrl} size={220} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No QR data available.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Scan URL</label>
                                <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3 text-sm break-all leading-6">
                                    {qrScanUrl || "No scan URL available."}
                                </div>
                            </div>

                            {copyMessage ? (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                    {copyMessage}
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleCopyQrLink}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copy link
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setQrOpen(false)}
                                    className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                                >
                                    Close
                                </button>
                            </div>
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

function ActivityTypeBadge({ type }: { type: ActivityType | "" }) {
    return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {formatActivityType(type)}
        </span>
    )
}

function MiniDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
        </div>
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
    tone: "blue" | "violet" | "green" | "red"
}) {
    const classes =
        tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : tone === "violet"
                ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
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

function formatActivityType(type: ActivityType | "") {
    if (type === "check_in") return "Check-in"
    if (type === "check_out") return "Check-out"
    if (type === "meeting") return "Meeting"
    if (type === "training") return "Training"
    if (type === "general") return "General"
    return "Unknown"
}