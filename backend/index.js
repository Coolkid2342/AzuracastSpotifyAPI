// Requireing all packages

const express = require("express");
const bodyparser = require("body-parser");
const { QuickDB } = require("quick.db");
const cors = require("cors");
const axios = require("axios");
const qs = require("qs");

// Get settings from config 

const { spotify, url, port, autodjName } = require("./config.json")

// Initialise everything

const db = new QuickDB();
const app = express();
app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

// Start the express server

app.listen(port, () => console.log(`🚀 API now listening to port ${port}!`))

// Reauth spotify if token is expired.

async function reauth() {
    axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        headers: {
            Authorization: "Basic " + new Buffer.from(spotify.client_id + ":" + spotify.client_secret).toString("base64"),
        },
        data: qs.stringify({ grant_type: "client_credentials" })
    }).then(async function (response) {
        // Save the credentials into Quick.DB
        await db.set("SpotifyAuth", {
            access_token: response.data.access_token,
            token_type: response.data.token_type
        });
        return true
    }).catch(function(error) {
        throw new Error(error);
    });
}

// Find Spotify Song 

async function findSong(query, apiData) {
    var spotifyAuth = await db.get("SpotifyAuth");
    // If there is no spotify auth in db or no access token reauth and retry.
    if (spotifyAuth === null || !spotifyAuth.access_token) {
        reauth();
        setTimeout(() => {
            findSong(query, apiData);
        }, 200);
    }
    else {
        var promise = new Promise(function(resolve, reject) {
        axios({
            method:"get",
            url:`https://api.spotify.com/v1/search?q=${encodeURI(query)}&type=track&limit=1`,
            headers: {
                Authorization: spotifyAuth.token_type + " " + spotifyAuth.access_token
            }
        }).then(async function(spotifyResponse) {
            // If there is no results from spotify set from azuracast
            if (!spotifyResponse.data.tracks.items[0]) {
                var trackData = {
                    rawtext: apiData.now_playing.song.text,
                    title: apiData.now_playing.song.title,
                    artist: apiData.now_playing.song.artist,
                    art: "https://coolkid2342.co.uk/missing.png",
                };
                await db.set(`cachedSongs.${encodeURI(query)}`, trackData);
                resolve(trackData);
            }
            else {
                var trackData = {
                    rawtext: spotifyResponse.data.tracks.items[0].artists[0].name + " - "+ spotifyResponse.data.tracks.items[0].name,
                    title: spotifyResponse.data.tracks.items[0].name,
                    artist: spotifyResponse.data.tracks.items[0].artists[0].name,
                    art: spotifyResponse.data.tracks.items[0].album.images[0].url
                };
                await db.set(`cachedSongs.${encodeURI(query)}`, trackData);
                resolve(trackData);
            }
        }).catch(function (error) {
            if (error.response.status === 401) {
                reauth();
                setTimeout(() => {
                    findSong(query, apiData);
                }, 200);
            } else {
                throw new Error(error);
            }
        })
    })
    return promise
    }
}

// Check current song for history

setInterval(() => {
    axios({
        method: "get",
        url: url,
    }).then(async function getCurrentSong(azuraAPI) {
        var lastCurrentSong = await db.get("currentSong");
        if (lastCurrentSong !== azuraAPI.data.now_playing.song.text) {
            await db.set("currentSong", azuraAPI.data.now_playing.song.text)
            var query = azuraAPI.data.now_playing.song.text.replaceAll(/ \<[\s\S]*?\>/g, "").replaceAll(/ \([\s\S]*?\)/g, "").replaceAll(/ \[[\s\S]*?\]/g, "").replaceAll(" feat. ", ", ");
            // If there is no live streamer, set the value to the autodj name
            if (azuraAPI.data.live.streamer_name === "") azuraAPI.data.live.streamer_name = autodjName;
            var cachedSong = await db.get(`cachedSongs.${encodeURI(query)}`);
            // If song isn't cached, find it on spotify
            if (!cachedSong) {
                var result = await findSong(query, azuraAPI.data);
                var songHistory = await db.get("songHistory");
                result.played_by = azuraAPI.data.live.streamer_name;
                result.timestamp = Date.now();
                songHistory.unshift(result);
                await db.set("songHistory", songHistory);
            }
            // If song is cached get cached data
            else {
                var cachedData = await db.get(`CachedSongs.${encodeURI(query)}`);
                var songHistory = await db.get("songHistory");
                cachedData.played_by = azuraAPI.data.live.streamer_name;
                cachedData.timestamp = Date.now();
                songHistory.unshift(cachedData);
                await db.set("songHistory", songHistory);
            }
        }
    })
}, 2000)

// Get request for the history

app.get("/history", async (req,res) => {
    var songHistory = await db.get("songHistory");
    res.status(200).json(songHistory.slice(1,11));
})

// Get request for the current song

app.get("/nowPlaying", async (req,res) => {
    axios({
        method: "get",
        url: url,
    }).then(async function getCurrentSong(azuraAPI) {
            // If there is no live streamer, set the value to the autodj name
            if (azuraAPI.data.live.streamer_name === "") azuraAPI.data.live.streamer_name = autodjName;
            var query = azuraAPI.data.now_playing.song.text.replaceAll(/ \<[\s\S]*?\>/g, "").replaceAll(/ \([\s\S]*?\)/g, "").replaceAll(/ \[[\s\S]*?\]/g, "").replaceAll(" feat. ", ", ");
            var cachedSong = await db.get(`cachedSongs.${encodeURI(query)}`);
            // If song isn't cached, find it on spotify
            if (!cachedSong) {
                var result = await findSong(query, azuraAPI.data)
                result.played_by = azuraAPI.data.live.streamer_name;
                res.status(200).json(result);
            }
            // If song is cached get cached data
            else {
                cachedSong.played_by = azuraAPI.data.live.streamer_name;
                res.status(200).json(cachedSong);
            }
    })
})