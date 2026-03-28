import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { isAuthenticated } from "@/lib/auth-server";

export default async function LoginPage() {
	if (await isAuthenticated()) {
		redirect("/chat");
	}

	return <LoginScreen />;
}
