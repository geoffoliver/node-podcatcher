# NodeJS Podcatcher

This is something I wrote<sup>*</sup> because my podcatcher of choice has a few very nasty bugs that I just couldn't deal with. So, until the developer fixes them, I'm using this. I just need something to download podcasts and put 'em in a folder so I can play them with VLC. This does exactly that.

When you run this, it'll read in an OPML file, grab the RSS feeds referenced in that file, and download the newest episode of each podcast. It'll then try to add the file to the VLC playlist (running on 127.0.0.1:8080 - configurable through a couple command line flags, `--host` and `--port` or `--host` like `hostname:port`) using the [VLC HTTP interface](https://wiki.videolan.org/Documentation:Modules/http_intf/#VLC_2.0.0_and_later) with a password of `password` by default, but you can change that with the command line flag `--password`.

_<sup>*</sup>I didn't "write" the whole thing. I started it by asking ChatGPT to write some code for me, and then I tweaked the shit out of it. This is the result._

# Installation

Clone this repo, then do the `yarn` dance:

```bash
yarn install
```

# Usage

```bash
yarn start --opml <path to OPML file> --output <path to output folder>
```

By default, this will download the most recent episode of each podcast, that is not more than **one (1)** day old, **five (5)** podcasts at a time. You can change these settings using the `--age` and `--max` flags, like so:

```bash
yarn start --opml ~/pods/list.opml --output ~/pods/ --age 7 --max 3
```

This will download all the podcasts referenced in the `~/posts/list.opml` file to the `~/pods/` directory, up to 7 days old, 3 podcasts at a time.

Here's another example where you override the VLC host, port, and password (defaults are `127.0.0.1`, `8080`, and `password` respectively):

```bash
yarn start --opml ~/pods/list.opml --output ~/pods/ --host 10.1.2.200 --port 9000 --password whatever
```

This would also work:

```bash
yarn start --opml ~/pods/list.opml --output ~/pods/ --host 10.1.2.200:9000 --password whatever
```


This is probably full of bugs and problems. If this eats all your files, you have nobody to blame but yourself.
