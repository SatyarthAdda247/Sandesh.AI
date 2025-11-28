// Configuration for Google Sheets and AWS S3
// Update these values with your actual credentials

export const GOOGLE_SHEETS_CONFIG = {
    // Get this from your Google Sheet URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
    SHEET_ID: import.meta.env.VITE_GOOGLE_SHEET_ID || '1BvZ8cJxKxQxKxQxKxQxKxQxKxQxKxQxKxQxKxQxKxQ', // REPLACE WITH ACTUAL SHEET ID

    // The name of the sheet/tab (e.g., "Sheet1", "Test Prime", etc.)
    SHEET_NAME: import.meta.env.VITE_GOOGLE_SHEET_NAME || 'Sheet1',

    // Google API Key (can use the same Gemini key temporarily)
    // For production, create a dedicated Google Sheets API key
    API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyA7Ue38eVLxAZpeosiAeZGlAgLnL28Hb6Y'
};

export const AWS_S3_CONFIG = {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
    bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'scriptiq-content'
};

// Instructions for setup:
//
// 1. GET YOUR GOOGLE SHEET ID:
//    - Open your Google Sheet
//    - Copy the ID from the URL (the long string between /d/ and /edit)
//    - Replace SHEET_ID above
//
// 2. MAKE SHEET PUBLICLY WRITABLE (for API key method):
//    - Click "Share" button
//    - Change to "Anyone with the link"
//    - Set permission to "Editor"
//    - Click "Done"
//
// 3. ENABLE GOOGLE SHEETS API:
//    - Go to https://console.cloud.google.com
//    - Enable "Google Sheets API"
//    - Create an API key (or use existing Gemini key)
//
// Alternative: Use Service Account for better security
// (requires more setup but doesn't need public write access)
