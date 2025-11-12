const ensureLeadingSlash = (value) =>
    value.startsWith("/") ? value : `/${value}`;

const buildImageCandidates = (path) => {
    if (!path) return [];
    if (path.startsWith("http")) return [path];

    const normalizedPath = ensureLeadingSlash(path);
    const candidates = [];

    const rawBases = [
        import.meta.env.VITE_API_BASE_URL,
        import.meta.env.VITE_SOCKET_URL_REAL ||
            import.meta.env.VITE_SOCKET_URL_BACKEND,
        import.meta.env.VITE_SOCKET_URL_MOCK || import.meta.env.VITE_SOCKET_URL,
        import.meta.env.VITE_API_MOCK_URL?.replace(/\/api$/, ""),
    ];

    rawBases
        .filter(Boolean)
        .forEach((base) => {
            const cleanBase = base.replace(/\/$/, "");
            candidates.push(`${cleanBase}${normalizedPath}`);
        });

    candidates.push(normalizedPath);

    return [...new Set(candidates)];
};

export const normalizeDefenseData = (data) => {
    if (!data) return null;

    const payload = data.data || data;
    const timestamp = payload.timestamp || new Date().toISOString();
    const objectsRaw = Array.isArray(payload.objects) ? payload.objects : [];
    const sharedImageCandidates = buildImageCandidates(
        payload.imagePath || payload.image?.path
    );

    const toNumber = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    };

    const objects = objectsRaw.map((object) => ({
        objId:
            object.obj_id ||
            object.id ||
            object.objId ||
            crypto.randomUUID(),
        lat: toNumber(object.lat),
        long:
            toNumber(object.long) ??
            toNumber(object.lng) ??
            toNumber(object.lon),
        alt: toNumber(object.alt),
    }));

    return {
        timestamp,
        camLat:
            toNumber(payload.camera?.lat) ?? toNumber(payload.camLat) ?? null,
        camLong:
            toNumber(payload.camera?.lng ?? payload.camera?.long) ??
            toNumber(payload.camLong) ??
            null,
        imagePath: sharedImageCandidates[0] ?? null,
        imageCandidates: sharedImageCandidates,
        count: objects.length,
        objects,
    };
};
