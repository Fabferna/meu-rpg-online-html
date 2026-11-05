import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar — Aethelgard Online" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
