import { FaUserCheck } from "react-icons/fa";
import styles from "./ApprovalBanner.module.css";

export default function ApprovalBanner() {
  return (
    <div className={styles.approvalBanner}>
      <FaUserCheck size={16} />
      <div>
        <span className={styles.approvalTitle}>Approval Required</span>
        <span className={styles.approvalSub}>
          Your registration is subject to host approval.
        </span>
      </div>
    </div>
  );
}
