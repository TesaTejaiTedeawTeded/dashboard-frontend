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
    const sharedImage = buildImageUrl(payload.image?.path);

    const objects = objectsRaw.map((object) => ({
        objId: object.obj_id || object.id || object.objId || crypto.randomUUID(),
        lat: object.lat ?? null,
        long: object.lng ?? object.long ?? null,
        alt: object.alt ?? null,
        imgPath: buildImageUrl(object.imgPath) || sharedImage || null,
    }));

    return {
        timestamp,
        camLat: payload.camera?.lat ?? payload.camLat ?? null,
        camLong: payload.camera?.lng ?? payload.camera?.long ?? payload.camLong ?? null,
        count: objects.length,
        objects,
    };
};
