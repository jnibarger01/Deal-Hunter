// Basic in-memory location service for prototype parity. 
// In a real app, integrate with Prisma/DB.

interface Location {
    id: string;
    label: string;
    city?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    radiusMiles: number;
    filters?: any;
}

const locations: Location[] = [];
let nextId = 1;

// Mock geocoder since we don't have a real implementation file in this context
// The original used ./maps.js
const geocodeLocation = async (query: string) => {
    // Basic mock logic or use a real service if available
    // For now returning mock coords to bypass errors
    return { lat: 37.7749, lng: -122.4194, formatted: query };
};

export class LocationService {
    static list(): Location[] {
        return locations;
    }

    static getById(id: string): Location | undefined {
        return locations.find((item) => item.id === id);
    }

    static async create(payload: any): Promise<Location> {
        const { label, city, zip, lat, lng, radiusMiles = 25, filters } = payload;

        // Simple mock geocoding if lat/lng missing
        let finalLat = lat;
        let finalLng = lng;
        let finalLabel = label;

        if (finalLat == null || finalLng == null) {
            const geo = await geocodeLocation(zip || city || 'Unknown');
            finalLat = geo.lat;
            finalLng = geo.lng;
            finalLabel = label || geo.formatted;
        }

        const item: Location = {
            id: String(nextId++),
            label: finalLabel,
            city,
            zip,
            lat: finalLat,
            lng: finalLng,
            radiusMiles,
            filters
        };

        locations.push(item);
        return item;
    }

    static delete(id: string): void {
        const index = locations.findIndex((item) => item.id === id);
        if (index !== -1) {
            locations.splice(index, 1);
        }
    }
}
