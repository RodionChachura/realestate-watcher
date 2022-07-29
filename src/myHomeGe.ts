import puppeteer, { Page } from "puppeteer";

import { Storage } from "./Storage";

const msInDay = 86400000;
const nextPageClassName = "step-forward";

const realEstateSearchPage = `https://www.myhome.ge/en/s/realEstate-for-sale-House-for-Sale-Tbilisi?Keyword=Tbilisi&AdTypeID=1&PrTypeID=1.2&mapC=41.70931%2C44.78487&mapZ=12&mapOp=1&EnableMap=0&regions=687586034.689678147.689701920.687602533&districts=2022621279.5965823289.798496409.906139527.1650325628.2185664.28045012.906117284.2035926160&cities=1996871&GID=1996871&FCurrencyID=1&FPriceTo=110000&AreaSizeFrom=70&BedRoomNums=2.3&action_map=on&RenovationID=1.5.7`;

const getByClassName = (element: Page, className: string) => {
  return element.$$(`.${className}`);
};

const wait = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

interface Unit {
  url: string;
  id: string;
  date: number;
  ad: boolean;
}

const getRealEstate = (): Unit[] => {
  const REAL_ESTATE_CLASS_NAME = "statement-card";
  const PAGINATION_CLASS_NAME = "pagination-container";
  const CARD_RIGHT_INFO_CLASS_NAME = "d-block";
  const AD_LABEL = "vip-label";

  const [pagination] = document.getElementsByClassName(PAGINATION_CLASS_NAME);
  pagination.scrollIntoView();

  const cards = [
    ...document.getElementsByClassName(REAL_ESTATE_CLASS_NAME),
  ].filter((card) => !card.className.includes("banner"));

  const year = new Date().getFullYear();

  return cards.map((card) => {
    const [rawId, rawDate] = [
      ...card.getElementsByClassName(CARD_RIGHT_INFO_CLASS_NAME),
    ].map((info) => (info as HTMLElement).innerText);
    const [day, monthString, time] = rawDate.split(" ");
    const rawDateWithYear = [day, monthString, year, time].join(" ");
    const date = new Date(rawDateWithYear).getTime();
    const id = rawId.split(" ")[1];
    return {
      url: (card.children[0] as HTMLAnchorElement).href,
      id,
      date,
      ad: card.getElementsByClassName(AD_LABEL).length > 0,
    };
  });
};

export const showNewRealEstate = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-fullscreen"],
  });
  let realEstatesPage = await browser.newPage();
  await realEstatesPage.goto(realEstateSearchPage);

  const storage = new Storage("myhome-ge");
  const lastVisitAt = storage.state.lastVisitAt || Date.now() - msInDay * 2;

  let units: Unit[] = [];
  const recursiveSearch = async (): Promise<void> => {
    const newUnits = (await realEstatesPage.evaluate(getRealEstate)).filter(
      (unit) => unit.date > lastVisitAt
    );
    if (newUnits.length < 1) return;

    units.push(...newUnits);

    const [nextPage] = await getByClassName(realEstatesPage, nextPageClassName);
    await nextPage.click();
    await wait();

    await realEstatesPage.reload({ waitUntil: "domcontentloaded" });
    await wait();

    return recursiveSearch();
  };
  await recursiveSearch();

  const newUnits = units.filter((a) => !storage.state.shown.includes(a.id));

  for (const { url } of newUnits) {
    const page = await browser.newPage();
    await page.goto(url);
    wait();
  }

  storage.state = {
    lastVisitAt: Date.now(),
    shown: [...storage.state.shown, ...newUnits.map((a) => a.id)],
  };
  console.log(newUnits.map((a) => a.url));
};
