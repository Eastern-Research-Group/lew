define(["app/esriMap"], function(esriMap) {
  let attempts = 0;
  function init() {
    // if browser is ie11, fix the responsiveness of the datepicker inputs
    if (!!window.MSInputMethodContext && !!document.documentMode) {
      var element = document.getElementById("responsivebr");
      element.classList.remove("responsivebr");
    }

    // initialize localstorage to default empty
    if (typeof Storage !== "undefined") {
      localStorage.latitude = "empty";
      localStorage.longitude = "empty";
    } else {
      console.log("Local storage not available. Please try a different browser.");
    }
    // initialize map
    esriMap.init("viewDiv");

    // view on map button listener
    document.getElementById("mapViewButton").addEventListener("click", function(event) {
      event.preventDefault();
      getCoords();
    });

    // form Listener
    document.getElementById("form").addEventListener("submit", function(event) {
      event.preventDefault();
      // get the coordinates and add a point to the map based on search box value
      getCoords();
    });

    function getCoords() {
      // hide results container
      document.getElementById("eContainer").style.display = "none";
      // hide location search error message
      document.getElementById("location-error").style.display = "none";
      let location = $("#location").val();

      let ws =
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=" +
        location +
        "&f=json&outSR=4326&outFields=Loc_name%2cCity%2cPlace_addr%2cRegion%2cRegionAbbr%2cCountry";

      $("#datatxt").html("Calling web service");
      $("#lon-lat").html("Loading");

      $.get(ws, function(data) {
        if (data.candidates.length === 0) {
          document.getElementById("location-error").style.display = "inline";
        }
        console.log(data);
        $("#datatxt").html(JSON.stringify(data));

        localStorage.latitude = data.candidates[0].location.y;
        localStorage.longitude = data.candidates[0].location.x;

        esriMap.addPoint(localStorage.latitude, localStorage.longitude);
      }).fail(function() {
        console.log("error");
        $("#datatxt").html("error");
      });
    }

    // view on map button listener
    document.getElementById("rButton").addEventListener("click", function(event) {
      event.preventDefault();
      getRFactor();
    });

    function getRFactor() {
      if ((localStorage.latitude == "empty" || localStorage.longitude == "empty") && $("#location").val() != "") {
        console.log("needs to be searched");
      }

      document.getElementById("loader").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";
      document.getElementById("eContainer").style.display = "none";
      // if no location has been searched or clicked
      if (localStorage.latitude == "empty") {
        document.getElementById("errorMessage").innerHTML =
          "Please search an address or select your location on the map.";
        document.getElementById("errorMessage").style.display = "block";
        document.getElementById("loader").style.display = "none";
        document.getElementById("eContainer").style.display = "none";
      }
      // check if start date is empty
      else if (!$("#startdatepicker").val()) {
        document.getElementById("errorMessage").innerHTML = "Please enter a valid Start Date.";
        document.getElementById("errorMessage").style.display = "block";
        document.getElementById("loader").style.display = "none";
        document.getElementById("eContainer").style.display = "none";
      }
      // check if end date is empty
      else if (!$("#enddatepicker").val()) {
        document.getElementById("errorMessage").innerHTML = "Please enter a valid End Date.";
        document.getElementById("errorMessage").style.display = "block";
        document.getElementById("loader").style.display = "none";
        document.getElementById("eContainer").style.display = "none";
      }
      // location and dates are all set
      else {
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

        let smartURL = window.location.protocol + "//" + window.location.host + "/v1/rfactor";

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
          if (data.rfactor == null) {
            data.rfactor = "Unknown";
          }
          $("#eiValue").html(data.rfactor.toString());
          $("#tableEndSpan").html(newendDate);
          $("#tableStartSpan").html(newStartDate);
          $("#tableLatitudeSpan").html(coordyfixed);
          $("#tableLongitudeSpan").html(coordxfixed);
          if (data.rfactor > 5) {
            $("#conclusion").html(
              "A rainfall erosivity factor of 5.0 or greater has been calculated for your site's period of construction."
            );
            $("#conclusion2").html("You do NOT qualify for a waiver from NPDES permitting requirements.");
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
            attempts = 0;
            console.log(error);
            document.getElementById("loader").style.display = "none";
            let errorElement = document.getElementById("errorMessage");
            errorElement.style.display = "block";
            // depending on type of error, set the error message
            try {
              errorElement.innerHTML = error.responseJSON.error_msg || error.statusText;
            } catch (err) {
              errorElement.innerHTML = "Error with your search. Check your inputs and try again.";
            }
          }
        });
      }
    }
  }

  return {
    init: init
  };
});
