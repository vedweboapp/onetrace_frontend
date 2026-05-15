import React from "react";
import { 
  Minus, AlignLeft, Mail, Phone, List, Hash, 
  Calendar, Clock, ArrowUpDown, DollarSign, Circle,
  Percent, MapPin, CheckSquare, Link, Search,
  Calculator, User, FileUp, Image, BarChart3,
  Home, ListChecks, Globe, LucideIcon
} from "lucide-react";

interface FieldButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

// Field Button Component (reusable)
export const FieldButton: React.FC<FieldButtonProps> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center px-1 gap-1 py-3 border border-gray-300 bg-gray-100 rounded-[4px] hover:bg-gray-50 hover:border-gray-400 transition-all text-left w-full"
  >
    <Icon size={18} className="text-gray-600" />
    <span className="text-gray-700 font-medium truncate text-[12px]">{label}</span>
  </button>
);

export interface FieldConfigItem {
  key: string;
  type: string;
  label: string;
  icon: LucideIcon;
}

// Field Configuration Array
export const FormFieldsConfig: FieldConfigItem[] = [
  {
    key: "singleLine",
    type: "text",
    label: "Single Line",
    icon: Minus
  },
  {
    key: "multiLine",
    type: "multi-text",
    label: "Multi-Line",
    icon: AlignLeft
  },
  {
    key: "email",
    type: "email",
    label: "Email",
    icon: Mail
  },
  {
    key: "phone",
    type: "phone",
    label: "Phone",
    icon: Phone
  },
  {
    key: "pickList",
    type: "pick-list",
    label: "Pick List",
    icon: List
  },
  {
    key: "multiSelect",
    type: "multi-select",
    label: "Multi-Select",
    icon: ListChecks
  },
  {
    key: "date",
    type: "date",
    label: "Date",
    icon: Calendar
  },
  {
    key: "dateTime",
    type: "date-time",
    label: "Date/Time",
    icon: Clock
  },
  {
    key: "number",
    type: "number",
    label: "Number",
    icon: Hash
  },
  {
    key: "autoNumber",
    type: "auto-number",
    label: "Auto-Number",
    icon: ArrowUpDown
  },
  {
    key: "currency",
    type: "currency",
    label: "Currency",
    icon: DollarSign
  },
  {
    key: "decimal",
    type: "decimal",
    label: "Decimal",
    icon: Circle
  },
  {
    key: "percent",
    type: "percent",
    label: "Percent",
    icon: Percent
  },
  {
    key: "longInteger",
    type: "long-integer",
    label: "Long Integer",
    icon: MapPin
  },
  {
    key: "checkbox",
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare
  },
  {
    key: "url",
    type: "url",
    label: "URL",
    icon: Link
  },
  {
    key: "lookup",
    type: "lookup",
    label: "Lookup",
    icon: Search
  },
  {
    key: "user",
    type: "user",
    label: "User",
    icon: User
  },
  {
    key: "fileUpload",
    type: "file-upload",
    label: "File Upload",
    icon: FileUp
  },
  {
    key: "imageUpload",
    type: "image-upload",
    label: "Image Upload",
    icon: Image
  },
  {
    key: "country",
    type: "country",
    label: "Country",
    icon: Globe
  },
  {
    key: "multiSelectLookup",
    type: "multi-select-lookup",
    label: "Multi-Select Lookup",
    icon: ListChecks
  },
  {
    key: "receiver-lookup",
    type: "receiver-lookup",
    label: "Receiver Lookup",
    icon: Home,
  }
];

// Export individual button components (generated from config)
export const SingleLineButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Minus} label="Single Line" onClick={onClick} />
);

export const MultiLineButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={AlignLeft} label="Multi-Line" onClick={onClick} />
);

export const EmailButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Mail} label="Email" onClick={onClick} />
);

export const PhoneButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Phone} label="Phone" onClick={onClick} />
);

export const PickListButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={List} label="Pick List" onClick={onClick} />
);

export const MultiSelectButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={ListChecks} label="Multi-Select" onClick={onClick} />
);

export const DateButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Calendar} label="Date" onClick={onClick} />
);

export const DateTimeButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Clock} label="Date/Time" onClick={onClick} />
);

export const NumberButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Hash} label="Number" onClick={onClick} />
);

export const AutoNumberButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={ArrowUpDown} label="Auto-Number" onClick={onClick} />
);

export const CurrencyButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={DollarSign} label="Currency" onClick={onClick} />
);

export const DecimalButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Circle} label="Decimal" onClick={onClick} />
);

export const PercentButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Percent} label="Percent" onClick={onClick} />
);

export const LongIntegerButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={MapPin} label="Long Integer" onClick={onClick} />
);

export const CheckboxButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={CheckSquare} label="Checkbox" onClick={onClick} />
);

export const URLButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Link} label="URL" onClick={onClick} />
);

export const LookupButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Search} label="Lookup" onClick={onClick} />
);

export const FormulaButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Calculator} label="Formula" onClick={onClick} />
);

export const UserButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={User} label="User" onClick={onClick} />
);

export const FileUploadButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={FileUp} label="File Upload" onClick={onClick} />
);

export const ImageUploadButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Image} label="Image Upload" onClick={onClick} />
);

export const RollupSummaryButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={BarChart3} label="Rollup Summary" onClick={onClick} />
);

export const CountryButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={Globe} label="Country" onClick={onClick} />
);

export const MultiSelectLookupButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <FieldButton icon={ListChecks} label="Multi-Select Lookup" onClick={onClick} />
);