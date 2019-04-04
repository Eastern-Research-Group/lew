define(["app/esriMap"], function(esriMap) {
  function init() {
    // initialize localstorage to default view of USA
    localStorage.latitude = "39.381266";
    localStorage.longitude = "-97.922211";

    // initialize map
    esriMap.init("viewDiv");

    // when ADD POINT button is clicked. for debugging.
    document.getElementById("add point").addEventListener("click", (e) => {
      console.log("\nAdd point button clicked");
      longitude = -Math.floor(Math.random() * 90) + 80;
      latitude = Math.floor(Math.random() * 40) + 30;
      esriMap.addPoint(latitude, longitude);
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

    // view on map button listener

    document
      .getElementById("mapViewButton")
      .addEventListener("click", (event) => {
        event.preventDefault();
        console.log("button clicked");
        //   makeMap();
        getCoords();
      });

    // form Listener
    document.getElementById("form").addEventListener("submit", (event) => {
      event.preventDefault();
      console.log("form submitted");
      //   makeMap();
      getCoords();
    });

    function getCoords() {
      console.log("in getCoords();");
      var location = $("#location").val();

      var ws =
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=" +
        location +
        "&f=json&outSR=4326&outFields=Loc_name%2cCity%2cPlace_addr%2cRegion%2cRegionAbbr%2cCountry";

      $("#datatxt").html("Calling web service");
      $("#lon-lat").html("Loading");

      $.getJSON(ws, function(data) {
        console.log(data);
        $("#datatxt").html(JSON.stringify(data));

        localStorage.latitude = data.candidates[0].location.y;
        localStorage.longitude = data.candidates[0].location.x;
        console.log("Latitude: " + localStorage.latitude);
        console.log("Longitude: " + localStorage.longitude);

        esriMap.addPoint(localStorage.latitude, localStorage.longitude);
      }).fail(function() {
        console.log("error");
        $("#datatxt").html("error");
      });
    }

    // view on map button listener

    document.getElementById("rButton").addEventListener("click", (event) => {
      event.preventDefault();
      console.log("R button clicked");
      getRFactor();
    });

    function getRFactor() {
      var startDate = $("#startdatepicker").val();
      var endDate = $("#enddatepicker").val();

      var coordx = localStorage.longitude;
      var coordxnum = parseFloat(coordy);
      var coordxfixed = coordxnum.toFixed(4);

      var coordy = localStorage.latitude;
      var coordynum = parseFloat(coordx);
      var coordyfixed = coordynum.toFixed(4);

      var coordinates = [coordx, coordy];
      // the format for the boxes at the bottom is not the same as that which is displayed in the input=date boxes. This splice fixes that
      var startyear = startDate.slice(0, 4);
      //   2012 - 05 - 12;
      var startmonth = startDate.slice(5, 7);
      var startday = startDate.slice(8);
      // concatenate the spliced sections to make a date that can be inserted in the start date box in the eContainer
      var newStartDate = startmonth + "/" + startday + "/" + startyear;
      // same thing with end dates
      var endyear = endDate.slice(0, 4);
      //   2012 - 05 - 12;
      var endmonth = endDate.slice(5, 7);
      var endday = endDate.slice(8);
      var newendDate = endmonth + "/" + endday + "/" + endyear;

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
        console.log(data);
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
  }

  return {
    init: init
  };
});
