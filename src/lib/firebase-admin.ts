import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

const app =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential:
                projectId && clientEmail && privateKey
                    ? cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    })
                    : undefined,
        })

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
