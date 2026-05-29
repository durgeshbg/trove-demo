import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk as CPC } from "convex/react-clerk";
import { useAuth } from "@clerk/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function ConvexProviderWithClerk({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CPC client={convex} useAuth={useAuth}>
      {children}
    </CPC>
  );
}
