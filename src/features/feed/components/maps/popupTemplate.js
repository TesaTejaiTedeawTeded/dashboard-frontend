const sanitize = (value) => {
    if (value === undefined || value === null) return "-";
    return String(value);
};

export const buildPopupContent = ({
    title = "Telemetry",
    accent = "#38bdf8",
    rows = [],
    metaLabel = "Updated",
    metaValue,
}) => {
    const renderedRows = rows
        .filter((row) => row && row.label)
        .map(
            ({ label, value }) => `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <span style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(248,250,252,0.55);">
                        ${sanitize(label)}
                    </span>
                    <span style="font-size:13px;font-weight:600;color:#f8fafc;">
                        ${sanitize(value)}
                    </span>
                </div>
            `
        )
        .join("");

    const metaBlock =
        metaValue !== undefined && metaValue !== null
            ? `<p style="margin:10px 0 0 0;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(248,250,252,0.65);">
                    ${sanitize(metaLabel)} · ${sanitize(metaValue)}
                </p>`
            : "";

    return `
        <div style="
            min-width:210px;
            padding:14px 16px;
            border-radius:18px;
            background:rgba(2,6,23,0.92);
            border:1px solid ${accent}33;
            box-shadow:0 15px 45px rgba(2,6,23,0.55);
            backdrop-filter:blur(18px);
            color:#f8fafc;
            font-family:'Inter','Segoe UI',sans-serif;
        ">
            <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:${accent};">
                ${sanitize(title)}
            </p>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${renderedRows}
            </div>
            ${metaBlock}
        </div>
    `;
};

export default buildPopupContent;
