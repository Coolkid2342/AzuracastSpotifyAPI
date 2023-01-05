var nowPlayingTimeout;
var nowPlaying;

function loadNowPlaying() {
  // Now playing
  $.ajax({
    cache: false,
    dataType: "json",
    url: `https://api.site.com/nowPlaying`,
    success: function (api) {
      $(`#Title`).text(api.title);
      $(`#Artist`).text(api.artist);
      $(`#RawText`).text(api.rawtext);
      $(`#DJ`).text(api.played_by);
      var img = document.getElementById("Album-Art");
      img.src = api.art;
      document.getElementsByClassName("bg")[0].style.backgroundImage =  `url("${art}")`;
      if (`mediaSession` in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: api.title,
          artist: api.artist,
          artwork: [{
            src: api.art,
            sizes: `250x250`,
            type: `image/png`
          }, ]
        });
      }
    }
  })

  // Song History
  $.ajax({
    cache: false,
    dataType: "json",
    url: `https://api.site.com/history`,
    success: function (api) {
      let song = 0;
      api.shift()
      api.forEach(element => {
        $(`#historyTitle${song}`).text(element.title);
        $(`#historyArtist${song}`).text(element.artist);
        $(`#historyRawtext${song}`).text(element.rawtext);
        $(`#historyDJ${song}`).text(element.played_by);
        var img = document.getElementById(`historyArt${song}`);
        song++
        img.src = element.art;
      });
    }
  })
  nowPlayingTimeout = setTimeout(loadNowPlaying, 5000);
}

$(function () {
  loadNowPlaying();
});