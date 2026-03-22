"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
    doc,
    getDoc,
    getDocs,
    collection,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore"
import {
    CheckCircle2,
    Loader2,
    LockKeyhole,
    Mail,
    QrCode,
    ShieldAlert,
} from "lucide-react"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"

import { auth, db } from "@/lib/firebase"
import SurfaceCard from "@/components/shared/surface-card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type ActivityType = "check_in" | "check_out" | "meeting" | "training" | "general"

type ActivityRecord = {
    title: string
    code: string
    type: ActivityType | ""
    points: number
    description: string
    allowedDepartments: string[]
    isActive: boolean
    requiresEmail: boolean
}

type UserRecord = {
    name?: string
    email?: string
    role?: string
    departmentId?: string
    totalPoints?: number
    isDeleted?: boolean
    status?: "active" | "inactive" | "suspended" | ""
}

type DepartmentRecord = {
    id: string
    name?: string
    code?: string
    isActive?: boolean
    isDeleted?: boolean
}

export default function ScanActivityPage() {
    const params = useParams<{ activityId: string }>()
    const activityId = Array.isArray(params?.activityId)
        ? params.activityId[0]
        : params?.activityId

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [activity, setActivity] = useState<ActivityRecord | null>(null)

    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [notes, setNotes] = useState("")

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [awardedPoints, setAwardedPoints] = useState<number | null>(null)
    const [userName, setUserName] = useState("")

    useEffect(() => {
        async function loadActivity() {
            if (!activityId) {
                setError("Invalid activity link.")
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError("")

                const activityRef = doc(db, "activities", activityId)
                const activitySnap = await getDoc(activityRef)

                if (!activitySnap.exists()) {
                    setActivity(null)
                    setError("This activity does not exist.")
                    return
                }

                const data = activitySnap.data() as Partial<ActivityRecord>

                const nextActivity: ActivityRecord = {
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
                }

                setActivity(nextActivity)

                if (nextActivity.isActive) {
                    setAuthModalOpen(true)
                }
            } catch (loadError) {
                console.error("Failed to load activity:", loadError)
                setError("Failed to load this activity.")
            } finally {
                setLoading(false)
            }
        }

        loadActivity()
    }, [activityId])

    const departmentText = useMemo(() => {
        if (!activity) return ""

        return activity.allowedDepartments.length === 0
            ? "All departments"
            : `${activity.allowedDepartments.length} department(s) allowed`
    }, [activity])

    async function resolveAllowedDepartmentMatch(
        userDepartmentId: string,
        allowedDepartments: string[]
    ) {
        if (allowedDepartments.length === 0) return true
        if (!userDepartmentId) return false

        if (allowedDepartments.includes(userDepartmentId)) {
            return true
        }

        const departmentsSnap = await getDocs(collection(db, "departments"))

        let matchedDepartmentDocId = ""
        let matchedDepartmentCode = ""

        departmentsSnap.forEach((departmentDoc) => {
            const department = departmentDoc.data() as DepartmentRecord

            if (
                departmentDoc.id === userDepartmentId ||
                (department.code ?? "").toLowerCase() === userDepartmentId.toLowerCase()
            ) {
                matchedDepartmentDocId = departmentDoc.id
                matchedDepartmentCode = department.code ?? ""
            }
        })

        if (!matchedDepartmentDocId && !matchedDepartmentCode) {
            return false
        }

        return allowedDepartments.some((allowedValue) => {
            const normalizedAllowed = allowedValue.toLowerCase()

            return (
                normalizedAllowed === matchedDepartmentDocId.toLowerCase() ||
                normalizedAllowed === matchedDepartmentCode.toLowerCase()
            )
        })
    }

    async function handleAuthenticatedScan(e: React.FormEvent) {
        e.preventDefault()

        if (!activityId || !activity) return

        const normalizedEmail = email.trim().toLowerCase()
        const trimmedPassword = password.trim()
        const trimmedNotes = notes.trim()

        if (!normalizedEmail) {
            setError("Work email is required.")
            return
        }

        if (!normalizedEmail.includes("@")) {
            setError("Enter a valid work email.")
            return
        }

        if (!trimmedPassword) {
            setError("Password is required.")
            return
        }

        if (!activity.isActive) {
            setError("This activity is currently inactive.")
            return
        }

        setSubmitting(true)
        setError("")
        setSuccess("")
        setAwardedPoints(null)
        setUserName("")

        try {
            const credential = await signInWithEmailAndPassword(
                auth,
                normalizedEmail,
                trimmedPassword
            )

            const userRef = doc(db, "users", credential.user.uid)
            const userSnap = await getDoc(userRef)

            if (!userSnap.exists()) {
                await signOut(auth)
                setError("No system user profile was found for this account.")
                return
            }

            const userData = userSnap.data() as UserRecord

            if (userData.isDeleted) {
                await signOut(auth)
                setError("This user account is not available.")
                return
            }

            if (userData.status === "inactive" || userData.status === "suspended") {
                await signOut(auth)
                setError("This user account is not active.")
                return
            }

            const userDepartmentId = userData.departmentId ?? ""

            const departmentAllowed = await resolveAllowedDepartmentMatch(
                userDepartmentId,
                activity.allowedDepartments
            )

            if (!departmentAllowed) {
                await signOut(auth)
                setError("This activity is not allocated to the user's department.")
                return
            }

            const scanLogRef = doc(collection(db, "activity_scans"))

            await runTransaction(db, async (transaction) => {
                const freshUserSnap = await transaction.get(userRef)
                const freshUserData = freshUserSnap.data() as UserRecord | undefined

                if (!freshUserSnap.exists() || !freshUserData) {
                    throw new Error("USER_NOT_FOUND")
                }

                const currentPoints =
                    typeof freshUserData.totalPoints === "number"
                        ? freshUserData.totalPoints
                        : 0

                transaction.update(userRef, {
                    totalPoints: currentPoints + activity.points,
                    updatedAt: serverTimestamp(),
                })

                transaction.set(scanLogRef, {
                    activityId,
                    activityCode: activity.code,
                    activityTitle: activity.title,
                    activityType: activity.type,
                    pointsAwarded: activity.points,
                    userId: credential.user.uid,
                    userEmail: normalizedEmail,
                    userName: freshUserData.name ?? "",
                    userDepartmentId: freshUserData.departmentId ?? "",
                    notes: trimmedNotes,
                    scannedAt: serverTimestamp(),
                    source: "scan_page",
                })
            })

            setUserName(userData.name ?? "")
            setAwardedPoints(activity.points)
            setSuccess("Scan recorded successfully and points have been added.")
            setAuthModalOpen(false)
            setEmail("")
            setPassword("")
            setNotes("")

            await signOut(auth)
        } catch (submitError: unknown) {
            console.error("Failed to submit scan:", submitError)

            const code =
                typeof submitError === "object" &&
                    submitError !== null &&
                    "code" in submitError &&
                    typeof (submitError as { code?: unknown }).code === "string"
                    ? (submitError as { code: string }).code
                    : ""

            if (
                code === "auth/invalid-credential" ||
                code === "auth/user-not-found" ||
                code === "auth/wrong-password"
            ) {
                setError("Incorrect email or password.")
            } else if (code === "auth/invalid-email") {
                setError("Enter a valid email address.")
            } else {
                setError("Failed to record this scan. Please try again.")
            }

            try {
                await signOut(auth)
            } catch {
                // ignore cleanup signout error
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-6">
            <div className="mx-auto max-w-4xl space-y-6">
                <SurfaceCard className="overflow-hidden">
                    <div className="bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#84cc16_100%)] px-6 py-8 text-white md:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                                <QrCode className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                                    Impact Points
                                </p>
                                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    Activity Scan
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading activity...
                            </div>
                        ) : !activity ? (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <ShieldAlert className="h-8 w-8 text-red-500" />
                                <h2 className="text-2xl font-bold">Activity unavailable</h2>
                                <p className="text-sm text-muted-foreground">
                                    {error || "This activity could not be loaded."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Activity details
                                    </p>
                                    <h2 className="text-3xl font-bold tracking-tight">
                                        {activity.title || "Untitled activity"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground md:text-base">
                                        {activity.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                    <InfoCard
                                        label="Code"
                                        value={activity.code || "No code"}
                                    />
                                    <InfoCard
                                        label="Type"
                                        value={formatActivityType(activity.type)}
                                    />
                                    <InfoCard
                                        label="Points"
                                        value={String(activity.points)}
                                    />
                                    <InfoCard
                                        label="Departments"
                                        value={departmentText}
                                    />
                                </div>

                                {success ? (
                                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                            <div>
                                                <p>{success}</p>
                                                {userName ? <p className="mt-1">User: {userName}</p> : null}
                                                {awardedPoints !== null ? (
                                                    <p className="mt-1">Points added: {awardedPoints}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-5">
                                        <p className="text-sm font-medium">
                                            Authentication required
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Sign in to verify yourself before this scan can be recorded.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SurfaceCard>
            </div>

            <Dialog
                open={authModalOpen}
                onOpenChange={(open) => {
                    if (submitting) return
                    setAuthModalOpen(open)
                }}
            >
                <DialogContent className="w-[94vw] max-w-lg overflow-hidden rounded-[var(--radius-card)] p-0">
                    <div className="bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#84cc16_100%)] px-6 py-6 text-white">
                        <DialogHeader className="gap-2">
                            <DialogTitle className="text-left text-2xl font-semibold tracking-tight text-white">
                                Verify before scan
                            </DialogTitle>
                            <DialogDescription className="text-left text-sm leading-6 text-white/85">
                                Enter your work email and password to authenticate this activity scan.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form className="space-y-5 px-6 py-6" onSubmit={handleAuthenticatedScan}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Work email</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    placeholder="name@company.com"
                                    className="h-12 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <div className="flex items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3">
                                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-12 w-full border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                placeholder="Optional details for this scan"
                                className="w-full rounded-[var(--radius-input)] border bg-white px-4 py-3 text-sm outline-none"
                            />
                        </div>

                        {error ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

                        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setAuthModalOpen(false)}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] border bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                                disabled={submitting}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? "Verifying..." : "Verify and submit scan"}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </main>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
        </div>
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