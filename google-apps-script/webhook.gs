// Google Apps Script Code
// Deploy this as a Web App to enable direct Google Sheets push

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    const campaigns = data.campaigns;
    
    // Open your Google Sheet by ID
    const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Sheet ID
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Sheet1');
    
    // Prepare rows to append
    const rows = campaigns.map(c => [
      c.id,
      c.link,
      c.title,
      c.image_link,
      c.Message,
      c['Message Summary'],
      c['Message title'],
      c.CTA
    ]);
    
    // Append to sheet
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rowsAdded: rows.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Instructions:
// 1. Go to https://script.google.com
// 2. Create a new project
// 3. Paste this code
// 4. Replace YOUR_SHEET_ID_HERE with your actual Google Sheet ID
// 5. Deploy > New deployment
// 6. Type: Web app
// 7. Execute as: Me
// 8. Who has access: Anyone
// 9. Click "Deploy"
// 10. Copy the Web App URL
// 11. Add to .env.local: VITE_GOOGLE_APPS_SCRIPT_URL=your_web_app_url
