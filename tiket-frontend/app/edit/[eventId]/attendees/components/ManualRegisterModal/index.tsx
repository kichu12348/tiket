import { useState } from "react";
import { UserPlus, Mail, User, Ticket, FileText } from "lucide-react";
import Modal from "@/components/Modal";
import Dropdown from "@/components/Dropdown";
import { Input } from "@/components/ui/input";
import { TicketType } from "@/types/ticketType";
import { ManualRegisterPayload } from "@/types/attendee";
import styles from "./ManualRegisterModal.module.css";

interface ManualRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketTypes: TicketType[];
  onSubmit: (payload: ManualRegisterPayload) => Promise<boolean>;
  isSubmitting: boolean;
}

export default function ManualRegisterModal({
  isOpen,
  onClose,
  ticketTypes,
  onSubmit,
  isSubmitting,
}: ManualRegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState(
    ticketTypes[0]?.id || "",
  );
  const [notes, setNotes] = useState("");

  const ticketTypeOptions = ticketTypes.map((t) => ({
    label: `${t.name} (₹${t.price})`,
    value: t.id,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedId = ticketTypeId || (ticketTypes[0]?.id ?? "");
    const success = await onSubmit({
      name,
      email,
      ticketTypeId: selectedId,
      notes,
    });

    if (success) {
      setName("");
      setEmail("");
      setNotes("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Attendee Manually"
      width={465}
      className={styles.modalContent}
      headerClassName={styles.modalHeaderStyle}
    >
      <div className={styles.modalScrollWrapper}>
        <form onSubmit={handleSubmit} className={styles.body}>
          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <User size={13} /> Full Name <span className={styles.req}>*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email Address */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <Mail size={13} /> Email Address <span className={styles.req}>*</span>
            </label>
            <Input
              type="email"
              placeholder="e.g. jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Ticket Type Dropdown */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <Ticket size={13} /> Ticket Type <span className={styles.req}>*</span>
            </label>
            <Dropdown
              options={ticketTypeOptions}
              value={ticketTypeId || (ticketTypes[0]?.id ?? "")}
              onChange={(val) => setTicketTypeId(val)}
              placeholder="Select Ticket Type"
              width="100%"
              btnWidth="100%"
            />
          </div>

          {/* Internal Notes */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <FileText size={13} /> Internal Note (Optional)
            </label>
            <textarea
              placeholder="e.g. VIP guest / Cash payment collected"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={styles.textarea}
            />
          </div>

          {/* Footer Submit Action */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.btnSecondary}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSubmitting}
            >
              <UserPlus size={15} />
              <span>{isSubmitting ? "Issuing Ticket..." : "Issue Ticket"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
