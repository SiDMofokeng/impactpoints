"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Clock3, History, QrCode, ScanLine } from "lucide-react"
import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useUserProfile } from "@/components/providers/user-profile-provider"
import { db } from "@/lib/firebase"

type ActivityType = "check_in" | "check_out" | "meeting" | "training" | "general"

type ActivityScanRecord = {
    id: string
    activityId: string
    activityCode: string
    activityTitle: string
    activityType: ActivityType | ""
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
}

export default function EmployeeActivityPage() {
    const { profile, loading: profileLoading } = useUserProfile()
    const [scans, setScans] = useState<ActivityScanRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profileLoading) return
        loadMyActivity()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile?.email])

    async function loadMyActivity() {
        try {
            setLoading(true)

            const scansSnap = await getDocs(collection(db, "activity_scans"))
            const normalizedEmail = (profile?.email ?? "").toLowerCase()

            const rows = scansSnap.docs
                .map((docSnap): ActivityScanRecord => {
                    const data = docSnap.data() as Record<string, unknown>

                    const activityType: ActivityScanRecord["activityType"] =
                        data.activityType === "check_in" ||
                            data.activityType === "check_out" ||
                            data.activityType === "meeting" ||
                            data.activityType === "training" ||
                            data.activityType === "general"
                            ? data.activityType
                            : ""

                    return {
                        id: docSnap.id,
                        activityId: typeof data.activityId === "string" ? data.activityId : "",
                        activityCode: typeof data.activityCode === "string" ? data.activityCode : "",
                        activityTitle:
                            typeof data.activityTitle === "string" ? data.activityTitle : "",
                        activityType,
                        notes: typeof data.notes === "string" ? data.notes : "",
                        pointsAwarded:
                            typeof data.pointsAwarded === "number" ? data.pointsAwarded : 0,
                        scannedAt:
                            typeof data.scannedAt === "object" && data.scannedAt !== null
                                ? (data.scannedAt as {
                                    seconds?: number
                                    nanoseconds?: number
                                })
                                : null,
                        source: typeof data.source === "string" ? data.source : "",
                        userEmail: typeof data.userEmail === "string" ? data.userEmail : "",
                        userId: typeof data.userId === "string" ? data.userId : "",
                        userName: typeof data.userName === "string" ? data.userName : "",
                    }
                })
                .filter((scan) => scan.userEmail.toLowerCase() === normalizedEmail)
                .sort((a, b) => {
                    const aSeconds = a.scannedAt?.seconds ?? 0
                    const bSeconds = b.scannedAt?.seconds ?? 0
                    return bSeconds - aSeconds
                })

            setScans(rows)
        } catch (error) {
            console.error("Failed to load employee activity:", error)
        } finally {
            setLoading(false)
        }
    }

    const stats = useMemo(() => {
        const totalScans = scans.length
        const totalPoints = scans.reduce((sum, scan) => sum + scan.pointsAwarded, 0)
        const latestScan = scans[0] ?? null

        return {
            totalScans,
            totalPoints,
            latestScanTitle: latestScan?.activityTitle ?? "None yet",
            latestScanDate: latestScan ? formatScanDate(latestScan.scannedAt) : "No scans yet",
        }
    }, [scans])

    return (
        <RequireRole allowedRoles={["employee"]}>
            <div className="space-y-6">

                <section className="rounded-[var(--radius-card)] border bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-6 py-8 text-white shadow-[var(--shadow-card)] md:px-8">
                    <div className="max-w-3xl space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                            My scan activity
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Track every point-earning scan in one place
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/90 md:text-base">
                            Use this page to monitor your participation across check-ins, meetings,
                            training sessions, and other department activities.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Total Scans"
                        value={loading ? "..." : String(stats.totalScans)}
                        helper="All submitted activity scans"
                        icon={<ScanLine className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Points Earned"
                        value={loading ? "..." : String(stats.totalPoints)}
                        helper="Points from recorded scans"
                        icon={<QrCode className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Latest Activity"
                        value={loading ? "..." : truncateText(stats.latestScanTitle, 20)}
                        helper="Most recent scan title"
                        icon={<History className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Last Scan Date"
                        value={loading ? "..." : stats.latestScanDate}
                        helper="Most recent recorded scan"
                        icon={<Clock3 className="h-5 w-5" />}
                    />
                </div>

                <SurfaceCard className="overflow-hidden">
                    <div className="border-b px-5 py-4 md:px-6">
                        <h2 className="text-lg font-semibold">Activity history</h2>
                        <p className="text-sm text-muted-foreground">
                            Your personal scan records and awarded points.
                        </p>
                    </div>

                    {loading ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            Loading activity history...
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground md:px-6">
                            You do not have any recorded scans yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[var(--surface)]">
                                    <tr className="text-sm text-muted-foreground">
                                        <th className="px-5 py-4 font-medium md:px-6">Activity</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium">Points</th>
                                        <th className="px-5 py-4 font-medium">Notes</th>
                                        <th className="px-5 py-4 font-medium md:px-6">Date</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {scans.map((scan) => (
                                        <tr key={scan.id} className="border-t align-top">
                                            <td className="px-5 py-4 md:px-6">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {scan.activityTitle || "Untitled activity"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {scan.activityCode || "No code"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                                    {formatActivityType(scan.activityType)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium">
                                                {scan.pointsAwarded}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-muted-foreground">
                                                {scan.notes?.trim() ? scan.notes : "No notes"}
                                            </td>

                                            <td className="px-5 py-4 text-sm md:px-6">
                                                {formatScanDate(scan.scannedAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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

function formatActivityType(type: ActivityType | "") {
    if (type === "check_in") return "Check-in"
    if (type === "check_out") return "Check-out"
    if (type === "meeting") return "Meeting"
    if (type === "training") return "Training"
    if (type === "general") return "General"
    return "Unknown"
}

function formatScanDate(
    scannedAt?: {
        seconds?: number
        nanoseconds?: number
    } | null
) {
    const seconds = scannedAt?.seconds
    if (!seconds) return "Unknown date"
    const date = new Date(seconds * 1000)
    return date.toLocaleString()
}

function truncateText(value: string, maxLength: number) {
    if (!value) return "None"
    if (value.length <= maxLength) return value
    return `${value.slice(0, maxLength)}...`
}