define(["app/mapTest"], function(mapTest) {
  function init() {
    // initialize localstorage to default view of USA
    localStorage.latitude = "39.381266";
    localStorage.longitude = "-97.922211";

    // initialize map
    mapTest.init("viewDiv");

    // when ADD POINT button is clicked. for debugging.
    document.getElementById("add point").addEventListener("click", (e) => {
      console.log("\nAdd point button clicked");
      longitude = -Math.floor(Math.random() * 90) + 80;
      latitude = Math.floor(Math.random() * 40) + 30;
      mapTest.addPoint(latitude, longitude);
    });

    // when TEST STORAGE button is clicked. for debugging.
    document.getElementById("point test").addEventListener("click", (e) => {
      console.log("\nTest storage button clicked");
      if (typeof Storage !== "undefined") {
        console.log("Latitude: " + localStorage.latitude);
        console.log("Longitude: " + localStorage.longitude);
      } else {
        console.log("storage not available");
      }
    });
  }

  return {
    init: init
  };
});
