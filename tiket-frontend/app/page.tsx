import styles from "./LandingPage.module.css";
import GlassmorphismTicket from "./Ticket";
import Navbar from "@/components/Navbar";
import { FiArrowRight } from "react-icons/fi";
import Link from "next/link";
import { cookies } from "next/headers";
import { TOKEN_KEY } from "@/constants/config";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  return (
    <div className={styles.container}>
      <Navbar isAuthenticated={!!token} />

      <main className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <h1 className={styles.title}>
            Less time managing.
            <br />
            More time <span>experiencing.</span>
          </h1>
          <p className={styles.description}>
            Create, manage and sell tickets for any kind of event.
            <br />
            All the tools you need. None of the clutter.
          </p>

          <div className={styles.ctaGroup}>
            <Link
              href={token ? "/create" : "/signin"}
              className={styles.primaryBtn}
            >
              Create Event <FiArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.ticketWrapper}>
            <GlassmorphismTicket />
          </div>
        </div>
      </main>
    </div>
  );
}
