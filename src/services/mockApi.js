const API_URL = import.meta.env.VITE_API_MOCK_URL;

export const getOffCamInformation = async (camId, camToken) => {
    const res = await fetch(`${API_URL}/object-detection/info/${camId}`, {
        method: "GET",
        headers: {
            "x-camera-token": camToken,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`Error ${res.status}`);
    }

    const data = await res.json();
    return data;
};

export const getDefCamInformation = async (camId, camToken) => {
    const res = await fetch(`${API_URL}/object-detection/info/${camId}`, {
        method: "GET",
        headers: {
            "x-camera-token": camToken,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`Error ${res.status}`);
    }

    const data = await res.json();
    return data;
};
