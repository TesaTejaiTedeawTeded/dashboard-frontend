import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateRangePicker = ({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onFetch,
}) => (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <Field label="Start date">
            <DatePicker
                selected={startDate}
                onChange={setStartDate}
                showTimeSelect
                dateFormat="Pp"
                className="glass-input"
            />
        </Field>

        <Field label="End date">
            <DatePicker
                selected={endDate}
                onChange={setEndDate}
                showTimeSelect
                dateFormat="Pp"
                className="glass-input"
            />
        </Field>

        <button type="button" onClick={onFetch} className="glass-button w-full xl:w-auto">
            Load history
        </button>
    </div>
);

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-2 flex-1 min-w-[200px] text-xs uppercase tracking-[0.3em] text-slate-300">
        {label}
        {children}
    </label>
);

export default DateRangePicker;
