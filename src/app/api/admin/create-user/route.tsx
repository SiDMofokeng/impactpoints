// FILE: src/app/api/admin/create-user/route.ts

import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

type UserRole = "super_admin" | "department_head" | "employee"
type UserStatus = "active" | "inactive" | "suspended"

type CreateUserBody = {
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

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CreateUserBody

        const name = body.name?.trim() ?? ""
        const email = body.email?.trim().toLowerCase() ?? ""
        const password = body.password?.trim() ?? ""
        const role = body.role
        const status = body.status
        const departmentId = body.departmentId?.trim() ?? ""
        const departmentName = body.departmentName?.trim() ?? ""
        const departmentCode = body.departmentCode?.trim() ?? ""
        const totalPoints =
            typeof body.totalPoints === "number" && body.totalPoints >= 0
                ? body.totalPoints
                : 0

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
            role !== "super_admin" &&
            role !== "department_head" &&
            role !== "employee"
        ) {
            return NextResponse.json(
                { ok: false, error: "Invalid role selected." },
                { status: 400 }
            )
        }

        if (
            status !== "active" &&
            status !== "inactive" &&
            status !== "suspended"
        ) {
            return NextResponse.json(
                { ok: false, error: "Invalid status selected." },
                { status: 400 }
            )
        }

        const departmentRequired =
            role === "department_head" || role === "employee"

        if (departmentRequired && !departmentId) {
            return NextResponse.json(
                { ok: false, error: "Department is required for this role." },
                { status: 400 }
            )
        }

        let createdUserId = ""

        try {
            const createdUser = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                disabled: status !== "active",
            })

            createdUserId = createdUser.uid

            await adminDb.collection("users").doc(createdUser.uid).set({
                name,
                email,
                role,
                status,
                departmentId: role === "super_admin" ? "" : departmentId,
                departmentName: role === "super_admin" ? "" : departmentName,
                departmentCode: role === "super_admin" ? "" : departmentCode,
                totalPoints,
                isDeleted: false,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            })

            return NextResponse.json({
                ok: true,
                uid: createdUser.uid,
            })
        } catch (error: unknown) {
            if (createdUserId) {
                try {
                    await adminAuth.deleteUser(createdUserId)
                } catch {
                    // ignore rollback failure
                }
            }

            const code =
                typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    typeof (error as { code?: unknown }).code === "string"
                    ? (error as { code: string }).code
                    : ""

            if (code === "auth/email-already-exists") {
                return NextResponse.json(
                    { ok: false, error: "A user with this email already exists." },
                    { status: 409 }
                )
            }

            console.error("Failed to create user:", error)

            return NextResponse.json(
                { ok: false, error: "Failed to create user." },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error("Invalid create-user request:", error)

        return NextResponse.json(
            { ok: false, error: "Invalid request." },
            { status: 400 }
        )
    }
}