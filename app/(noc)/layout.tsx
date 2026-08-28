import { AppShell } from "@/components/layout/app-shell";

export default function NocLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
