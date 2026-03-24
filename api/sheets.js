import { google } from 'googleapis';

const sheets = google.sheets('v4');

export default async function handler(req, res) {
    const SHEET_ID = '1Iet_bH8mKKdFXNclf-nFGlFpcKSZt-zWUm7wu9a-Snk';
    const RANGE = 'Form Responses 1!A:E'; // Adjust based on your sheet name

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values || [];
        const headers = rows[0];
        const data = rows.slice(1).map(row => ({
            goToWord: row[1] || '',
            hasStrategy: row[2] || '',
            strategy: row[3] || '',
            attempts: parseInt(row[4]) || 0,
        }));

        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
