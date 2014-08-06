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
        layer.bindPopup("<td><strong>"+feature.properties.name+"</strong><br>"+feature.properties.address+"<br>"+feature.properties.city+", NY "+feature.properties.zip+"<br><a onclick='document.address.address_input.focus();' style='cursor: pointer'>get directions</a></td>");
        name = feature.id + "." + feature.properties.street + "." + feature.properties.city + "." + feature.properties.state + "." + feature.properties.zip;
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
      var city_marker = L.circle(latlng, 1000, {color:'white', weight:2, fillColor:'#5e4fa2', opacity:1, fill:true, fillOpacity:1});
      city_group.addLayer(city_marker);
      city_marker.on('click', function(e){
          map.panTo(e.latlng);
          map.setZoom(zoom_points);
      });
      
    }
    this.city_group = city_group;
}


//map environmental variables
var map;
var layers = [];
var address_marker = null;
var address_buffer = null;
var zoom_counties = 8;
var zoom_cities = 10;
var zoom_points = 12;
var zoom_max = 14;
var init_bounds = L.latLngBounds(
L.latLng(40.59875083395948, -79.23850049516057), 
L.latLng(44.75896447862758, -73.27685372593069));
var address_icon = L.MakiMarkers.icon({icon: "building", color: "#d53e4f", size: "l"});
var point_icon = L.MakiMarkers.icon({icon: "pharmacy", color: "#80b3d3", size: "l"});
var city_icon = L.MakiMarkers.icon({icon: "town-hall", color: "#5e4fa2", size: "l"});
var nearest_sidebar = L.control.sidebar('nearest_sidebar', {
            position: 'right',
            closeButton: false
});
var legend = L.control({position: 'topleft'});
var search_bar = L.control({position: 'topleft'});
var zoom_alert_added = false;
var $zoom_alert = $('<li>');
$zoom_alert.html('<h5 class="bg-warning"><strong><center>Zoom in to see points</center><strong></h5>');
search_bar.onAdd = function(){
var $div = $('<div>');
$div.css("width","300px")
$div.html('<form name="address" id="address" target="_self" class="form-inline" role="form"> <div class="form-group address-search"> <div class="input-group"><input type="text" autocomplete="off" class="form-control input-lg" name="address" id="address_input" placeholder="address"><div class="input-group-addon"><span type="submit" id="address-search-button" data-loading-text="Searching..."><span class="glyphicon glyphicon-search"></span></span></div></div></div></form>')
var stop = L.DomEvent.stopPropagation;
L.DomEvent
    .on($div, 'click', stop)
    .on($div, 'mousedown', stop)
    .on($div, 'touchstart', stop)
    .on($div, 'dblclick', stop)
    .on($div, 'mousewheel', stop)
    .on($div, 'MozMousePixelScroll', stop);
return $div[0];
}
legend.onAdd = function(){
var $div = $('<div>')
$div.addClass('legend');

var $table = $('<ul>')
$table.addClass('list-unstyled legend-table');
/*var $address_row = $('<li>');
$address_row.html('<h5><img src='+address_icon.options.iconUrl+'>Your address</h5>');
var $point_row = $('<li>');
$point_row.html('<h5><img src='+point_icon.options.iconUrl+'>Dropbox location</h5>');
var $city_row = $('<li>');
$city_row.html('<h5><img src='+city_icon.options.iconUrl+'>City</h5>');
$table.append($address_row);
$table.append($point_row);
$table.append($city_row);*/
$div.append($table);
return $div[0];
}

var location_find = L.control({position: 'topleft'});
location_find.onAdd = function(){
var $div = $('<div class="leaflet-control-zoom leaflet-bar leaflet-control">');
$div.html('<div id="geolocate" class="leaflet-control-zoom-in"><img src="static/images/location.ico" width="24" height="24"></div>');
return $div[0];
}
var zoom_control = L.control.zoom({position: 'topleft'})
//load map
window.onload = function(){
map = L.map('map', {'zoomControl':false});
L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
        }).addTo(map);
map.addControl(search_bar);
map.addControl(zoom_control);
map.addControl(location_find);
map.addControl(legend);
map.addControl(nearest_sidebar);
$('.legend-table').append($zoom_alert);
zoom_alert_added = true;
$zoom_alert.click(function(){
    map.setZoom(zoom_points);
});
$zoom_alert.css({'cursor':'pointer'});

var counties = null;
$.ajax({
    url:"static/json/nys_counties.geojson",
    type: "get",
    dataType:"json",
    async: false,
    success: function(data){counties=data}
});
counties = L.geoJson(counties, {
    onEachFeature: function (feature, layer) {
        layer.on('click', function(){
            map.fitBounds(layer.getBounds());
            map.removeLayer(counties);
            map.addLayer(group_test.city_group);
        });
    }
});
counties.setStyle({color:'#000', opacity: '1', weight: 3});
function initMap(){
    nearest_sidebar.hide();
    counties.addTo(map);
    map.fitBounds(init_bounds);
    map.on('zoomend', function(){});
    map.on('move', function(){});
    //set autolocation control
    $('#geolocate').click(function(){
        map.locate();
    });
    map.on('layeradd', function(e){
        if (layers.indexOf(e.layer) == -1){
            layers.push(e.layer);
        }
    });
    map.on('layerremove', function(e){
        layers = jQuery.grep(layers, function(a){
            return a !== e.layer;
        });
    });
    map.on('locationfound', function(e){
        map.panTo(e.latlng);
        map.setZoom(zoom_points);
    });
}
function restart(){
    layers.forEach(function(element){
        map.removeLayer(element);
    });
    initMap();
}
$('#opening-dialog').modal({backdrop:"static"});
$('#opening-dialog').on('show.bs.modal', function (e) {
    restart();
});
$('#opening-dialog').modal('show');

//map zoom, drag behavior
function zoomEvent(e){
    if (map.getZoom() < zoom_cities){
            map.removeLayer(group_test.city_group);
            counties.addTo(map);
            if(!zoom_alert_added){
                $('.legend-table').append($zoom_alert); 
                zoom_alert_added=true;
                $zoom_alert.click(function(){
                    map.setZoom(zoom_points);
                });
            }

    }
    if (map.getZoom() > zoom_counties & map.getZoom() <= zoom_cities){
        map.removeLayer(group_test.point_group);
        map.removeLayer(near_layers);
        map.removeLayer(counties);
        map.addLayer(group_test.city_group);
        if(!zoom_alert_added){
            $('.legend-table').append($zoom_alert); zoom_alert_added=true;
            $zoom_alert.click(function(){
                map.setZoom(zoom_points);
            });
        }
    }
    if (map.getZoom() >= zoom_points){
        if(zoom_alert_added){$zoom_alert.remove(); zoom_alert_added=false;}
        map.removeLayer(counties);
        map.removeLayer(group_test.city_group);
        map.addLayer(group_test.point_group);
        map.addLayer(near_layers);
        getVisiblePoints(group_test.pointMap, map);
    }
}

function moveEvent(e){
    if (map.getZoom() >= zoom_points){
        getVisiblePoints(group_test.pointMap, map);
    }
}

function addZoomEvents() {
    map.on('zoomend', zoomEvent);
    map.on('move', moveEvent);
}
function removeZoomEvents(){
    map.off('zoomend', zoomEvent);
    map.off('move', moveEvent);
}

//opening dialog handling
var group_test;
$('#drug-dropbox').click(function(){
    group_test = new Group("static/json/esap_pharmacies.geojson", 'test');
    $('#opening-dialog').modal('hide');
    addZoomEvents();
    address_buffer = 16093.4;
    $('#info-modal-title').text("Needle Access and Disposal (NY State-wide):");
    $('#info-modal-body').html("Safe disposal of sharps is critically important to optimize health, safety and protection of the environment. The best way to ensure that people are protected from potential injury or disease transmission of blood borne diseases due to needle sticks is to follow established guidelines for the proper containment of “sharps” syringes, needles and lancets and other safer disposal practices. Use this website to find a needle disposal dropbox site or clean needle purchase location near you.<br><br>For more information on the Syringe Access and Disposal Programs, please visit the <a href='http://www2.erie.gov/health/index.php?q=needle-disposal-amp-access'>Erie County</a> (with information about medication disposal sites exclusive to Erie County) or the <a href='http://www.health.ny.gov/diseases/aids/consumers/prevention/needles_syringes/index.htm'>New York State Department of Health</a> online.");
});
$('#other-dropbox').click(function(){
    group_test = new Group("static/json/dropboxes.geojson", 'test');
    $('#opening-dialog').modal('hide');
    map.fitBounds(group_test.point_group);
    group_test.point_group.addTo(map);
    map.removeLayer(counties);
    removeZoomEvents();
    address_buffer = false;
    if(zoom_alert_added){$zoom_alert.remove(); zoom_alert_added=false;}
    $("#info-modal-title").text('Medication Disposal (currently only available at dropboxes in Erie County):')
    $('#info-modal-body').html("If not disposed of properly, prescription and over-the-counter medications pose a hazard to our environment and risk getting into the hands of children or others who may be unintentionally harmed by their use. Residents are encouraged to go through their medicine cabinets, closets, junk drawers, etc. and gather unused, expired and unwanted prescription and over-the-counter medications.  Use this website to find a site near you where medications can be disposed of free of charge with no questions asked.<br><br>For more information on the Syringe Access and Disposal Programs, please visit the <a href='http://www2.erie.gov/health/index.php?q=needle-disposal-amp-access'>Erie County</a> (with information about medication disposal sites exclusive to Erie County) or the <a href='http://www.health.ny.gov/diseases/aids/consumers/prevention/needles_syringes/index.htm'>New York State Department of Health</a> online.");
});


//create new layer group
function getVisiblePoints(points, thismap){
  var bounds = thismap.getBounds();
  for (point in points){
    if (!near_layers.hasLayer(points[point].latlng)){
        if (!bounds.contains(points[point].latlng)){
            map.removeLayer(points[point].layer);
        }
        else{
            map.addLayer(points[point].layer);
        }
    }
  }
}

//geocoding address
$('#address').submit(function () {
    codeAddress();
    $('#address-search-button').button("loading");
    return false;
});

/*map.on('layeradd', function(){
    $('.input-group-addon').html('<span class="glyphicon glyphicon-search"></span>');
});*/
function codeAddress() {
    nearest_sidebar.hide();
    var search_address = document.forms["address"]["address"].value
    var geocoder = new google.maps.Geocoder();
    if (address_marker != null){
        map.removeLayer(address_marker);
    }
    geocoder.geocode( {'address': search_address}, function(results, status) {
        $('#address-search-button').button("reset");
      if (status == google.maps.GeocoderStatus.OK) {
        var latlng = L.latLng(results[0].geometry.location.k, results[0].geometry.location.B)
        address_marker = L.marker(latlng, {zIndexOffset: 999});
        address_marker.setIcon(address_icon);
        map.addLayer(address_marker);
        address_marker.bindPopup("<td><strong>Your address:</strong><br>"+search_address);
        address_marker.openPopup();
        nearestPoints(address_marker, address_buffer, group_test);
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
}

//get closest points
var near_layers = L.layerGroup();
function nearestPoints(address_point, buffer, group){
    map.removeLayer(near_layers);
    near_layers = L.layerGroup();
    near_points = [];
    var o = address_point.getLatLng();
    map.panTo(o);
    for (var p in group_test.pointMap){
        var point = group_test.pointMap[p].layer;
        var d = point.getLatLng();
        var distance = d.distanceTo(o);
        var directions_url = "https://www.google.com/maps/dir/"+o.lat+","+o.lng+"/"+d.lat+","+d.lng;
        var feature = point.toGeoJSON();
        point.bindPopup("<td><strong>"+feature.properties.name+"</strong><br>"+feature.properties.address+" "+feature.properties.city+", NY "+feature.properties.zip+"<br><a href="+directions_url+" target='_blank'>get directions</a></td>");
        if (!buffer){
            near_points.push({"name": p, "point": point, "distance": distance, "directions_url": directions_url});
        }
        else if(distance <= buffer){
            near_points.push({"name": p, "point": point, "distance": distance, "directions_url": directions_url});
        }
    }
    near_points.sort(function (a, b) {
        if (a.distance > b.distance)
          return 1;
        if (a.distance < b.distance)
          return -1;
        // a must be equal to b
        return 0;
    });
    var tbody = document.createElement('tbody');
    if(near_points.length > 10){
        near_points = near_points.slice(0,10);
    }
    var near_points_bounds = null;
    near_points.forEach(function(element, index, array){
        if (near_points_bounds == null){
            near_points_bounds = L.latLngBounds([element.point.getLatLng(), address_point.getLatLng()]);
        }
        else{
            near_points_bounds.extend(element.point.getLatLng());
        }
        var line = L.polyline([element.point.getLatLng(), address_point.getLatLng()],{color:'grey', opacity:1, weight: 2});
        near_layers.addLayer(line);
        near_layers.addLayer(element.point);
        element.point.setZIndexOffset(999);
        
        //adds near points to nearest_sidebar
        var tr = document.createElement('tr');
        tr.setAttribute('id', element.name);
        tr.className = 'near-point-nearest_sidebar';
        var feature = element.point.toGeoJSON();
        var rank = index + 1;
        tr.innerHTML = "<td>"+rank+"</td><td><strong>"+feature.properties.name+"</strong><br>"+feature.properties.address+"<br>"+feature.properties.city+", NY "+feature.properties.zip+"<br><a href="+element.directions_url+" target='_blank'>get directions</a></td>";
        tr.onmouseover = function(e){
            p = e.target.parentElement.getAttribute('id');
            if (typeof group_test.pointMap[p] != 'undefined'){
                group.pointMap[p].layer.openPopup();
            }
        }
        tr.addEventListener('click', function(e){
            p = e.target.parentElement.getAttribute('id');
            if (typeof group_test.pointMap[p] != 'undefined'){
                if (!map.getBounds().contains(group_test.pointMap[p].latlng)){
                    map.panTo(address_marker.getLatLng());
                    group_test.pointMap[p].layer.openPopup();
                }
                else {
                    group_test.pointMap[p].layer.openPopup();
                }
            }
        });

        tbody.appendChild(tr);
    });
    map.addLayer(near_layers);
    map.fitBounds(near_points_bounds, {maxZoom: zoom_max});
    var near_points_div = document.createElement('div');
    near_points_div.className = "points-table";
    near_points_div.innerHTML = '<h4>Nearest dropoff locations</h4>'
    var table = document.createElement("table");
    table.className = "table table-hover";
    table.appendChild(tbody);
    near_points_div.appendChild(table);
    nearest_sidebar.addTo(map);
    $(".points-table").remove();
    $("#nearest_sidebar").append(near_points_div);
    nearest_sidebar.show();


}
}
