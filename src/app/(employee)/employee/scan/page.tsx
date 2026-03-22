"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { QRCodeSVG } from "qrcode.react"
import {
    ArrowUpRight,
    Building2,
    Copy,
    QrCode,
    ScanLine,
    Search,
    ShieldCheck,
} from "lucide-react"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useAuth } from "@/components/providers/auth-provider"
import { db } from "@/lib/firebase"
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
    description?: string
    headUserId?: string
    headName?: string
    isActive: boolean
    isDeleted: boolean
}

type EmployeeUserRecord = {
    id: string
    name: string
    email: string
    role: "employee" | "department_head" | "super_admin" | ""
    departmentId: string
    departmentName: string
    status: "active" | "inactive" | "suspended" | ""
    totalPoints: number
    isDeleted: boolean
}

export default function EmployeeScanPage() {
    const { user, loading: authLoading } = useAuth()

    const [employee, setEmployee] = useState<EmployeeUserRecord | null>(null)
    const [activities, setActivities] = useState<ActivityRecord[]>([])
    const [departments, setDepartments] = useState<DepartmentRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const [qrOpen, setQrOpen] = useState(false)
    const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null)
    const [copyMessage, setCopyMessage] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setLoading(false)
            return
        }

        loadScanPageData(user.uid)
    }, [authLoading, user])

    async function loadScanPageData(userId: string) {
        try {
            setLoading(true)

            const [userSnap, activitiesSnap, departmentsSnap] = await Promise.all([
                getDoc(doc(db, "users", userId)),
                getDocs(collection(db, "activities")),
                getDocs(collection(db, "departments")),
            ])

            const departmentRows: DepartmentRecord[] = departmentsSnap.docs.map((docSnap) => {
                const data = docSnap.data() as Partial<DepartmentRecord>

                return {
                    id: docSnap.id,
                    name: data.name ?? "",
                    code: data.code ?? "",
                    description: data.description ?? "",
                    headUserId: data.headUserId ?? "",
                    headName: data.headName ?? "",
                    isActive: data.isActive ?? true,
                    isDeleted: data.isDeleted ?? false,
                }
            })

            const activeDepartments = departmentRows.filter(
                (department) => !department.isDeleted && department.isActive
            )

            const departmentNameMap = new Map(
                activeDepartments.map((department) => [department.id, department.name])
            )

            if (userSnap.exists()) {
                const data = userSnap.data() as Partial<EmployeeUserRecord>
                const resolvedDepartmentId = data.departmentId ?? ""
                const resolvedDepartmentName =
                    data.departmentName ??
                    (resolvedDepartmentId
                        ? departmentNameMap.get(resolvedDepartmentId) ?? ""
                        : "")

                setEmployee({
                    id: userSnap.id,
                    name: data.name ?? "",
                    email: data.email ?? "",
                    role:
                        data.role === "employee" ||
                            data.role === "department_head" ||
                            data.role === "super_admin"
                            ? data.role
                            : "",
                    departmentId: resolvedDepartmentId,
                    departmentName: resolvedDepartmentName,
                    status:
                        data.status === "active" ||
                            data.status === "inactive" ||
                            data.status === "suspended"
                            ? data.status
                            : "",
                    totalPoints:
                        typeof data.totalPoints === "number" ? data.totalPoints : 0,
                    isDeleted: data.isDeleted ?? false,
                })
            } else {
                setEmployee(null)
            }

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
                    createdByName: data.createdByName ?? "",
                    creatorRole: data.creatorRole ?? "",
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                }
            })

            setDepartments(activeDepartments)
            setActivities(activityRows)
        } catch (error) {
            console.error("Failed to load employee scan page data:", error)
        } finally {
            setLoading(false)
        }
    }

    const activeDepartment = useMemo(() => {
        const departmentId = employee?.departmentId ?? ""
        if (!departmentId) return null

        return departments.find((department) => department.id === departmentId) ?? null
    }, [departments, employee?.departmentId])

    const availableActivities = useMemo(() => {
        const userDepartmentId = (employee?.departmentId ?? "").toLowerCase()
        const userDepartmentCode = (activeDepartment?.code ?? "").toLowerCase()

        return activities
            .filter((activity) => activity.isActive)
            .filter((activity) => {
                if (activity.allowedDepartments.length === 0) {
                    return true
                }

                return activity.allowedDepartments.some((allowedValue) => {
                    const normalizedAllowed = String(allowedValue).toLowerCase()

                    return (
                        normalizedAllowed === userDepartmentId ||
                        normalizedAllowed === userDepartmentCode
                    )
                })
            })
            .filter((activity) => {
                const term = search.trim().toLowerCase()

                if (!term) return true

                return (
                    activity.title.toLowerCase().includes(term) ||
                    activity.code.toLowerCase().includes(term) ||
                    activity.description.toLowerCase().includes(term) ||
                    formatActivityType(activity.type).toLowerCase().includes(term)
                )
            })
            .sort((a, b) => a.title.localeCompare(b.title))
    }, [activities, activeDepartment?.code, employee?.departmentId, search])

    const stats = useMemo(() => {
        return {
            totalAvailable: availableActivities.length,
            totalPointsAvailable: availableActivities.reduce(
                (sum, activity) => sum + activity.points,
                0
            ),
            departmentName:
                employee?.departmentName || activeDepartment?.name || "Not assigned",
        }
    }, [availableActivities, activeDepartment?.name, employee?.departmentName])

    const qrScanUrl = useMemo(() => {
        if (!selectedActivity) return ""
        if (typeof window === "undefined") return `/scan/${selectedActivity.id}`
        return `${window.location.origin}/scan/${selectedActivity.id}`
    }, [selectedActivity])

    function handleOpenQr(activity: ActivityRecord) {
        setSelectedActivity(activity)
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
        <RequireRole allowedRoles={["employee"]}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Scan</p>
                    <h1 className="text-3xl font-bold tracking-tight">Available Activities</h1>
                    <p className="text-muted-foreground">
                        Open an available activity or display its QR code for scanning.
                    </p>
                </div>

                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            Activity access
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Scan into the right activity for your department
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Only active activities allocated to your department appear here. Open
                            the scan page directly or show the QR code for mobile scanning.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                        label="Available Activities"
                        value={loading ? "..." : String(stats.totalAvailable)}
                        helper="Activities you can currently access"
                        icon={<QrCode className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Potential Points"
                        value={loading ? "..." : String(stats.totalPointsAvailable)}
                        helper="Total points across available activities"
                        icon={<ScanLine className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="My Department"
                        value={loading ? "..." : stats.departmentName}
                        helper="Department linked to your account"
                        icon={<Building2 className="h-5 w-5" />}
                    />
                </div>

                <SurfaceCard className="p-5 md:p-6">
                    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search activities</label>
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
                            <label className="text-sm font-medium">Scan access</label>
                            <div className="flex h-11 items-center rounded-[var(--radius-input)] border bg-white px-4 text-sm text-muted-foreground">
                                Activities are filtered by your department automatically
                            </div>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Activity list</h2>
                        <p className="text-sm text-muted-foreground">
                            Active department activities that you can open and scan into.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading available activities...
                        </div>
                    ) : availableActivities.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            No active activities are currently available for your department.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Activity</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium">Access</th>
                                        <th className="px-5 py-4 font-medium text-right md:px-6">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {availableActivities.map((activity) => (
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
                                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                    {formatActivityType(activity.type)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {activity.points}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                                    Allowed
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-right md:px-6">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenQr(activity)}
                                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                                                    >
                                                        <QrCode className="h-4 w-4" />
                                                        QR code
                                                    </button>

                                                    <Link
                                                        href={`/scan/${activity.id}`}
                                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                                                    >
                                                        Open scan
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SurfaceCard>

                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <DialogContent className="w-[92vw] max-w-2xl rounded-[var(--radius-card)] p-0">
                        <DialogHeader className="border-b px-8 py-6">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                Activity QR Code
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-sm leading-6">
                                Scan this QR code to open the activity verification page.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 px-8 py-6">
                            <div className="space-y-1">
                                <p className="text-xl font-semibold">
                                    {selectedActivity?.title ?? "Selected activity"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedActivity?.code ?? "No code"} ·{" "}
                                    {formatActivityType(selectedActivity?.type ?? "")}
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
                                <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3 text-sm leading-6 break-all">
                                    {qrScanUrl || "No scan URL available."}
                                </div>
                            </div>

                            {copyMessage ? (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                    {copyMessage}
                                </div>
                            ) : null}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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