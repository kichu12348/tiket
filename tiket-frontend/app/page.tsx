import { getRouteApi } from "@tanstack/react-router";
import styles from "./LandingPage.module.css";
import Navbar from "@/components/Navbar";
import AsciiBackground from "@/components/AsciiBackground";
import LandingHero from "@/components/LandingHero";

const routeApi = getRouteApi("/");

export default function LandingPage() {
  const context = (routeApi.useRouteContext() || {}) as { token?: string };
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
