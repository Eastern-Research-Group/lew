define(["app/esriMap"], function(esriMap) {
  let attempts = 0;
  function init() {
    // initialize localstorage to default view of USA
    if (typeof Storage !== "undefined") {
      localStorage.latitude = "39.381266";
      localStorage.longitude = "-97.922211";
    } else {
      alert("Local storage not available. Please try a different browser.");
    }
    // initialize map
    esriMap.init("viewDiv");

    // view on map button listener
    document
      .getElementById("mapViewButton")
      .addEventListener("click", function(event) {
        event.preventDefault();
        console.log("button clicked");
        getCoords();
      });

    // form Listener
    document.getElementById("form").addEventListener("submit", function(event) {
      event.preventDefault();
      console.log("form submitted");
      // get the coordinates and add a point to the map based on search box value
      getCoords();
    });

    function getCoords() {
      let location = $("#location").val();

      let ws =
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=" +
        location +
        "&f=json&outSR=4326&outFields=Loc_name%2cCity%2cPlace_addr%2cRegion%2cRegionAbbr%2cCountry";

      $("#datatxt").html("Calling web service");
      $("#lon-lat").html("Loading");

      $.get(ws, function(data) {
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
    document
      .getElementById("rButton")
      .addEventListener("click", function(event) {
        event.preventDefault();
        console.log("R button clicked");
        getRFactor();
      });

    function getRFactor() {
      console.log("LOADER HERE");
      document.getElementById("loader").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";
      document.getElementById("eContainer").style.display = "none";
      let startDate = $("#startdatepicker").val();
      let endDate = $("#enddatepicker").val();

      let coordx = localStorage.longitude;
      let coordxnum = parseFloat(coordx);
      let coordxfixed = coordxnum.toFixed(4);

      let coordy = localStorage.latitude;
      let coordynum = parseFloat(coordy);
      let coordyfixed = coordynum.toFixed(4);

      // the format for the boxes at the bottom is not the same as that which is displayed in the input=date boxes. This splice fixes that
      let startyear = startDate.slice(0, 4);
      //   2012 - 05 - 12;
      let startmonth = startDate.slice(5, 7);
      let startday = startDate.slice(8);
      // concatenate the spliced sections to make a date that can be inserted in the start date box in the eContainer
      let newStartDate = startmonth + "/" + startday + "/" + startyear;
      // same thing with end dates
      let endyear = endDate.slice(0, 4);
      //   2012 - 05 - 12;
      let endmonth = endDate.slice(5, 7);
      let endday = endDate.slice(8);
      let newendDate = endmonth + "/" + endday + "/" + endyear;

      let smartURL =
        window.location.protocol + "//" + window.location.host + "/v1/rfactor";

      let webservice =
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

      $.get(webservice, function(data) {
        // reset number of attempts on success
        attempts = 0;
        document.getElementById("loader").style.display = "none";
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

        document.getElementById("eContainer").style.display = "block";
      }).fail(function(error) {
        // increment attempts and try again
        attempts++;
        console.log("Attempts: " + attempts);
        if (attempts <= 3) {
          // recursively query the API again, due to unreliability. usually fails the 1st time for a new location, then works every time
          getRFactor();
        } else {
          console.log(error);
          document.getElementById("loader").style.display = "none";
          let errorElement = document.getElementById("errorMessage");
          errorElement.style.display = "block";
          // depending on type of error, set the error message
          errorElement.innerHTML =
            error.responseJSON.error_msg ||
            error.statusText ||
            "Error with your query. Try again or adjust your search parameters.";
          alert(error.responseJSON.error_msg || error.statusText);
        }
      });
    }
  }

  return {
    init: init
  };
});
