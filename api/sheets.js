const SHEET_DB_API = process.env.SHEETDB_API_URL;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!SHEET_DB_API) {
            return res.status(500).json({ error: 'SheetDB API URL not configured' });
        }

        const response = await fetch(SHEET_DB_API);
        if (!response.ok) {
            throw new Error(`SheetDB API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache for 5 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching SheetDB data:', error);
        return res.status(500).json({ error: error.message });
    }
}
