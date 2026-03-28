"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
	const isDark = mounted && resolvedTheme === "dark";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="rounded-full h-9 w-9 bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? (
				<Sun weight="bold" className="size-4 opacity-70" />
			) : (
				<Moon weight="bold" className="size-4 opacity-70" />
			)}
		</Button>
	);
}
