"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

interface LoginScreenProps {
	redirectTo?: string;
}

export function LoginScreen({
	redirectTo = "/chat",
}: LoginScreenProps) {
	const router = useRouter();
	const { isAuthenticated, isLoading } = useConvexAuth();

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.replace(redirectTo);
		}
	}, [isAuthenticated, isLoading, redirectTo, router]);

	const handleGoogleSignIn = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: redirectTo,
		});
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-6">
				<Card className="w-full max-w-sm border-border/70 bg-card/80 backdrop-blur">
					<CardHeader>
						<CardTitle>Checking session</CardTitle>
						<CardDescription>
							Please wait while we authenticate your account.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-6 py-10">
			<Card className="w-full max-w-md border-border/70 bg-card/90 backdrop-blur">
				<CardHeader className="space-y-3">
					<CardTitle className="text-2xl">Sign in to continue</CardTitle>
					<CardDescription>
						Use Google to access your saved chats and generated email
						templates.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={() => void handleGoogleSignIn()} className="w-full" size="lg">
						Continue with Google
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
