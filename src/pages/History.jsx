import { useState } from "react";
import GlassPanel from "../components/ui/GlassPanel.jsx";
import DateRangePicker from "../components/form/DateRangePicker.jsx";
import { fetchMessagesInRange } from "../services/api.js";

const History = () => {
    const [messages, setMessages] = useState([]);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const loadHistory = async () => {
        const data = await fetchMessagesInRange(startDate, endDate);
        setMessages(data);
    };

    return (
        <div className="page-stack">
            <header className="page-header">
                <p className="page-eyebrow">Archive</p>
                <div>
                    <h1 className="page-title">Historical telemetry</h1>
                    <p className="page-subtitle">
                        Query retained MQTT payloads to trace the full mission
                        timeline.
                    </p>
                </div>
            </header>

            <GlassPanel className="p-6 space-y-6">
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    onFetch={loadHistory}
                />

                <div className="glass-scroll max-h-[420px] divide-y divide-white/5">
                    {messages.length === 0 ? (
                        <p className="text-slate-300 text-center py-12 text-sm tracking-wide">
                            Select a range to load archived events.
                        </p>
                    ) : (
                        messages.map((msg, idx) => (
                            <article
                                key={`${msg.topic}-${idx}`}
                                className="py-4 flex flex-col gap-1"
                            >
                                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                                    <span>{msg.topic}</span>
                                    <span>
                                        {new Date(
                                            msg.createdAt
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-slate-50 font-medium">
                                    {msg.payload}
                                </p>
                            </article>
                        ))
                    )}
                </div>
            </GlassPanel>
        </div>
    );
};

export default History;
