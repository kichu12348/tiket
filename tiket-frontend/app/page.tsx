import styles from "./LandingPage.module.css";
import Navbar from "@/components/Navbar";
import AsciiBackground from "@/components/AsciiBackground";
import LandingHero from "@/components/LandingHero";
import { cookies } from "next/headers";
import { TOKEN_KEY } from "@/constants/config";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

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
