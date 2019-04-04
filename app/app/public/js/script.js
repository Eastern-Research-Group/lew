function makeMap() {
  getCoords();

  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/FeatureLayer"
  ], function(Map, MapView, Graphic, FeatureLayer) {
    // this takes the latitude and longitude from the getCoords function

    var centerx = document.getElementById("longitude").innerHTML;

    var centery = document.getElementById("latitude").innerHTML;

    // Create the Map with an initial basemap
    var map = new Map({
      basemap: "topo"
    });

    // Create the MapView and reference the Map in the instance
    console.log("here");
    var view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 15,
      center: [centerx, centery]
    });

    var point = {
      type: "point", // autocasts as new Point()
      longitude: centerx,
      latitude: centery
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
  });
}

function getCoords() {
  var location = $("#location").val();

  var ws =
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=" +
    location +
    "&f=json&outSR=4326&outFields=Loc_name%2cCity%2cPlace_addr%2cRegion%2cRegionAbbr%2cCountry";

  $("#datatxt").html("Calling web service");
  $("#lon-lat").html("Loading");

  $.getJSON(ws, function(data) {
    $("#datatxt").html(JSON.stringify(data));
    $("#longitude").html(data.candidates[0].location.x.toString());
    $("#latitude").html(data.candidates[0].location.y.toString());
  }).fail(function() {
    console.log("error");
    $("#datatxt").html("error");
  });
}

function getRFactor() {
  var startDate = $("#startdatepicker").val();
  var endDate = $("#enddatepicker").val();
  var coordx = document.getElementById("longitude").innerHTML;
  var coordxnum = parseFloat(coordx);
  var coordxfixed = coordxnum.toFixed(4);
  var coordy = document.getElementById("latitude").innerHTML;
  var coordynum = parseFloat(coordy);
  var coordyfixed = coordynum.toFixed(4);
  var coordinates = [coordx, coordy];
  // the format for the boxes at the bottom is not the same as that which is displayed in the input=date boxes. This splice fixes that
  var startyear = startDate.slice(0, 4);
  2012 - 05 - 12;
  var startmonth = startDate.slice(5, 7);
  var startday = startDate.slice(8);
  // concatenate the spliced sections to make a date that can be inserted in the start date box in the eContainer
  var newStartDate = startmonth + "/" + startday + "/" + startyear;
  // same thing with end dates
  var endyear = endDate.slice(0, 4);
  2012 - 05 - 12;
  var endmonth = endDate.slice(5, 7);
  var endday = endDate.slice(8);
  var newendDate = endmonth + "/" + endday + "/" + endyear;
  var locationz =
    'location={"geometry":{"type":"Point","coordinates":[' +
    coordx +
    "," +
    coordy +
    "]}}";
  var smartURL =
    window.location.protocol + "//" + window.location.host + "/v1/rfactor";
  var webservice =
    smartURL +
    "?start_date=" +
    startDate +
    "&end_date=" +
    endDate +
    '&location={"geometry":{"type":"Point","coordinates":[' +
    coordx +
    "," +
    coordy +
    "]}}&api_key=K20ha4MR1Ddd7sciJQdCZlS5LsudmmtpQeeZ3J7L";

  $.getJSON(webservice, function(data) {
    $("#eiValue").html(data.rfactor.toString());
    $("#tableEndSpan").html(newendDate);
    $("#tableStartSpan").html(newStartDate);
    $("#tableLatitudeSpan").html(coordyfixed);
    $("#tableLongitudeSpan").html(coordxfixed);
    if (data.rfactor > 5) {
      $("#conclusion").html(
        "A rainfall erosivity factor of 5.0 or greater has been calculated for your site's period of construction."
      );
      $("#conclusion2").html(
        "You do NOT qualify for a waiver from NPDES permitting requirements."
      );
    }
  }).fail(function(error) {
    console.log(error);
    alert(error.responseText.slice(28, -2));
  });
  document.getElementById("eContainer").style.display = "block";
}
