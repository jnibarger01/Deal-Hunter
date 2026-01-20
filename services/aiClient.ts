import { Deal, RepairInsight, NegotiationScript } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export const analyzeDealForRepair = async (deal: Deal): Promise<RepairInsight> => {
    const token = localStorage.getItem('token'); // Assuming auth is handled via localStorage 'token'

    const response = await fetch(`${API_BASE}/repair-hints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
            title: deal.title,
            description: deal.description,
            symptoms: deal.condition,
            itemType: deal.category
        })
    });

    if (!response.ok) {
        throw new Error('Failed to analyze deal');
    }

    return response.json();
};

export const generateNegotiationStrategy = async (deal: Deal): Promise<NegotiationScript> => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/negotiate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
            title: deal.title,
            description: deal.description,
            askingPrice: deal.price,
            tone: 'professional' // Default tone
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate negotiation strategy');
    }

    return response.json();
};

export const getPriceTrend = async (title: string): Promise<string> => {
    // Placeholder - current backend might not support this specific unstructured call yet
    // or it maps to 'summarize' or a new endpoint.
    // Based on code review, there isn't a direct 'trend' endpoint, but 'summarize' could work 
    // or we might need to add one. For now, we'll keep it simple or omit if not critically used.
    // Let's use 'summarize' as a fallback? Or just return a placeholder to avoid breaking build.
    return "Market trend analysis from backend coming soon.";
};
