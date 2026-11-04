const ATOM = 'http://www.w3.org/2005/Atom';
const YT = 'http://www.youtube.com/xml/schemas/2015';
const MEDIA = 'http://search.yahoo.com/mrss/';

export function parseFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (
    doc.querySelector('parsererror') ||
    doc.documentElement.localName !== 'feed' ||
    doc.documentElement.namespaceURI !== ATOM
  ) {
    throw new Error('フィードの形式を読み取れませんでした。');
  }
  const text = (node, ns, name) =>
    node.getElementsByTagNameNS(ns, name)[0]?.textContent?.trim() || '';
  return Array.from(doc.getElementsByTagNameNS(ATOM, 'entry'))
    .map((entry) => {
      const videoId = text(entry, YT, 'videoId');
      return {
        videoId,
        title: text(entry, ATOM, 'title'),
        description: text(entry, MEDIA, 'description'),
        published: text(entry, ATOM, 'published'),
        channelId: text(entry, YT, 'channelId'),
        channelTitle: text(entry.getElementsByTagNameNS(ATOM, 'author')[0] || entry, ATOM, 'name'),
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        views: entry.getElementsByTagNameNS(MEDIA, 'statistics')[0]?.getAttribute('views') || null,
      };
    })
    .filter((entry) => /^[\w-]{11}$/.test(entry.videoId));
}
