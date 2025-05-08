import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import axios from 'axios';
import { updateTextStatus } from '../services/ordersService';
import { fetchTranslatedContentFromUrl } from '../jobs/statusPoller';

const router = express.Router();

// Cache for the public key
let publicKeyCache: string = '';

// Helper function to fetch the public key
async function getTranslatedPublicKey(): Promise<string> {
    if (publicKeyCache && publicKeyCache.length > 0) {
        return publicKeyCache;
    }

    try {
        const response = await axios.get('https://api-sandbox.translated.com/v2/translated-rsa.pub');
        publicKeyCache = response.data;
        return publicKeyCache;
    } catch (error) {
        console.error('Error fetching Translated public key:', error);
        throw new Error('Could not retrieve Translated public key');
    }
}

router.post('/translation/delivery', async (req, res) => {
    const signature = req.headers['x-translated-signature'] as string;
    
    try {
        // Fetch the public key from the API
        const publicKey = await getTranslatedPublicKey();

        // Verify the JWT signature
        const decoded = jwt.verify(signature, publicKey, { algorithms: ['RS256'] });

        // Validate the customer ID
        if (decoded !== process.env.TOS_ID) {
            return res.status(403).send('Invalid customer ID');
        }

        // Process the translation event payload
        const events = req.body;
        for (const event of events) {
            if (event.event === 'translation') {
                console.log(`Translation received for content ID: ${event.id_content}`);
                if (event.translated_content) {
                    await updateTextStatus(event.id_content, 'delivered', event.translated_content);
                } else if (event.translated_content_url) {
                    try {
                        const translatedContent = await fetchTranslatedContentFromUrl(event.translated_content_url);
                        await updateTextStatus(event.id_content, 'delivered', translatedContent);
                    } catch (fetchError) {
                        console.error(`Failed to fetch translated content: ${fetchError}`);
                    }
                } else {
                    console.error('No translated content available in event payload');
                }
            }
        }

        res.status(200).send('Event received');
    } catch (err) {
        console.error('Error processing translation delivery:', err);
    }
});

export default router;
