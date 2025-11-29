/**
 * Find the first panel between a heading and the next heading of opposite type
 */
import * as cheerio from 'cheerio';
import { SearchParams } from '../../shared/types';

export interface PanelInfo {
    panel: cheerio.Cheerio<any>;
    headingIndex: number;
    nextHeadingIndex: number;
}

export function findPanelBetweenHeadings(
    $: cheerio.CheerioAPI,
    heading: cheerio.Cheerio<any>,
    direction: 'outbound' | 'return',
    searchModal: cheerio.Cheerio<any>
): PanelInfo | null {
    if (heading.length === 0) {
        return null;
    }

    // Find the next heading (of opposite type) to know where to stop
    const nextHeading = heading.nextAll('p._heading').filter((i, el) => {
        const text = $(el).text();
        // For outbound, stop at Return heading; for return, stop at Outbound heading
        if (direction === 'outbound') {
            return text.includes('Return');
        } else {
            return text.includes('Outbound');
        }
    }).first();

    // Get all siblings of the heading (they're all children of search_modal)
    const allSiblings = searchModal.children();

    // Find the index of our heading
    let headingIndex = -1;
    for (let i = 0; i < allSiblings.length; i++) {
        if (allSiblings[i] === heading[0]) {
            headingIndex = i;
            break;
        }
    }

    if (headingIndex === -1) {
        console.warn(`[Kiwi] Could not find ${direction} heading index`);
        return null;
    }

    // Find the index of the next heading (if it exists)
    let nextHeadingIndex = -1;
    if (nextHeading.length > 0) {
        for (let i = 0; i < allSiblings.length; i++) {
            if (allSiblings[i] === nextHeading[0]) {
                nextHeadingIndex = i;
                break;
            }
        }
    } else {
        nextHeadingIndex = allSiblings.length; // No next heading, go to end
    }

    if (nextHeading.length > 0 && nextHeadingIndex === -1) {
        console.warn(`[Kiwi] Could not find next heading index for ${direction}`);
        return null;
    }

    // Find the first panel between our heading and the next heading
    let firstPanel: cheerio.Cheerio<any> = $([]);
    for (let i = headingIndex + 1; i < nextHeadingIndex; i++) {
        const sibling = $(allSiblings[i]);
        if (sibling.is('div._panel')) {
            firstPanel = sibling;
            break;
        }
    }

    if (firstPanel.length === 0) {
        console.warn(`[Kiwi] No panel found between ${direction} heading (index ${headingIndex}) and next heading (index ${nextHeadingIndex})`);
        return null;
    }

    return {
        panel: firstPanel,
        headingIndex,
        nextHeadingIndex
    };
}

