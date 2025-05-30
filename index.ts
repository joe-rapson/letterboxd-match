import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

//npx tsx index.ts
const getLastPage = async (page) => {
    /**
     * Gets the index of the last page when split across multiple pages
     * 
     * @param page - page object 
     * @returns integer value for last page in list
     */
    const lastPageHref = await page.$eval('.paginate-pages ul li:last-of-type a', el => el.getAttribute('href'));
    const match = lastPageHref ?.match(/page\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

const fetchPaths = async (page) => {
    /**
     * Watchlist is spread across multiple pages in a posterlist, so each page must be fetched seperately
     * 
     * @param page - page content to fetch films from
     * @returns paths of films
     */
    const filmPaths: string[] = []
    await page.waitForSelector('div.react-component.poster.film-poster.linked-film-poster');
    const posters = await page.$$('div.react-component.poster.film-poster.linked-film-poster');
    for (const poster of posters) {
        //uses elementhandle object to fetch href 
        const href = await poster.$eval('a.frame', el => el.getAttribute('href')); 
        if (href) {
            filmPaths.push(href)
        }
    }
    return filmPaths
} 

const getWatchlist = async (user) => {
    /**
     * Gets the path to every film in a user's watchlist
     * 
     * @param url - Username
     * @returns array of all 
     */
    let filmPaths: string[] = [] 
    //load puppeteer using extra-stealth, appearing invisibly 
    const browser = await puppeteer
        .use(StealthPlugin())
        .launch({ headless: true });
    const page = await browser.newPage()

    await page.goto(`https://letterboxd.com/${user}/watchlist/`)
    await page.content()
   // await page.screenshot({path:'stealth.png'})

    const maxPage = await getLastPage(page)
    if (maxPage) {
        for (let i = 1; i <= maxPage; i++ ) {
            await page.goto(`https://letterboxd.com/${user}/watchlist/page/${i}/`)
            await page.content()
            const pagePaths = await fetchPaths(page)
            if (pagePaths) {
                filmPaths.push(...pagePaths);
            }
            
        }
    }

    await browser.close();
    return filmPaths
}
function intersection (a, b) {
    const setA = new Set(a);
    return b.filter(value => setA.has(value));
}

const compare = async (users:string[]) => {
    /**
     * Finds the common watchlist items from a group of users
     * 
     * @param users - users to compare
     * @returns common items
     */
    const userWatchlists:string[][] = []
    for (let i = 0; i < users.length; i++ ) {
        const userWatchlist = await getWatchlist(users[i])
        userWatchlists.push(userWatchlist)
    }

    let common = userWatchlists[0]
    for (let i = 1; i< userWatchlists.length;i++){
        common = intersection(common, userWatchlists[i])
    }

    return common;
}

const main = async () => {
    const common = await compare(['embraune', 'joeraps'])
    console.log(common)
}

main()


//STRANGE THING OCCURRING ON GENNY'S PROFILE - IT'S NOT FETCHING ONLY ON HERS BECAUSE IT CANT FIND THE COMPONENT