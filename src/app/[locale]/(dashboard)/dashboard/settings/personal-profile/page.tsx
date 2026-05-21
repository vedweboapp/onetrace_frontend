import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PersonalProfileDetails from "@/features/settings/personal-profile/components/personal-profile-details";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function PersonalProfilePage() {
    return <PersonalProfileDetails />;
}
