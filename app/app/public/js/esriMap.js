define([
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/FeatureLayer",
  "esri/geometry/Point",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleMarkerSymbol"
], function(Map, MapView, Graphic, FeatureLayer, Point, GraphicsLayer, SimpleMarkerSymbol) {
  let map = null;
  let view = null;

  function init() {
    // Create the Map with an initial basemap
    map = new Map({
      basemap: "topo"
    });
    // Create the MapView and reference the Map in the instance
    view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 4,
      center: ["-97.922211", "39.381266"]
    });

    view.on("click", function(evt) {
      view.graphics.removeAll();

      var markerSymbol = {
        type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
        color: [226, 119, 40],
        outline: {
          // autocasts as new SimpleLineSymbol()
          color: [255, 255, 255],
          width: 2
        }
      };

      // Create a graphic and add the geometry and symbol to it
      var pointGraphic = new Graphic({
        geometry: evt.mapPoint,
        symbol: markerSymbol
      });

      if (typeof Storage !== "undefined") {
        localStorage.latitude = evt.mapPoint.latitude;
        localStorage.longitude = evt.mapPoint.longitude;
      } else {
        alert("Local storage not available. Please try a different browser.");
      }
      // console.log("\nClick detected at:");
      // console.log("Latitude: " + localStorage.latitude);
      // console.log("Longitude: " + localStorage.longitude);
      document.getElementById("location").value = localStorage.longitude + " , " + localStorage.latitude;

      // Add the graphics to the view's graphics layer
      view.graphics.addMany([pointGraphic]);
    });

    var point = {
      type: "point", // autocasts as new Point()
      longitude: "-97.922211",
      latitude: "39.381266"
    };

    // Create a symbol for drawing the point
    var markerSymbol = {
      type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
      color: [226, 119, 40],
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: [255, 255, 255],
        width: 2
      }
    };

    // Create a graphic and add the geometry and symbol to it
    var pointGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol
    });

    // Add the graphics to the view's graphics layer
    view.graphics.addMany([pointGraphic]);
  }

  // add a point to the map
  function addPoint(latitude, longitude) {
    view.graphics.removeAll();
    localStorage.latitude = latitude;
    localStorage.longitude = longitude;
    const point = new Point({ x: longitude, y: latitude });

    // Create a symbol for drawing the point
    var markerSymbol = {
      type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
      color: [226, 119, 40],
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: [255, 255, 255],
        width: 2
      }
    };

    const graphic = new Graphic({
      geometry: point,
      symbol: markerSymbol
    });

    // add graphic to the view
    view.graphics.addMany([graphic]);

    view.center = point;
    view.zoom = 8;

    // console.log("Point added at:");
    // console.log("Latitude: " + localStorage.latitude);
    // console.log("Longitude: " + localStorage.longitude);
  }

  return {
    init: init,
    addPoint: addPoint
  };
});
