import DatePicker from "../DatePicker";
import TimePicker from "../TimePicker";
import TimezonePicker from "../TimezonePicker";
import styles from "./DateRangeBlock.module.css";

interface DateRangeBlockProps {
  startDate: string;
  endDate: string;
  timezone: string;
  timezonePickerDisabled?: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTimezoneChange: (tz: string) => void;
}

export default function DateRangeBlock({
  startDate,
  endDate,
  timezone,
  timezonePickerDisabled = false,
  onStartDateChange,
  onEndDateChange,
  onTimezoneChange,
}: DateRangeBlockProps) {
  return (
    <div className={styles.block}>
      {/* Left: timeline + inputs */}
      <div className={styles.inputsWrapper}>
        {/* Vertical connector */}
        <div className={styles.timeConnector}>
          <div className={styles.dotFilled}></div>
          <div className={styles.line}></div>
          <div className={styles.dotEmpty}></div>
        </div>

        {/* Start / End rows */}
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.label}>Start</span>
            <div className={styles.pickersBox}>
              <DatePicker date={startDate} onChange={onStartDateChange} />
              <TimePicker date={startDate} onChange={onStartDateChange} />
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>End</span>
            <div className={styles.pickersBox}>
              <DatePicker date={endDate} onChange={onEndDateChange} />
              <TimePicker date={endDate} onChange={onEndDateChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Right: timezone picker */}
      <TimezonePicker
        value={timezone}
        onChange={onTimezoneChange}
        disabled={timezonePickerDisabled}
      />
    </div>
  );
}
