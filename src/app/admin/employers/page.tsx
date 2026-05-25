import { redirect } from "next/navigation";

export default function LegacyAdminEmployersPage() {
  redirect("/admin/organizations");
}
