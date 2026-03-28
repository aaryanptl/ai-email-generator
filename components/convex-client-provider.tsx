"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { createContext, type ReactNode, useContext } from "react";
import { authClient } from "@/lib/auth-client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const AuthBootstrapContext = createContext({ hasInitialToken: false });

export function useAuthBootstrap() {
	return useContext(AuthBootstrapContext);
}

export function ConvexClientProvider({
	children,
	initialToken,
}: {
	children: ReactNode;
	initialToken?: string | null;
}) {
	const hasInitialToken = Boolean(initialToken);

	if (!convex) {
		return (
			<AuthBootstrapContext.Provider value={{ hasInitialToken }}>
				{children}
			</AuthBootstrapContext.Provider>
		);
	}

	return (
		<AuthBootstrapContext.Provider value={{ hasInitialToken }}>
			<ConvexBetterAuthProvider
				client={convex}
				authClient={authClient}
				initialToken={initialToken ?? undefined}
			>
				{children}
			</ConvexBetterAuthProvider>
		</AuthBootstrapContext.Provider>
	);
}
