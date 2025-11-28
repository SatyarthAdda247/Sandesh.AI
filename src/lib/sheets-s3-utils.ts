// Google Sheets and AWS S3 utilities for direct integration

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 Configuration
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-1';
const AWS_S3_BUCKET = import.meta.env.VITE_AWS_S3_BUCKET || 'scriptiq-content';
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY || ''
    }
});

/**
 * Upload image to AWS S3
 * @param imageBlob - Image data as Blob
 * @param filename - Filename for the image
 * @returns Public URL of uploaded image
 */
export async function uploadImageToS3(imageBlob: Blob, filename: string): Promise<string> {
    try {
        const buffer = await imageBlob.arrayBuffer();

        const command = new PutObjectCommand({
            Bucket: AWS_S3_BUCKET,
            Key: `campaign-images/${filename}`,
            Body: new Uint8Array(buffer),
            ContentType: imageBlob.type || 'image/png',
            ACL: 'public-read'
        });

        await s3Client.send(command);

        // Return public URL
        return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/campaign-images/${filename}`;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error(`Failed to upload image to S3: ${error}`);
    }
}

/**
 * Push campaigns directly to Google Sheets
 * @param campaigns - Array of campaign data
 * @param sheetId - Google Sheet ID
 * @param range - Sheet range (e.g., "Sheet1!A:H")
 * @returns Success status
 */
export async function pushToGoogleSheets(
    campaigns: any[],
    sheetId: string,
    range: string = 'Sheet1!A:H'
): Promise<{ success: boolean; message: string }> {
    try {
        // For now, we'll use Google Sheets API with an API key
        // This requires the sheet to be publicly writable or use OAuth

        // Alternative: Use Google Apps Script Web App as intermediary
        // This is simpler and doesn't require complex OAuth setup

        const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

        if (!GOOGLE_APPS_SCRIPT_URL) {
            throw new Error('Google Apps Script URL not configured');
        }

        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'appendRows',
                sheetId: sheetId,
                range: range,
                values: campaigns.map(c => [
                    c.id,
                    c.link,
                    c.title,
                    c.image_link,
                    c.Message,
                    c['Message Summary'],
                    c['Message title'],
                    c.CTA
                ])
            })
        });

        return {
            success: true,
            message: `Successfully pushed ${campaigns.length} campaigns to Google Sheets`
        };
    } catch (error) {
        console.error('Google Sheets push error:', error);
        return {
            success: false,
            message: `Failed to push to Google Sheets: ${error}`
        };
    }
}

/**
 * Simple direct append using Google Sheets API v4
 * Requires API key and publicly writable sheet
 */
export async function appendToSheetDirect(
    campaigns: any[],
    sheetId: string,
    apiKey: string
): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:H:append?valueInputOption=RAW&key=${apiKey}`;

    const values = campaigns.map(c => [
        c.id,
        c.link,
        c.title,
        c.image_link,
        c.Message,
        c['Message Summary'],
        c['Message title'],
        c.CTA
    ]);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            values: values
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Sheets API error: ${error}`);
    }
}
