import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Parser } from 'xml2js';
import nodeID3 from 'node-id3';

const { update, TagConstants } = nodeID3;

const defaultMaxDownloads = 5;
const defaultMaxAge = 1;

const opmlIndex = process.argv.indexOf('--opml');
const outputIndex = process.argv.indexOf('--output');
const maxIndex = process.argv.indexOf('--max');
const ageIndex = process.argv.indexOf('--age');
const showHelp = process.argv.includes('--help');

const opmlPath = opmlIndex > -1 ? process.argv[opmlIndex + 1] : null;
const outputDir = outputIndex > -1 ? process.argv[outputIndex + 1] : null;
const maxDownloads = maxIndex > -1 ? parseInt(process.argv[maxIndex + 1]) : defaultMaxDownloads;
const maxAge = ageIndex > -1 ? parseInt(process.argv[ageIndex + 1]) : defaultMaxAge;

if (showHelp || !opmlPath || !outputDir) {
  console.error('Usage: node index.js --opml <path to OPML file> --output <path to output directory> [--max <max simultaneous downloads>] [--age <max age in days>]');
  process.exit(showHelp || (opmlPath && outputDir) ? 0 : 1);
}

console.log(`|${'-'.repeat(80)}
| Downloading podcasts with settings:
| > OPML File: ${opmlPath}
| > Output Directory: ${outputDir}
| > Max Simultaneous Downloads: ${maxDownloads}
| > Max Age: ${maxAge} days
|${'-'.repeat(80)}`);

const tooOld = new Date();
tooOld.setDate(tooOld.getDate() - maxAge);

const trackingFile = join(outputDir, 'downloaded.json');
if (!existsSync(trackingFile)) {
  writeFileSync(trackingFile, '[]');
}

const trackDownload = (url) => {
  const trackingData = JSON.parse(readFileSync(trackingFile));
  trackingData.push(url);
  writeFileSync(trackingFile, JSON.stringify(trackingData, null, 2));
};

const alreadyDownloaded = (url) => {
  const trackingData = JSON.parse(readFileSync(trackingFile));
  return trackingData && Array.isArray(trackingData) ? trackingData.includes(url) : false;
};

const sanitizeFilename = (filename) => {
  // Replace unsafe characters with hyphen
  return filename.replace(/[/\\?%*:|"<>]/g, '');
};

const downloadPodcast = async (url, path, shortPath) => {
  if (alreadyDownloaded(url)) {
    return Promise.resolve(false);
  }

  if (existsSync(path)) {
    return Promise.resolve(false);
  }

  console.log(`Downloading "${shortPath}"`);

  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(url);
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
      trackDownload(url);
      resolve(true);
    } catch (ex) {
      reject(new Error(`${url} - ${ex.message}`));
    }
  });
};

// Read the OPML file and parse the URLs
const opmlFile = readFileSync(opmlPath);
const parser = new Parser();
parser.parseString(opmlFile, async (err, result) => {
  if (err) throw err;

  const feedUrls = [];
  result.opml.body[0].outline.forEach((outline) => {
    feedUrls.push(outline.$.xmlUrl);
  });

  const downloadQueue = feedUrls;
  const downloading = feedUrls.slice(0, maxDownloads);

  const downloadRSSFeed = async (feedUrl) => {
    try {
      // we're downloading the file, we can remove the URl from the queue
      downloadQueue.splice(downloadQueue.indexOf(feedUrl), 1);

      // download file and parse as XML
      const resp = await fetch(feedUrl);
      const xmlData = await resp.text();
      const xmlParser = new Parser();
      const rss = await xmlParser.parseStringPromise(xmlData);

      // extract relevant info from RSS feed
      const artistName = rss.rss.channel[0].title[0].trim();
      const podcastName = sanitizeFilename(artistName);
      const image = rss.rss.channel[0].image ? rss.rss.channel[0].image[0].url : null;
      const episode = rss.rss.channel[0].item[0];
      const episodeTitle = episode.title[0].trim();
      const episodeUrl = episode.enclosure[0].$.url;
      const episodeDate = episode.pubDate[0];

      // sanitize filename
      const podDir = join(outputDir, podcastName);
      const date = new Date(episodeDate);
      const formattedDate = date.toISOString().split('T')[0];
      const fileName = sanitizeFilename(`${formattedDate} - ${episodeTitle}.mp3`);
      const filePath = join(podDir, fileName);
      const shortPath = join(podcastName, fileName);

      // skip if episode is too old
      if (date > tooOld) {
        // create podcast directory if it doesn't exist
        if (!existsSync(podDir)) {
          mkdirSync(podDir, { recursive: true });
        }

        const downloaded = await downloadPodcast(episodeUrl, filePath, shortPath);

        if (downloaded) {
          const id3Tags = {
            date: formattedDate.replace(/-/g, '/'),
            title: episodeTitle,
            artist: artistName,
          };

          if (image) {
            try {
              const res = await fetch(image);
              const imageBuffer = Buffer.from(await res.arrayBuffer());

              id3Tags.image = {
                mime: image.includes('.jpg') ? 'image/jpeg' : 'image/png',
                type: {
                  id: TagConstants.AttachedPicture.PictureType.FRONT_COVER,
                },
                description: 'Cover image',
                imageBuffer,
              };
            } catch (ex) {
              console.error(`Error downloading image: ${ex.message}`);
            }
          }

          update(id3Tags, filePath);
        }
      }

      // move on to next download
      downloading.splice(downloading.indexOf(feedUrl), 1);

      if (downloadQueue.length > 0) {
        const nextFeedUrl = downloadQueue[0];
        downloading.push(nextFeedUrl);
        return downloadRSSFeed(nextFeedUrl);
      }
    } catch (error) {
      console.error(`[ERROR] ${feedUrl} - ${error}`);
    }
  };

  await Promise.all(downloading.map(downloadRSSFeed));
});
