import { intersectWatchlists } from "./intersectWatchlists"

const main = async () => {
    const common = await intersectWatchlists(['joeraps', 'gennykellogg'])
    console.log(common)
}

main()