# Azuracast to Spotify API

Get the current song and DJ from azuracast and get spotify data and cache it to give accurate data to listeners.

## Installation

First open the Backend folder or upload to your nodejs host such as pterodactyl and run

```shell
npm install
```

When all modules are installed run index.js behind a dns record with a valid SSL certificate through your desired proxy.

```shell
node index.js
```

Add the script.js from the frontend folder to your site and src .

Thats it!

## Valid ID's

Now Playing:
* RawText
* Artist
* Title
* DJ
* Album-Art

Song History:
* historyRawText*
* historyArtist*
* historyTitle*
* historyDJ*
* historyAlbum-Art* \
replace the star symbol with the song you want between 0-9 with 0 being the latest song played and 9 being the 10th last song

## Contributing

Pull requests and forks are welcome!
