import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In | GoSwift",
  description: "Sign in to your GoSwift account with your email or phone number.",
};

export default function LoginPage() {
  // Suspense boundary: LoginForm reads useSearchParams() for the ?next= param.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
