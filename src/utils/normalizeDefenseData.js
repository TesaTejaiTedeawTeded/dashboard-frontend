const buildImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const apiBase =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_MOCK_URL?.replace("/api", "") ||
        "";
    return `${apiBase}${path}`;
};

export const normalizeDefenseData = (data) => {
    if (!data) return null;

    const payload = data.data || data;
    const timestamp = payload.timestamp || new Date().toISOString();
    const objectsRaw = Array.isArray(payload.objects) ? payload.objects : [];
    const sharedImage = buildImageUrl(
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
        imagePath: sharedImage,
        count: objects.length,
        objects,
    };
};
