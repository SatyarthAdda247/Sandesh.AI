import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY') || 'AIzaSyA7Ue38eVLxAZpeosiAeZGlAgLnL28Hb6Y';
const SHEET_ID = '1SrKyVoOeldvL4PYQWq8X3pL-BGW6SweZ7y0l0Unrn8k';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { campaigns } = await req.json();

        if (!campaigns || campaigns.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No campaigns provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // First, fetch existing data from the sheet to get links by vertical
        const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${GOOGLE_SHEETS_API_KEY}`;
        const readResponse = await fetch(readUrl);
        const sheetData = await readResponse.json();

        // Create a map of vertical to link from existing data
        const verticalLinkMap: Record<string, string> = {};
        if (sheetData.values && sheetData.values.length > 1) {
            // Skip header row (index 0)
            for (let i = 1; i < sheetData.values.length; i++) {
                const row = sheetData.values[i];
                if (row[0] && row[1]) {
                    // Extract vertical from id (e.g., "BANKING1" -> "BANKING")
                    const id = row[0];
                    const verticalName = id.replace(/\d+$/, ''); // Remove trailing numbers
                    const link = row[1];
                    if (!verticalLinkMap[verticalName]) {
                        verticalLinkMap[verticalName] = link;
                    }
                }
            }
        }

        // Prepare rows for Google Sheets
        const rows = campaigns.map((campaign: any, index: number) => {
            // Generate ID: {VERTICAL}{counter}
            const verticalId = campaign.vertical.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            const id = `${verticalId}${index + 1}`;

            // Get link from existing data or use default
            const link = verticalLinkMap[verticalId] || 'https://www.adda247.com/testprime/79075/TEST-PRIME';

            // Prepare row data
            return [
                id,                                                          // id
                link,                                                        // link (from sheet or default)
                'title',                                                     // title (placeholder)
                'image_link',                                                // image_link (placeholder)
                campaign.message || campaign.body || '',                     // Message
                'Mock Test',                                                 // Message Summary
                campaign.messageTitle || campaign.headline || '',            // Message title
                campaign.cta || 'Use Code: TPFLASH'                         // CTA
            ];
        });

        // Append to Google Sheets using API
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1:append?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`;

        const response = await fetch(appendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: rows
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Sheets API Error:', errorText);
            return new Response(
                JSON.stringify({ error: `Google Sheets API Error: ${errorText}` }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();

        return new Response(
            JSON.stringify({
                success: true,
                updatedRows: data.updates?.updatedRows || rows.length,
                updatedRange: data.updates?.updatedRange || 'Sheet1'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Function error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
