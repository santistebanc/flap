/**
 * Main function to fetch all flights from Skyscanner by polling until finished
 */
import { SearchParams, ScraperTools } from '../shared/types';
import { getRequest } from './http/get-request';
import { pollRequest } from './http/poll-request';

export async function fetchSkyscanner(params: SearchParams = {}, tools: ScraperTools): Promise<{ dealsCount: number; success: boolean; error?: string }> {
    const allFlights: any[] = [];

    try {
        // Step 1: Make initial request to get data object and cookies
        console.log('Step 1: Making initial getRequest...');
        const initialResult = await getRequest(params);

        if (!initialResult.success) {
            return {
                dealsCount: 0,
                success: false,
                error: `Initial request failed: ${initialResult.statusText}`
            };
        }

        if (!initialResult.data || !initialResult.data['_token']) {
            return {
                dealsCount: 0,
                success: false,
                error: 'No data object or token found in initial response'
            };
        }

        const dataObject = initialResult.data;
        let cookies = initialResult.cookies || '';
        const refererUrl = initialResult.url; // Get the initial request URL for referer header

        console.log('Initial request successful, token obtained. Starting polling...');
        console.log('Using referer URL:', refererUrl);

        // Step 2: Poll repeatedly until finished
        let finished = false;
        let pollCount = 0;
        const maxPolls = 20; // Safety limit to prevent infinite loops
        let lastPollResult: { dealsCount?: number; finished?: boolean; success: boolean; statusText?: string; cookies?: string } | null = null;

        while (!finished && pollCount < maxPolls) {
            pollCount++;
            console.log(`Poll attempt ${pollCount}...`);

            const pollResult = await pollRequest(dataObject, cookies, refererUrl, params, tools);
            lastPollResult = pollResult;

            if (!pollResult.success) {
                console.error(`Poll ${pollCount} failed:`, pollResult.statusText);
                break;
            }

            // Update cookies from the poll response for next iteration
            if (pollResult.cookies) {
                cookies = pollResult.cookies;
                console.log(`Poll ${pollCount}: Updated cookies for next request`);
            }

            // Check if finished
            finished = pollResult.finished === true;

            if (finished) {
                // Only extract flights from the final response (when finished is Y)
                if (pollResult.dealsCount !== undefined) {
                    console.log(`Poll ${pollCount}: Extracted ${pollResult.dealsCount} deals from final response`);
                } else {
                    console.log(`Poll ${pollCount}: No deals extracted from final response`);
                }
                console.log(`Polling complete after ${pollCount} attempts. Total deals: ${pollResult.dealsCount || 0}`);
            } else {
                // Skip flights from intermediate responses (N)
                console.log(`Poll ${pollCount}: Not finished yet (N), skipping flight extraction`);
                // Wait a bit before next poll to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (pollCount >= maxPolls && !finished) {
            console.warn(`Reached max poll limit (${maxPolls}) without finishing`);
        }

        const dealsCount = lastPollResult?.dealsCount || 0;
        return {
            dealsCount,
            success: true
        };

    } catch (error) {
        console.error('Error in fetchSkyscanner:', error);
        return {
            dealsCount: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

