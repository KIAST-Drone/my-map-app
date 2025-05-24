// js/map-config.js

let map;
let drawingManager;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.5665, lng: 126.9780 },
    zoom: 12,
    mapTypeId: 'satellite',
    zoomControl: true,
  });

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    polylineOptions: {
      strokeColor: '#FF0000',
      strokeWeight: 5,
      clickable: true,
      editable: true,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 4,
          fillColor: '#FF0000',
          fillOpacity: 1,
          strokeWeight: 0
        },
        offset: '0%',
        repeat: '30px'
      }]
    },
    circleOptions: {
      strokeColor: '#800080',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#800080',
      fillOpacity: 0.35,
      clickable: false   // ★ 클릭 이벤트가 지도에 전달되도록
    },
    map: map
  });

  console.log('✅ 지도 초기화 완료');
}
