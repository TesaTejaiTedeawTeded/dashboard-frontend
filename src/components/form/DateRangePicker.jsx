import { forwardRef } from "react";
import { Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const formatDisplay = (value) => {
    if (!value) return "Select date & time";

    const date =
        value instanceof Date
            ? value
            : typeof value === "string"
            ? new Date(value)
            : null;

    if (!date || Number.isNaN(date.getTime())) {
        return "Select date & time";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const DateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
    <button
        type="button"
        onClick={onClick}
        ref={ref}
        className="date-input"
        aria-label={placeholder}
    >
        <span className="date-input__value">{formatDisplay(value)}</span>
        <span className="date-input__icon" aria-hidden="true">
            <Calendar size={16} />
        </span>
    </button>
));
DateInput.displayName = "DateInput";

const DateRangePicker = ({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onFetch,
}) => (
    <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col items-center gap-4 lg:flex-row">
            <Field label="Start">
                <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    showTimeSelect
                    dateFormat="dd MMM yyyy HH:mm"
                    calendarClassName="date-picker-popover"
                    customInput={<DateInput placeholder="Select start date" />}
                />
            </Field>

            <Field label="End">
                <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    showTimeSelect
                    dateFormat="dd MMM yyyy HH:mm"
                    calendarClassName="date-picker-popover"
                    customInput={<DateInput placeholder="Select end date" />}
                />
            </Field>

            <button
                type="button"
                onClick={onFetch}
                className="glass-button w-full lg:w-auto mt-5"
            >
                Load history
            </button>
        </div>

        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 text-center lg:text-left">
            All timestamps in local time · includes seconds for precise auditing
        </p>
    </div>
);

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-2 flex-1 min-w-[220px] text-xs uppercase tracking-[0.3em] text-slate-300">
        {label}
        {children}
    </label>
);

export default DateRangePicker;
