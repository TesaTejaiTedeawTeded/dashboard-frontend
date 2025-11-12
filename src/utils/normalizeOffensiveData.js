const toNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const ensureTimestamp = (value) => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const extractObjects = (payload = {}) => {
    if (Array.isArray(payload.objects)) return payload.objects;
    if (Array.isArray(payload.detections)) return payload.detections;
    if (Array.isArray(payload.data?.objects)) return payload.data.objects;
    if (Array.isArray(payload.data?.detections)) return payload.data.detections;
    if (payload.object) return [payload.object];
    return [];
};

export const normalizeOffensiveData = (data) => {
    const root = data?.data || data || {};
    const baseTimestamp =
        root.timestamp ||
        root.createdAt ||
        root.detectedAt ||
        new Date().toISOString();

    const extracted = extractObjects(root);

    if (!extracted.length) {
        const fallback = {
            droneId:
                root.droneId ||
                root.drone_id ||
                root.objId ||
                root.obj_id ||
                root.id,
            lat: root.lat,
            long: root.long ?? root.lng ?? root.lon,
            alt: root.alt,
            timestamp: root.timestamp,
        };
        if (
            fallback.droneId &&
            fallback.lat !== undefined &&
            fallback.long !== undefined
        ) {
            extracted.push(fallback);
        }
    }

    const objects = extracted
        .map((object) => {
            const lat = toNumber(object.lat);
            const long =
                toNumber(object.long) ??
                toNumber(object.lng) ??
                toNumber(object.lon);
            if (lat === null || long === null) return null;

            return {
                id:
                    object.droneId ||
                    object.drone_id ||
                    object.objId ||
                    object.obj_id ||
                    object.id ||
                    crypto.randomUUID(),
                droneId:
                    object.droneId ||
                    object.drone_id ||
                    object.objId ||
                    object.obj_id ||
                    object.id ||
                    null,
                lat,
                long,
                alt: toNumber(object.alt),
                timestamp: ensureTimestamp(object.timestamp || baseTimestamp),
            };
        })
        .filter(Boolean);

    return {
        timestamp: ensureTimestamp(baseTimestamp),
        objects,
    };
};

export default normalizeOffensiveData;
