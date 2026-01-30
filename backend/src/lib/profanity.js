import {Filter} from "bad-words";

const filter = new Filter();

export const filterAbusiveWords = (text) => {
  if (!text) return text;
  return filter.clean(text);
};
