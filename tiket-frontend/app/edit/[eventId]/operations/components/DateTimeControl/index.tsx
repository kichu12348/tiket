import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import styles from "../../Operations.module.css";
const times = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);
export default function DateTimeControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const date = value ? new Date(value) : undefined;
  const time = date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : "12:00";
  const changeDate = (selected?: Date) => { if (!selected) return; const [hours, minutes] = time.split(":").map(Number); selected.setHours(hours, minutes, 0, 0); onChange(selected.toISOString()); };
  const changeTime = (selected: string) => { const next = date || new Date(); const [hours, minutes] = selected.split(":").map(Number); next.setHours(hours, minutes, 0, 0); onChange(next.toISOString()); };
  return <div className={styles.form}><span>{label}</span><div className={styles.actions}>
    <Popover><PopoverTrigger asChild><Button type="button" variant="secondary" aria-label={`${label} date`}>{date ? date.toLocaleDateString() : "Any date"}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={date} onSelect={changeDate} /></PopoverContent></Popover>
    <Select value={time} onValueChange={changeTime}><SelectTrigger aria-label={`${label} time`}><SelectValue /></SelectTrigger><SelectContent className="scrollbar">{times.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent></Select>
    {value && <Button type="button" variant="secondary" onClick={() => onChange("")}>Clear</Button>}
  </div></div>;
}
