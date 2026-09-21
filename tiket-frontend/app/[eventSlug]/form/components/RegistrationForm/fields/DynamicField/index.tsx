import { FieldRendererProps } from "../../types";
import RatingField from "../RatingField";
import SelectField from "../SelectField";
import InputField from "../InputField";
import DateTimeField from "../DateTimeField";
import PhoneField from "../PhoneField";

const SELECT_TYPES = new Set([
  "single_select",
  "multi_select",
  "radio",
  "select",
  "checkbox",
]);

const DATE_TIME_TYPES = new Set(["date", "datetime", "time"]);

/**
 * Open/Closed router: maps a field's type to the correct renderer.
 * Adding a new field type requires only adding a new renderer file
 * and a new branch here — existing renderers are untouched.
 */
export default function DynamicField(props: FieldRendererProps) {
  const { field } = props;

  if (SELECT_TYPES.has(field.fieldType)) {
    return <SelectField {...props} />;
  }

  if (field.fieldType === "rating") {
    return <RatingField {...props} />;
  }

  if (DATE_TIME_TYPES.has(field.fieldType)) {
    return <DateTimeField {...props} />;
  }

  const isPhone =
    field.fieldType === "phone" ||
    field.name?.toLowerCase() === "phone" ||
    field.label?.toLowerCase() === "phone";

  if (isPhone) {
    return <PhoneField {...props} />;
  }

  // Default: text, email, number, url, long_text
  return <InputField {...props} />;
}
