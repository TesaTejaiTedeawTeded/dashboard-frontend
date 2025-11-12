const toList = (value) => {
    if (Array.isArray(value)) {
        return value.filter(
            (item) => item !== undefined && item !== null && item !== ""
        );
    }

    if (value === undefined || value === null || value === "") {
        return [];
    }

    return [value];
};

export const createCameraConfig = ({ mock, real, all = [] } = {}) => ({
    mock: toList(mock),
    real: toList(real),
    all: toList(all),
});

export const hasCameraConfig = (config = {}) =>
    Boolean(
        (config.mock && config.mock.length) ||
            (config.real && config.real.length) ||
            (config.all && config.all.length)
    );
