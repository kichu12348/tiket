import { useState, useMemo } from "react";
import { Controller } from "react-hook-form";
import { ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import countryData from "@/data/countryDial.json";
import { FieldRendererProps } from "../../types";
import styles from "./PhoneField.module.css";

export interface CountryDial {
  name: string;
  code: string;
  dial_code?: string;
  image: string;
}

const ALL_COUNTRIES: CountryDial[] = (countryData as CountryDial[]).filter(
  (c) => !!c.dial_code,
);

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
};

export function getDefaultCountry(timezone?: string): CountryDial {
  if (timezone) {
    const codeFromMap = TIMEZONE_COUNTRY_MAP[timezone];
    if (codeFromMap) {
      const match = ALL_COUNTRIES.find((c) => c.code === codeFromMap);
      if (match) return match;
    }

    const parts = timezone.split("/");
    const city = parts[parts.length - 1]?.replace(/_/g, " ").toLowerCase();
    if (city) {
      const match = ALL_COUNTRIES.find(
        (c) =>
          c.name.toLowerCase().includes(city) || c.code.toLowerCase() === city,
      );
      if (match) return match;
    }
  }

  const india = ALL_COUNTRIES.find((c) => c.code === "IN");
  return india || ALL_COUNTRIES[0];
}

export default function PhoneField({
  field,
  control,
  error,
  timezone,
}: FieldRendererProps) {
  const defaultCountry = useMemo(() => getDefaultCountry(timezone), [timezone]);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryDial>(defaultCountry);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES;
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.dial_code && c.dial_code.includes(q)),
    );
  }, [search]);

  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue=""
      render={({ field: f }) => {
        // Extract raw phone digits if value has dial code prefix
        const rawPhone = f.value
          ? f.value.replace(selectedCountry.dial_code || "", "").trim()
          : "";

        const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const num = e.target.value;
          const fullNumber = num
            ? `${selectedCountry.dial_code} ${num.trim()}`
            : "";
          f.onChange(fullNumber);
        };

        const handleSelectCountry = (country: CountryDial) => {
          setSelectedCountry(country);
          setOpen(false);
          const fullNumber = rawPhone ? `${country.dial_code} ${rawPhone}` : "";
          f.onChange(fullNumber);
        };

        return (
          <div
            className={`${styles.phoneContainer} ${
              error ? styles.inputError : ""
            }`}
          >
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={styles.countryTrigger}>
                  <img
                    src={selectedCountry.image}
                    alt={selectedCountry.name}
                    className={styles.flagImg}
                  />
                  <span className={styles.dialCode}>
                    {selectedCountry.dial_code}
                  </span>
                  <ChevronDown size={14} className={styles.chevronIcon} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 border-none bg-transparent"
                align="start"
              >
                <div className={styles.popoverBox}>
                  <div className={styles.searchBox}>
                    <Search size={14} className={styles.chevronIcon} />
                    <input
                      type="text"
                      placeholder="Search country or code..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={styles.searchInput}
                      autoFocus
                    />
                  </div>

                  <div className={styles.countryList}>
                    {filteredCountries.map((c) => (
                      <button
                        key={`${c.code}-${c.dial_code}`}
                        type="button"
                        className={`${styles.countryOption} ${
                          selectedCountry.code === c.code
                            ? styles.countryOptionActive
                            : ""
                        }`}
                        onClick={() => handleSelectCountry(c)}
                      >
                        <div className={styles.optionLeft}>
                          <img
                            src={c.image}
                            alt={c.name}
                            className={styles.flagImg}
                            loading="lazy"
                          />
                          <span className={styles.optionName}>{c.name}</span>
                        </div>
                        <span className={styles.optionDial}>{c.dial_code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <input
              type="tel"
              id={`field-${field.id}`}
              placeholder="Phone number"
              value={rawPhone}
              onChange={handlePhoneChange}
              className={styles.phoneInput}
              autoComplete="off"
            />
          </div>
        );
      }}
    />
  );
}
