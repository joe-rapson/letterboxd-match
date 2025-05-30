import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';

const getLastPage = async (page: Page): Promise<number> => {
    /**
     * Gets the index of the last page when split across multiple pages
     * 
     * @param page - page object 
     * @returns integer value for last page in list
     */
    const lastPageLink = await page.$('.paginate-pages ul li:last-of-type a');
    if (!lastPageLink) {
        return 1;
    }

    const href = await lastPageLink.evaluate(el => el.getAttribute('href'));
    const match = href?.match(/page\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

const fetchPaths = async (page: Page): Promise<string[]> => {
    /**
     * Watchlist is spread across multiple pages in a posterlist, so each page must be fetched separately
     * 
     * @param page - page content to fetch films from
     * @returns paths of films
     */
    await page.waitForSelector('.poster-list', { timeout: 15000 });

    const filmPaths: string[] = await page.$$eval(
        '.poster-list li a.frame',
        anchors => anchors.map(a => a.getAttribute('href')).filter((href): href is string => Boolean(href))
    );

    return filmPaths;
};

const getWatchlist = async (user: string): Promise<string[]> => {
    /**
     * Gets the path to every film in a user's watchlist
     * 
     * @param url - Username
     * @returns array of all film paths in watchlist
     */
    const filmPaths: string[] = [];
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless: true});
    const page = await browser.newPage();
    await page.goto(`https://letterboxd.com/${user}/watchlist/`);
    await page.content();

    const maxPage = await getLastPage(page);
    if (maxPage) {
        for (let i = 1; i <= maxPage; i++) {
            await page.goto(`https://letterboxd.com/${user}/watchlist/page/${i}/`, { waitUntil: 'networkidle2' });
            await page.content();
            const pagePaths = await fetchPaths(page);
            if (pagePaths) {
                filmPaths.push(...pagePaths);
            }
        }
    }
    await browser.close();
    return filmPaths;
};

function intersection(a: string[], b: string[]): string[] {
    const setA = new Set(a);
    return b.filter(value => setA.has(value));
}

export const intersectWatchlists = async (users: string[]): Promise<string[]> => {
    /**
     * Finds the common watchlist items from a group of users
     * 
     * @param users - users to compare
     * @returns common items
     */
    const userWatchlists: string[][] = [];
    for (let i = 0; i < users.length; i++) {
        const userWatchlist = await getWatchlist(users[i]);
        userWatchlists.push(userWatchlist);
    }

    let common = userWatchlists[0];
    for (let i = 1; i < userWatchlists.length; i++) {
        common = intersection(common, userWatchlists[i]);
    }
    return common;
};