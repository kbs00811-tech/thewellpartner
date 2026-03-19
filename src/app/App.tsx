import { RouterProvider } from "react-router";
import { Suspense } from "react";
import { router } from "./routes";
import { Loader2 } from "lucide-react";

function GlobalFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[var(--brand-blue)]" size={32} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<GlobalFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
