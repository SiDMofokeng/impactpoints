"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, limit, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function FirebaseCheckPage() {
    const [status, setStatus] = useState("Checking Firebase connection...")
    const [message, setMessage] = useState("")

    useEffect(() => {
        async function checkConnection() {
            try {
                const q = query(collection(db, "test"), limit(1))
                const snapshot = await getDocs(q)

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0].data()
                    setMessage(String(doc.message ?? "No message field found"))
                } else {
                    setMessage("No documents found in test collection")
                }

                setStatus("Firebase Firestore connection successful.")
            } catch (error) {
                console.error(error)
                setStatus("Firebase Firestore connection failed.")
                setMessage("")
            }
        }

        checkConnection()
    }, [])

    return (
        <section className="flex min-h-[70vh] items-center">
            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                    Firebase Check
                </p>
                <h1 className="text-3xl font-bold tracking-tight">Connection Test</h1>
                <p className="text-muted-foreground">{status}</p>
                {message ? (
                    <p className="text-sm font-medium">Message from Firestore: {message}</p>
                ) : null}
            </div>
        </section>
    )
}