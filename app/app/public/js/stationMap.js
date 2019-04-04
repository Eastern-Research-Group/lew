define([
  "esri/Map",
  "esri/views/MapView",
  "esri/widgets/ScaleBar",
  "esri/widgets/Expand",
  "esri/widgets/BasemapGallery",
  "esri/widgets/BasemapGallery/support/PortalBasemapsSource",
  "esri/widgets/LayerList",
  "esri/widgets/LayerList/ListItem",
  "esri/core/Collection",
  "esri/layers/MapImageLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/tasks/IdentifyTask",
  "esri/tasks/support/IdentifyParameters",
  "esri/symbols/PictureMarkerSymbol",
  "esri/geometry/support/webMercatorUtils",
  "esri/widgets/Home",
  "esri/Viewpoint",
  "esri/core/urlUtils",
  "dojo/on",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
  "esri/geometry/Point",
  "dojo/promise/all"
], function(
  Map,
  MapView,
  ScaleBar,
  Expand,
  BasemapGallery,
  PortalBasemapsSource,
  LayerList,
  ListItem,
  Collection,
  MapImageLayer,
  FeatureLayer,
  GraphicsLayer,
  Graphic,
  IdentifyTask,
  IdentifyParameters,
  PictureMarkerSymbol,
  webMercatorUtils,
  Home,
  Viewpoint,
  urlUtils,
  on,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Query,
  QueryTask,
  Point,
  all
) {
  let map = null;
  let view = null;

  function init(element) {
    console.log("test");

    polySymbol = new SimpleFillSymbol({
      color: "#007bff",
      style: "solid"
    });

    lineSymbol = new SimpleLineSymbol({
      color: "#007bff",
      width: "2",
      style: "solid"
    });

    pointSymbol = new SimpleMarkerSymbol({
      color: "#007bff",
      style: "circle"
    });

    // expand widget layers

    map = new Map({
      basemap: "gray"
    });

    view = new MapView({
      container: element,
      map: map,
      popup: {
        dockEnabled: false,
        dockOptions: {
          buttonEnabled: false, // Disables the dock button from the popup
          breakpoint: false // Ignore the default sizes that trigger responsive docking
        }
      }
    });

    // add basemaps to map widget

    const basemapNames = [
      // 'Imagery',
      "Imagery with Labels",
      // 'Streets',
      "Topographic",
      "Dark Gray Canvas",
      "Light Gray Canvas",
      // 'National Geographic',
      "Terrain with Labels",
      // 'Oceans',
      // 'OpenStreetMap',
      // 'USA Topo Maps',
      "USGS National Map"
    ];

    const basemapsSource = new PortalBasemapsSource({
      filterFunction: function(basemap) {
        return basemapNames.indexOf(basemap.portalItem.title) !== -1;
      }
    });
    const basemaps = new BasemapGallery({
      container: $("<div>").addClass("hmw-map-basemaps")[0],
      view: view,
      source: basemapsSource
    });
    $content = $("<div>")
      .addClass("hmw-map-toggle")
      .append($("<h4>Basemaps:</h4>"))
      .append(basemaps.domNode)
      .append($("<hr><h4>Layers:</h4>"));

    const expandBtn = new Expand({
      expandIconClass: "esri-icon-layers",
      view: this.view,
      mode: "floating",
      autoCollapse: true,
      content: $content[0]
    });

    // auto-collapse expand widget whenever anything inside map,
    // and outside of expand widget is clicked
    $(document).on("click", "#hmw-monitoring-location-map", function(event) {
      const expandWidget = $(".esri-expand")[0];
      const expandWidgetClicked = $.contains(expandWidget, event.target);

      if (!expandWidgetClicked && expandBtn.expanded) expandBtn.collapse();
    });

    view.ui.add(expandBtn, "top-right");

    // const scaleBar = new ScaleBar({
    //   view: view,
    //   unit: 'dual'
    // });
    //
    // view.ui.add(scaleBar, 'bottom-left');
  }

  function addStation(latitude, longitude) {
    const point = new Point({ x: latitude, y: longitude });

    const graphicsLayer = new GraphicsLayer();
    const graphic = new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({
        color: [56, 168, 0],
        style: "square",
        outline: {
          color: [0, 0, 0],
          width: 1
        }
      })
    });
    graphicsLayer.graphics.add(graphic);

    // add graphicsLayer to the map and set zoom
    map.add(graphicsLayer);
    view.center = point;
    view.zoom = 14;
  }

  return {
    init: init,
    addStation: addStation
  };
});
