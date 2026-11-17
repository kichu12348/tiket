import { createFileRoute, redirect } from "@tanstack/react-router";
import styles from "@/app/LandingPage.module.css";
import Navbar from "@/components/Navbar";
import AsciiBackground from "@/components/AsciiBackground";
import LandingHero from "@/components/LandingHero";
import { getToken } from "@/lib/getToken";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const token = await getToken();
    if (token) {
      throw redirect({ to: "/home" });
    }
    return { token };
  },
  component: HomePage,
});

function HomePage() {
  const context = Route.useRouteContext();
  const token = context?.token;

  return (
    <>
      <AsciiBackground />
      <div className={styles.container}>
        <Navbar isAuthenticated={!!token} noHorizontalPadding />
        <main className={styles.mainContent}>
          <LandingHero isAuthenticated={!!token} />
        </main>
      </div>
    </>
  );
}
