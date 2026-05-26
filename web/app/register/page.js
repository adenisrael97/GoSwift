import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account | GoSwift",
  description: "Create your GoSwift account to start sending and tracking deliveries.",
};

export default function RegisterPage() {
  // Suspense boundary: RegisterForm reads useSearchParams() for the ?next= param.
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
