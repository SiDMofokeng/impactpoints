import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

type UserRole = "super_admin" | "department_head" | "employee"
type UserStatus = "active" | "inactive" | "suspended"

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            name?: string
            email?: string
            password?: string
            role?: UserRole
            status?: UserStatus
            departmentId?: string
            departmentName?: string
            departmentCode?: string
            totalPoints?: number
        }

        const name = body.name?.trim() ?? ""
        const email = body.email?.trim().toLowerCase() ?? ""
        const password = body.password?.trim() ?? ""
        const role = body.role ?? "employee"
        const status = body.status ?? "active"
        const departmentId = body.departmentId ?? ""
        const departmentName = body.departmentName ?? ""
        const totalPoints =
            typeof body.totalPoints === "number" ? body.totalPoints : 0

        if (!name) {
            return NextResponse.json(
                { ok: false, error: "Full name is required." },
                { status: 400 }
            )
        }

        if (!email || !email.includes("@")) {
            return NextResponse.json(
                { ok: false, error: "A valid email address is required." },
                { status: 400 }
            )
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { ok: false, error: "Password must be at least 6 characters." },
                { status: 400 }
            )
        }

        if (
            (role === "department_head" || role === "employee") &&
            !departmentId
        ) {
            return NextResponse.json(
                { ok: false, error: "Department is required for this role." },
                { status: 400 }
            )
        }

        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        })

        await adminDb.collection("users").doc(userRecord.uid).set({
            name,
            email,
            role,
            departmentId: role === "super_admin" ? "" : departmentId,
            departmentName: role === "super_admin" ? "" : departmentName,
            status,
            totalPoints,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        return NextResponse.json({ ok: true })
    } catch (error: unknown) {
        console.error("Failed to create user:", error)

        const code =
            typeof error === "object" &&
                error !== null &&
                "code" in error &&
                typeof (error as { code?: unknown }).code === "string"
                ? (error as { code: string }).code
                : ""

        if (code === "auth/email-already-exists") {
            return NextResponse.json(
                { ok: false, error: "That email address already exists." },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { ok: false, error: "Failed to create user." },
            { status: 500 }
        )
    }
}