/** ========================================= **/
/** ================ imports ================ **/
/** ========================================= **/
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import Point from 'ol/geom/Point.js';
import View from 'ol/View.js';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';

import {
	boundingExtent, 
	getBottomLeft, 
	getTopRight,
	buffer,
	containsCoordinate,
	containsExtent,
} from 'ol/extent.js';

import { fromLonLat } from 'ol/proj';

import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from 'ol/style.js';

/** ========================================== **/
/** ================ declares ================ **/
/** ========================================== **/
// 슬라이더 값 가져오기
//const distanceInput = document.getElementById('distance');
//const minDistanceInput = document.getElementById('min-distance');
const distanceInput		= 200; // example range: 0-200
const minDistanceInput	= 120; // example range: 0-200; value < distanceInput

const skExtent = boundingExtent([
	fromLonLat([124.6133, 33.0041]), 
	fromLonLat([131.8661, 38.6127]), 
]);

/* ================ generate coordinates ================ */
var skBottomLeft = getBottomLeft(skExtent);
var skTopRight   = getTopRight(skExtent);

console.log('skExtent     : ' + skExtent);
console.log('skBottomLeft : ' + skBottomLeft);
console.log('skTopRight   : ' + skTopRight);

// TODO : replace with DB call
// generate 300k points across South Korea
//const pointCount = 248930; // test with 30k points
const pointCount = 300000; // test with 30k points
var skFeatures = new Array(pointCount);
//const skCoordinates = new Array(pointCount);

for (let i = 0; i < pointCount; ++i) {
	var randomPoint = skBottomLeft.map(function(val, index) {
		return val + Math.random() * (skTopRight[index] - val);
	});
	var randomFeature = new Feature(new Point(randomPoint));
	skFeatures[i] = randomFeature;
	//skCoordinates[i] = randomPoint;
}

// 벡터 변수 셍성
var vectorSource = new VectorSource({
  features: skFeatures,
});	

skFeatures.length = 0;
console.log('DELETEDE');

// 클라스트링 데이터 셋
var clusterSource = new Cluster({
  distance: distanceInput,
  minDistance: minDistanceInput,
  source: vectorSource,
});

console.log('randomly generated features : ');
console.log(vectorSource.getFeatures());

/** ============ cached style ============ **/
/* 
const styleCache = {};	// 클라스트링 style
function clusterStyle(feature) {
    const size = feature.get('features').length;
    let style = styleCache[size];
    if (!style) {
      style = new Style({
        image: new CircleStyle({
          radius: 10 + 50 * size / 100000,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#DD5555',
          }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
      styleCache[size] = style;
    }
    return style;
  }
 */
 
/** ============ realtime style ============ **/
function clusterStyle(feature) {
    const size = feature.get('features').length;
    let style;
	if(size > 0) {
		style = new Style({
		  image: new CircleStyle({
			radius: 10 + 50 * size / 100000,
			stroke: new Stroke({
			  color: '#fff',
			}),
			fill: new Fill({
			  color: '#DD5555',
			}),
		  }),
		  text: new Text({
			text: size.toString(),
			fill: new Fill({
			  color: '#fff',
			}),
		  }),
		});
	} else {
		
	}
    return style;
  }

const clusters = new VectorLayer({
  source: clusterSource,
  style: clusterStyle,
});

const raster = new TileLayer({
  source: new OSM(),
});

// TODO : center on Seoul / current location
const map = new Map({
  target: 'map-container',
  layers: [raster, clusters],
  view: new View({
    center: fromLonLat([126.9918, 37.5519]),
	minZoom: 9,
	maxZoom: 16,
    zoom: 12,
    extent: skExtent,
    //showFullExtent: true,
  }),
});

// TODO : free memory at moveend as well(?)
if (skFeatures.length > 0) {
	skFeatures.length = 0;
	console.log('DEBUG:: skFeatures emptied')
}

/** =========================================== **/
/** ================ listeners ================ **/
/** =========================================== **/

/*
distanceInput.addEventListener('input', function () {
  clusterSource.setDistance(parseInt(distanceInput.value, 10));
});

minDistanceInput.addEventListener('input', function () {
  clusterSource.setMinDistance(parseInt(minDistanceInput.value, 10));
});
 */

// map interactive
map.on('click', (e) => {
  clusters.getFeatures(e.pixel).then((clickedFeatures) => {
    if (clickedFeatures.length) {
      // Get clustered Coordinates
      const features = clickedFeatures[0].get('features');
      if (features.length > 1) {
        const extent = boundingExtent(
          features.map((r) => r.getGeometry().getCoordinates())
        );
        map.getView().fit(extent, {duration: 1000, padding: [50, 50, 50, 50]});
      }
    }
  });
});

map.on('pointerdrag', (e) => {
	// map.removeLayer(raster);
	map.removeLayer(clusters);
	clusters.setVisible(false);
});

/* 
map.on('moveend', (e) => {
	console.log('============ [ moveend starts ] ============');	
	setTimeout(function() {
		var extentView = map.getView().calculateExtent(map.getSize());
		var extentViewOuter = buffer(extentView, distanceInput * 1.2);
		
		// get data (ajax call to DB API); or use geoserver?
		// get coordinates in DB within extentViewOuter
		//  => a LOT of DB call on every moveend+500ms
		// use generated data for now (features)
		
		var extentViewOuterFeatures = vectorSource.getFeaturesInExtent(extentViewOuter);
		var vectorSourceView = new VectorSource({
			features: extentViewOuterFeatures,
		});	
		
		// replace cluster's source with new data 
		// (new data contains only features in viewport)
		clusterSource.setSource(vectorSourceView);
		
		console.log('extentView         : ' + extentView);
		console.log('extentViewOuter    : ' + extentViewOuter);
		
		console.log("Viewport's cluster : " + clusters.getSource().getFeatures().length);
		console.log("Viewport's feature : " + extentViewOuterFeatures.length);

		// DEBUG : check cluster and source features
		// var clusterFeatures = [];
		// clusters.getSource().getFeatures().forEach(clusterFeature => {
			// if (clusterFeature.getProperties().features.length > 1) {
				// clusterFeatures.push(clusterFeature);
				// console.log('PUSHED clusterFeature : ' + clusterFeature.getProperties().features.length);
				// // console.log(clusterFeature);
			// } else {
				// clusterFeatures.push(clusterFeature);
				// console.log('PUSHED feature : ' + clusterFeature.getProperties().features.length);
				// // console.log(clusterFeature);
			// }
		// });
		
		// TRY: clear vectorSource -> what will happen?
		// vectorSource.clear();
		// console.log("vectorSource's feature : " + vectorSource.getFeatures().length);
		clusters.setVisible(true);
		console.log('DEBUG:: clusters layer setVisible(true)');
		console.log('############################################');
	}, 1000);
});
 */
/* memory mismanagement detected 
   => RAM consumption increases as more map move triggered
 */
/** ================ Promise method ================ **/

let moveEndTimer;

map.on('moveend', (e) => {
	if(moveEndTimer) clearTimeout(moveEndTimer);
	
	//moveEndTimer = setTimeout(function() {
		handleMoveEnd().then(() => {
			// map.addLayer(raster);
			map.addLayer(clusters);
			clusters.setVisible(true);
			console.log('############ [ moveend ends ] ############');
		}).catch((error) => {
			console.error('Error handling needed: ', error);
		})
	//}, 500);
});

function handleMoveEnd(){
	return new Promise((resolve, reject) => {
		// moveend after code
		console.log('============ [ moveend starts ] ============');
		var extentView = map.getView().calculateExtent(map.getSize());
		var extentViewOuter = buffer(extentView, distanceInput * 1.2);
		
		// get data (ajax call to DB API); or use geoserver?
		// get coordinates in DB within extentViewOuter
		//  => a LOT of DB call on every moveend+500ms
		// use generated data for now (features)
		
		var extentViewOuterFeatures = vectorSource.getFeaturesInExtent(extentViewOuter);
		var vectorSourceView = new VectorSource({
			features: extentViewOuterFeatures,
		});	
		
		// replace cluster's source with new data 
		// (new data contains only features in viewport)
		//clusterSource.getSource().clear();
		clusterSource.setSource(null);
		clusterSource.setSource(vectorSourceView);
		
		console.log('extentView         : ' + extentView);
		console.log('extentViewOuter    : ' + extentViewOuter);
		
		console.log("Viewport's cluster : " + clusters.getSource().getFeatures().length);
		console.log("Viewport's feature : " + extentViewOuterFeatures.length);

		// DEBUG : check cluster and source features
		// var clusterFeatures = [];
		// clusters.getSource().getFeatures().forEach(clusterFeature => {
			// if (clusterFeature.getProperties().features.length > 1) {
				// clusterFeatures.push(clusterFeature);
				// console.log('PUSHED clusterFeature : ' + clusterFeature.getProperties().features.length);
				// // console.log(clusterFeature);
			// } else {
				// clusterFeatures.push(clusterFeature);
				// console.log('PUSHED feature : ' + clusterFeature.getProperties().features.length);
				// // console.log(clusterFeature);
			// }
		// });
		
		// TRY: clear vectorSource -> what will happen?
		// vectorSource.clear();
		// console.log("vectorSource's feature : " + vectorSource.getFeatures().length);
		
		console.log('DEBUG:: clusters layer setVisible(true)');
		console.log('############################################');
		resolve();
	});
}
