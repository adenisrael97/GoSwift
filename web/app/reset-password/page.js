import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set New Password | GoSwift",
  description: "Choose a new password for your GoSwift account.",
};

export default function ResetPasswordPage() {
  // Suspense boundary: ResetPasswordForm reads useSearchParams() for the
  // token_hash / code params from the recovery link.
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
