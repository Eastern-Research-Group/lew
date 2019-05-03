define(["app/esriMap"], function(esriMap) {
  // holds number of attempts in case API fails first 1 or 2 times. stops after 4 attempts.
  let attempts = 0;
  function init() {
    // if browser is ie11, fix the responsiveness of the datepicker inputs
    if (!!window.MSInputMethodContext && !!document.documentMode) {
      var element = document.getElementById("responsivebr");
      element.classList.remove("responsivebr");
    }
    // ie11 startsWith() polyfill
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
      };
    }

    // ie11 includes() polyfill
    if (!String.prototype.includes) {
      String.prototype.includes = function(search, start) {
        if (typeof start !== "number") {
          start = 0;
        }

        if (start + search.length > this.length) {
          return false;
        } else {
          return this.indexOf(search, start) !== -1;
        }
      };
    }

    // initialize sessionStorage to default empty
    if (typeof Storage !== "undefined") {
      sessionStorage.latitude = "empty";
      sessionStorage.longitude = "empty";
    } else {
      document.getElementById("errorMessage").innerHTML =
        "sessionStorage is not enabled. Please use a different browser.";
      document.getElementById("errorMessage").style.display = " block";
    }
    // initialize map
    esriMap.init("viewDiv");

    // view on map button listener
    document.getElementById("mapViewButton").addEventListener("click", function(event) {
      event.preventDefault();
      // get the coordinates and add a point to the map based on search box value
      getCoords(function() {});
    });

    // form Listener
    document.getElementById("form").addEventListener("submit", function(event) {
      event.preventDefault();
      // get the coordinates and add a point to the map based on search box value
      getCoords(function() {});
    });

    function getCoords(_callback) {
      // hide error message
      document.getElementById("errorMessage").style.display = "none";
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
        } else {
          // add lat/long to local storage
          try {
            sessionStorage.latitude = data.candidates[0].location.y;
            sessionStorage.longitude = data.candidates[0].location.x;
          } catch (err) {
            document.getElementById("location-error").style.display = "inline";
          }
          // add a point on the map
          esriMap.addPoint(sessionStorage.latitude, sessionStorage.longitude);
          _callback();
        }
      }).fail(function() {
        document.getElementById("location-error").style.display = "inline";
      });
    }

    // view on map button listener
    document.getElementById("rButton").addEventListener("click", function(event) {
      event.preventDefault();
      // check if user has entered a location in the location input but has NOT searched it. if so, automatically search for them before calculating.
      if ((sessionStorage.latitude == "empty" || sessionStorage.longitude == "empty") && $("#location").val() != "") {
        getCoords(function() {
          getRFactor();
        });
      } else {
        getRFactor();
      }
    });

    function getRFactor() {
      document.getElementById("loader").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";
      document.getElementById("eContainer").style.display = "none";
      // if no location has been searched or clicked
      if (sessionStorage.latitude == "empty") {
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

        let coordx = sessionStorage.longitude;
        let coordxnum = parseFloat(coordx);
        let coordxfixed = coordxnum.toFixed(4);

        let coordy = sessionStorage.latitude;
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

        if (window.location.host.toLowerCase().startsWith("localhost")) {
          api = "http://localhost:" + window.location.port + "/v1/rfactor";
        } else if (window.location.host.toLowerCase().includes("lew-dev.app.cloud.gov")) {
          api = "https://api.epa.gov/DEV/lew/v1/rfactor";
        } else if (window.location.host.toLowerCase().includes("lew-stage.app.cloud.gov")) {
          api = "https://api.epa.gov/STAGE/lew/v1/rfactor";
        } else {
          api = "https://api.epa.gov/lew/v1/rfactor";
        }

        // old url
        // let smartURL = window.location.protocol + "//" + window.location.host + "/v1/rfactor";

        let webservice =
          api +
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
            $("#conclusion2").html(
              "You do NOT qualify for a waiver from NPDES permitting requirements and must seek Construction General Permit (CGP) coverage. " +
                '<span style="font-weight: normal">If you are located in an <a target="_blank" rel="noopener" href="https://www.epa.gov/sites/production/files/2017-03/documents/2017_cgp_final_appendix_b_-_areas_of_permit_coverage_508.pdf">area where EPA is the permitting authority</a>, ' +
                'you must submit a Notice of Intent (NOI) through the <a target="_blank" rel="noopener" href="https://www.epa.gov/npdes/submitting-notice-intent-noi-notice-termination-not-or-low-erosivity-waiver-lew-under">NPDES eReporting Tool (NeT)</a>.' +
                "Otherwise, you must seek coverage under your state’s CGP.</span>"
            );
          } else {
            $("#conclusion").html(
              "A rainfall erosivity factor of less than 5.0 has been calculated for your site and period of construction. " +
                "If you are located in an " +
                '<a target="_blank" rel="noopener" href="https://www.epa.gov/sites/production/files/2017-03/documents/2017_cgp_final_appendix_b_-_areas_of_permit_coverage_508.pdf">area where EPA is the permitting authority</a>, ' +
                'you can submit a LEW through EPA’s  <a target="_blank" rel="noopener" href="https://www.epa.gov/npdes/submitting-notice-intent-noi-notice-termination-not-or-low-erosivity-waiver-lew-under">NPDES eReporting Tool (NeT)</a>. ' +
                "Otherwise, contact your state permitting authority to determine if you are eligible for a waiver from NPDES permitting requirements. " +
                "<br /><br />" +
                "If you submitted a LEW through EPA’s NeT and your construction activity ultimately extends past the project completion date you specified above, " +
                "you must recalculate the R factor using the original start date and a new project completion date. " +
                "If the recalculated R factor is still less than 5.0, you must submit a modification to your LEW through NeT before the end of the original construction period. " +
                "If the new R factor is 5.0 or greater, you must submit a Notice of Intent (NOI) instead to " +
                "be covered by the Construction General Permit (CGP) before the original project completion date."
            );
            $("#conclusion2").html("");
          }

          document.getElementById("eContainer").style.display = "block";
        }).fail(function(error) {
          // increment attempts and try again
          attempts++;
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
