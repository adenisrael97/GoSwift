import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password | GoSwift",
  description: "Request a password reset link for your GoSwift account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
