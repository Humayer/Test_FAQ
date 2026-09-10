import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { WelcomeExperience } from "@/components/chat/WelcomeExperience";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <WelcomeExperience />
      <SiteFooter />
    </div>
  );
}
