function getPoints (group){
    var points = null;
    $.ajax({
        url:group.path,
        type: "get",
        dataType:"json",
        async: false,
        success: function(data){points=data}
    });
    group.point_group = L.geoJson(points, {
        onEachFeature: function (feature, layer) {
            layer.on('mouseover', function(e){
                e.target.setZIndexOffset(250);
            });
            layer.on('mouseout', function(e){
                e.target.setZIndexOffset(0);
            });
        }
    });
}

function Group(geojson_path, name){
    //initialize
    this.name = name;
    this.point_group = L.featureGroup();
    this.path = geojson_path;

    //get points from geojson file, add to group
    getPoints(this);

    //group points by cities, counties for aggregated viewing
    var cities = [];
    var pointMap = [];
  	this.point_group.eachLayer(function(layer){
        var icon = L.MakiMarkers.icon({icon: "pharmacy", color: "#80b3d3", size: "l"});
        layer.setIcon(icon);
        var feature = layer.toGeoJSON();
        layer.bindPopup("<td><strong>"+feature.id+"</strong><br>"+feature.properties.street+" "+feature.properties.citystatezip+"<br><a href='#address-input'>get directions</a></td>");
        name = feature.id + "." + feature.properties.street + "." + feature.properties.citystatezip;
        pointMap[name] = {layer: layer, latlng: layer.getLatLng()};
        if (cities[feature.properties.city] == null){
            cities[feature.properties.city] = {count: 1, x: feature.geometry.coordinates[0], y: feature.geometry.coordinates[1]};
        }
        else {
            cities[feature.properties.city].count = cities[feature.properties.city].count + 1;
            cities[feature.properties.city].x = (cities[feature.properties.city].x + feature.geometry.coordinates[0])/2
            cities[feature.properties.city].y = (cities[feature.properties.city].y + feature.geometry.coordinates[1])/2
        }
  	});
  	this.cities = cities;
    this.pointMap = pointMap;

    //create markers for cities
    var city_group = L.featureGroup();
    for (var city in this.cities){
      var latlng = L.latLng(this.cities[city].y, this.cities[city].x);
      var icon = L.MakiMarkers.icon({icon: "town-hall", color: "#5e4fa2", size: "l"});
      icon.html = "hello";
      var city_marker = L.marker(latlng,{
          icon: icon, riseOnHover: true});
      city_marker.bindPopup(city);
      city_group.addLayer(city_marker);
      city_marker.on('click', function(e){
          map.panTo(e.latlng);
          map.setZoom(zoom_points);
      });
      city_marker.on('mouseover', function(e){
          e.target.openPopup();
      });
      city_marker.on('mouseout', function(e){
          e.target.closePopup();
      });
    }
    this.city_group = city_group;
}
