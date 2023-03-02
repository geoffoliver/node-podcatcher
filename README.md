# NodeJS Podcatcher

This is something I wrote<sup>*</sup> because my podcatcher of choice has a few very nasty bugs that I just couldn't deal with. So, until the developer fixes them, I'm using this. I just need something to download podcasts and put 'em in a folder so I can play them with VLC. This does exactly that.

<sup>*</sup> I didn't "write" the whole thing. I started it by asking ChatGPT to write some code for me, and then I tweaked the shit out of it. This is the result.

# Installation

Clone this repo, then do the `yarn` dance:

```bash
yarn install
```

# Usage

```bash
yarn start --opml <path to OPML file> --output <path to output folder>
```

By default, this will download the most recent episode of each podcast, that is not more than **one (1)** day old, **five (5)** episodes at a time. You can change these settings using the `--age` and `--max` flags, like so:

```bash
yarn start --opml ~/pods/list.opml --output ~/pods/ --age 7 --max 3
```

This will download all the podcasts referenced in the `~/posts/list.opml` file to the `~/pods/` directory, up to 7 days old, 3 podcasts at a time.
